"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/store/useCartStore";
import PincodeChecker from "@/components/PincodeChecker";

// Product names in the DB may carry an SEO suffix after a "|" (e.g. "Name | Classic Portrait Poster").
// Strip it for on-page display; metadata still uses the full name.
function displayName(name?: string | null): string {
  return (name || "").split("|")[0].trim();
}

interface Product {
  id: string;
  name: string;
  description?: string;
  base_price: number;
  status: string;
  image_url?: string;
  mockup_urls?: string[];
  category: string;
  created_at: string;
  is_bundle?: boolean;
  variants?: any[] | null;
  // Flat content columns
  short_hook?: string | null;
  product_story?: string | null;
  highlights?: string[] | null;
  seo_title?: string | null;
  meta_description?: string | null;
  url_slug?: string | null;
  focus_keyword?: string | null;
  image_alt_text?: string | null;
  media_roles?: Record<string, string> | null;
  hero_headline?: string | null;
  subheadline?: string | null;
  default_size?: string | null;
  value_points?: string[] | null;
  urgency_tag?: string | null;
  highlight_badge?: string | null;
  category_type?: string | null;
  parent_category?: string | null;
}

// Inline line items stored directly in bundle_items JSONB — no DB link
interface BundleLineItem {
  name: string;
  price: number;
  image_url: string | null;
  quantity: number;
  bundle_only?: boolean;
}

interface Props {
  product: Product;
  related: Product[];
  bundleItems?: BundleLineItem[];
  categoryRecord?: any;
}

// A slide can be a plain image OR a bundle item image with metadata
type Slide =
  | { type: "cover"; url: string }
  | { type: "item"; url: string; name: string; price: number; quantity: number; index: number };

function buildSlides(p: Product, items: BundleLineItem[]): Slide[] {
  const coverUrls: string[] = [
    ...(p.image_url ? [p.image_url] : []),
    ...(p.mockup_urls || []),
  ];
  const coverSlides: Slide[] = coverUrls.map((url) => ({ type: "cover", url }));

  if (!p.is_bundle || items.length === 0) return coverSlides;

  // Add slides for each item that has an image
  const itemSlides: Slide[] = items
    .filter((item) => item.image_url)
    .map((item, idx) => ({
      type: "item",
      url: item.image_url!,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      index: idx,
    }));

  // If no cover at all, show item slides first; otherwise cover first then items
  return coverSlides.length > 0
    ? [...coverSlides, ...itemSlides]
    : itemSlides;
}

export default function ProductDetailClient({ 
  product, 
  related, 
  bundleItems = [],
  categoryRecord 
}: Props) {
  const slides = buildSlides(product, bundleItems);
  // Keep a plain urls list for cart thumbnail (first cover or first item)
  const firstImageUrl = slides[0]?.url ?? "";

  // Sizes not currently stocked (kept in sync with admin ENABLE_A3PLUS).
  const isVisibleSize = (size: unknown) => !String(size).toUpperCase().includes("A3+");
  const visibleVariants = Array.isArray(product.variants)
    ? product.variants.filter((v: any) => isVisibleSize(v.size))
    : [];

  const [activeImg, setActiveImg] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [floatingToast, setFloatingToast] = useState(false);
  const [buyingNow, setBuyingNow] = useState(false);
  const [selectedSize, setSelectedSize] = useState(() => {
    if (product.is_bundle && product.default_size) {
      return product.default_size;
    }
    if (visibleVariants.length > 0) {
      return visibleVariants[0].size;
    }
    return "A4";
  });
  const [selectedFinish, setSelectedFinish] = useState("Matte");
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);

  const isDecal = false;

  const isPoster = (() => {
    // If it's a decal, it's definitely not a poster
    if (isDecal) return false;

    // 1. Check direct product columns (from the new "critical" schema)
    if (product.category_type === 'poster') return true;
    if (product.parent_category?.toLowerCase().includes("poster")) return true;

    // 2. Check category record type
    if (categoryRecord?.category_type === 'poster') return true;
    if (categoryRecord?.parent?.category_type === 'poster') return true;

    // 3. Fallback to string matching
    const catName = (categoryRecord?.name || product.category || "").toLowerCase();
    const prodName = (product.name || "").toLowerCase();
    if (catName.includes("poster") || catName.includes("series")) return true;
    if (prodName.includes("poster")) return true;

    return false;
  })();
  
  const posterBadges = [
    { icon: "🖼️", label: "Photo-Quality", sub: "Premium photo paper" },
    { icon: "🎨", label: "Vivid Color", sub: "6-color photo printing" },
    { icon: "📌", label: "Peel & Stick", sub: "Adhesive backing" },
    { icon: "📦", label: "Ships Protected", sub: "Secure flat packaging" },
  ];
  const trustBadges = posterBadges;

  let currentPrice = Number(product.base_price);
  if (Array.isArray(product.variants)) {
    const variant = product.variants.find((v: any) => v.size === selectedSize);
    if (variant) {
      if (variant.frameless_price !== undefined && variant.frameless_price !== null) {
        currentPrice = Number(variant.frameless_price);
      } else if (variant.price !== undefined && variant.price !== null) {
        currentPrice = Number(variant.price);
      }
    }
  }

  // Swipe tracking
  const touchStartX = useRef<number | null>(null);
  const cartBtnRef = useRef<HTMLButtonElement>(null);

  const { addItem, setBuyNowItem } = useCartStore();
  const router = useRouter();

  function prev() {
    setActiveImg((i) => (i === 0 ? slides.length - 1 : i - 1));
  }
  function next() {
    setActiveImg((i) => (i === slides.length - 1 ? 0 : i + 1));
  }

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const delta = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(delta) > 40) {
      delta > 0 ? next() : prev();
    }
    touchStartX.current = null;
  }

  function handleAddToCart() {
    const itemId = (isPoster || isDecal)
      ? `${product.id}-${selectedSize.replace(/\s+/g, '')}${isPoster ? `-${selectedFinish}` : ''}` 
      : product.id;

    addItem({
      id: itemId,
      productId: product.id,
      name: product.name,
      price: currentPrice,
      quantity,
      image_url: firstImageUrl,
      ...((isPoster || isDecal) ? { size: selectedSize } : {}),
      ...(isPoster ? { finish: selectedFinish } : {}),
    });
    router.push("/cart");
  }

  function handleBuyNow() {
    setBuyingNow(true);
    const itemId = (isPoster || isDecal)
      ? `${product.id}-${selectedSize.replace(/\s+/g, '')}${isPoster ? `-${selectedFinish}` : ''}` 
      : product.id;

    setBuyNowItem({
      id: itemId,
      productId: product.id,
      name: product.name,
      price: currentPrice,
      quantity,
      image_url: firstImageUrl,
      ...((isPoster || isDecal) ? { size: selectedSize } : {}),
      ...(isPoster ? { finish: selectedFinish } : {}),
    });
    router.push("/checkout?buyNow=true");
  }

  const activeSlide = slides[activeImg];

  return (
    <main className="min-h-screen bg-[var(--color-surface)] pt-28 pb-24 px-5 sm:px-8">
      <div className="mx-auto max-w-[1300px]">

        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--color-secondary)]">
          <Link href="/shop" className="hover:text-[var(--color-primary)] transition-colors">
            Shop
          </Link>
          <span>/</span>
          <span className="text-[var(--color-on-surface)] truncate max-w-[200px]">{displayName(product.name)}</span>
        </nav>

        {/* ─── PRODUCT GRID ──────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-10 xl:gap-16 items-start">

          {/* ── IMAGE SLIDESHOW ──────────────────────────────── */}
          <div className="flex flex-col gap-3">
            {/* Main slide */}
            <div
              className="relative overflow-hidden rounded-[1.5rem] border border-[var(--color-outline-variant)]/40 bg-[var(--color-surface-container-lowest)] aspect-square select-none"
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
            >
              {slides.length > 0 ? (
                <img
                  key={activeImg}
                  src={activeSlide.url}
                  alt={activeSlide.type === "item" ? activeSlide.name : product.name}
                  className="h-full w-full object-contain bg-[#0e0e10] transition-transform duration-300"
                  style={{ animation: "fadeIn 0.25s ease" }}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <span className="material-symbols-outlined text-[64px] opacity-10">inventory_2</span>
                </div>
              )}

              {/* Top-left badge */}
              <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
                {product.is_bundle ? (
                  /* Bundle pill */
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ccff00] px-3 py-1 text-[9px] font-black uppercase tracking-[0.25em] text-[#121212] shadow-sm">
                    <span className="material-symbols-outlined text-[11px]">inventory</span>
                    Bundle
                  </span>
                ) : (
                  <span className="rounded-full bg-white/90 px-3 py-1 text-[9px] font-black uppercase tracking-[0.25em] text-black shadow-sm">
                    {product.category}
                  </span>
                )}
              </div>

              {/* Item overlay removed per request */}

              {/* Desktop arrows */}
              {slides.length > 1 && (
                <>
                  <button
                    onClick={prev}
                    aria-label="Previous image"
                    className="absolute left-3 top-1/2 -translate-y-1/2 z-20 hidden sm:flex h-10 w-10 items-center justify-center rounded-full bg-white/85 shadow-md backdrop-blur-sm transition-all hover:bg-white hover:scale-105 active:scale-95"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path d="M10 3L5 8L10 13" stroke="#111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  <button
                    onClick={next}
                    aria-label="Next image"
                    className="absolute right-3 top-1/2 -translate-y-1/2 z-20 hidden sm:flex h-10 w-10 items-center justify-center rounded-full bg-white/85 shadow-md backdrop-blur-sm transition-all hover:bg-white hover:scale-105 active:scale-95"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path d="M6 3L11 8L6 13" stroke="#111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>

                  {/* Dot indicators (mobile) */}
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5 sm:hidden z-10">
                    {slides.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveImg(i)}
                        aria-label={`Go to image ${i + 1}`}
                        className={`h-1.5 rounded-full transition-all duration-200 ${
                          i === activeImg
                            ? "w-5 " + (slides[i].type === "item" ? "bg-[#ccff00]" : "bg-white")
                            : "w-1.5 bg-white/50"
                        }`}
                      />
                    ))}
                  </div>

                  {/* Counter (desktop) */}
                  <div className="absolute bottom-4 right-4 hidden sm:block z-10">
                    <span className="rounded-full bg-black/50 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-sm">
                      {activeImg + 1} / {slides.length}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Thumbnails (desktop) */}
            {slides.length > 1 && (
              <div className="hidden sm:flex gap-2 overflow-x-auto pb-1">
                {slides.map((slide, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImg(i)}
                    aria-label={slide.type === "item" ? slide.name : `View image ${i + 1}`}
                    className={`relative flex-shrink-0 h-16 w-16 overflow-hidden rounded-xl border-2 transition-all duration-200 ${
                      activeImg === i
                        ? slide.type === "item"
                          ? "border-[#ccff00] opacity-100"
                          : "border-[var(--color-primary-container)] opacity-100"
                        : "border-transparent opacity-50 hover:opacity-80"
                    }`}
                  >
                    <img src={slide.url} alt="" className="h-full w-full object-cover" />
                    {/* Item labels removed per request */}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── INFO COLUMN ──────────────────────────────────── */}
          <div className="flex flex-col gap-7 lg:sticky lg:top-28">

            {/* Name + Price */}
            <div>
              {product.is_bundle && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-primary-container)]/15 px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-[var(--color-primary)] mb-3">
                  <span className="material-symbols-outlined text-[12px]">inventory</span>
                  Bundle Deal
                </span>
              )}
              {product.highlight_badge && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-primary-container)] px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-[var(--color-on-background)] mb-3 ml-2 border border-[var(--color-outline-variant)]/20">
                  <span className="material-symbols-outlined text-[12px]">grade</span>
                  {product.highlight_badge}
                </span>
              )}
              {product.is_bundle && product.urgency_tag && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-red-600 mb-3 ml-2">
                  <span className="material-symbols-outlined text-[12px]">bolt</span>
                  {product.urgency_tag}
                </span>
              )}
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--color-secondary)] mb-2">
                {product.is_bundle ? `${bundleItems.length} item${bundleItems.length !== 1 ? "s" : ""} included` : product.category}
              </p>
              <h1 className="text-[clamp(1.5rem,3.5vw,2.5rem)] font-black uppercase leading-[0.95] tracking-[-0.04em] text-[var(--color-on-surface)]">
                {product.is_bundle && product.hero_headline ? product.hero_headline : displayName(product.name)}
              </h1>
              {product.is_bundle && bundleItems.length > 0 ? (() => {
                const retailTotal = bundleItems.reduce((s, item) => s + Number(item.price) * item.quantity, 0);
                const savings = retailTotal - currentPrice;
                return (
                  <div className="mt-4 flex flex-wrap items-baseline gap-3">
                    <p className="text-3xl font-black tracking-tight text-[var(--color-on-surface)]">
                      From ₹{currentPrice.toFixed(0)}
                    </p>
                    {savings > 0 && (
                      <>
                        <p className="text-base text-[var(--color-secondary)] line-through">
                          ₹{retailTotal.toFixed(0)}
                        </p>
                        <span className="rounded-full bg-green-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.15em] text-green-700">
                          Save ₹{savings.toFixed(0)}
                        </span>
                      </>
                    )}
                  </div>
                );
              })() : (
                <p className="mt-4 text-3xl font-black tracking-tight text-[var(--color-on-surface)]">
                  From ₹{currentPrice.toFixed(0)}
                </p>
              )}
            </div>

            {/* Short Hook / Subheadline */}
            {(product.subheadline || product.short_hook) && (
              <p className="text-sm md:text-base font-medium leading-relaxed tracking-wide text-[var(--color-secondary)] italic mt-2">
                &ldquo;{product.subheadline || product.short_hook}&rdquo;
              </p>
            )}

            {/* ── PURCHASE MODULE CARD ──────────────────────────── */}
            <div className="p-6 rounded-[1.5rem] border border-[var(--color-outline-variant)]/30 bg-[var(--color-surface-container-lowest)]/40 backdrop-blur-sm flex flex-col gap-6 shadow-[0_8px_30px_rgba(0,0,0,0.03)]">
              
              {/* Sizing Selector */}
              {(isPoster || isDecal) && visibleVariants.length > 0 && (
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--color-secondary)] block">
                    {isPoster ? "Select Poster Size" : "Select Decal Size"}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {visibleVariants.map((variant: any) => (
                      <button
                        key={variant.size}
                        type="button"
                        onClick={() => setSelectedSize(variant.size)}
                        className={`py-3 rounded-xl border text-[11px] font-black uppercase tracking-[0.15em] transition-all duration-300 ${
                          selectedSize === variant.size
                            ? "bg-[var(--color-primary-container)] text-[var(--color-on-background)] border-[var(--color-primary-container)] shadow-lg shadow-[var(--color-primary-container)]/20"
                            : "bg-[var(--color-surface-container-low)] border-[var(--color-outline-variant)]/20 text-[var(--color-on-surface)] hover:border-[var(--color-primary-container)]/40"
                        }`}
                      >
                        {variant.size}
                      </button>
                    ))}
                  </div>
                  {isPoster && (
                    <button 
                      type="button"
                      onClick={() => setIsSizeGuideOpen(true)}
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-[var(--color-primary)] hover:underline tracking-wide mt-1 transition-all"
                    >
                      Need help choosing a size? View Size Guide →
                    </button>
                  )}
                </div>
              )}

              {/* Finish Selector */}
              {isPoster && (
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--color-secondary)] block">
                    Select Finish
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {["Matte", "Glossy"].map((finish) => (
                      <button
                        key={finish}
                        type="button"
                        onClick={() => setSelectedFinish(finish)}
                        className={`py-3 rounded-xl border text-[11px] font-black uppercase tracking-[0.15em] transition-all duration-300 ${
                          selectedFinish === finish
                            ? "bg-[var(--color-primary-container)] text-[var(--color-on-background)] border-[var(--color-primary-container)] shadow-lg shadow-[var(--color-primary-container)]/20"
                            : "bg-[var(--color-surface-container-low)] border-[var(--color-outline-variant)]/20 text-[var(--color-on-surface)] hover:border-[var(--color-primary-container)]/40"
                        }`}
                      >
                        {finish}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity Selector */}
              <div>
                <label className="text-[9px] font-black uppercase tracking-[0.3em] text-[var(--color-secondary)] mb-3 block">
                  Quantity
                </label>
                <div className="flex items-center w-fit rounded-xl overflow-hidden border border-[var(--color-outline-variant)]/60 bg-[var(--color-surface)]/50">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-11 h-11 flex items-center justify-center text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-high)] transition-colors font-bold text-lg"
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  <span className="w-12 h-11 flex items-center justify-center text-sm font-black text-[var(--color-on-surface)] border-x border-[var(--color-outline-variant)]/60">
                    {String(quantity).padStart(2, "0")}
                  </span>
                  <button
                    onClick={() => setQuantity((q) => q + 1)}
                    className="w-11 h-11 flex items-center justify-center text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-high)] transition-colors font-bold text-lg"
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Trust Block - Moved above CTAs per request */}
              <div className="flex flex-col gap-2 text-[11px] font-bold text-[var(--color-secondary)] tracking-[0.05em] bg-[var(--color-surface-container-high)]/30 px-4 py-3 rounded-xl border border-[var(--color-outline-variant)]/20 mt-1">
                <div className="flex items-center gap-2">
                  <span className="text-[#ccff00] font-bold text-sm">✓</span>
                  <span>Ships in 2–3 business days</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#ccff00] font-bold text-sm">✓</span>
                  <span>Secure protective packaging</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#ccff00] font-bold text-sm">✓</span>
                  <span>Frame-ready print</span>
                </div>
              </div>

              {/* Pincode Checker */}
              <PincodeChecker />

              {/* CTA Buttons */}
              <div className="flex flex-col gap-3 md:gap-3 md:static fixed bottom-0 left-0 right-0 md:bg-transparent bg-[#111]/95 md:p-0 p-4 md:flex-col flex-row md:border-0 border-t border-[#222] backdrop-blur-md z-[100] md:z-auto animate-in slide-in-from-bottom duration-300">
                {/* Buy Now (Primary Visual CTA) */}
                <button
                  id="buy-now-btn"
                  onClick={handleBuyNow}
                  disabled={buyingNow}
                  className="flex-1 md:flex-initial w-full py-4 rounded-xl font-black uppercase tracking-[0.18em] text-xs sm:text-sm transition-all duration-300 bg-[var(--color-primary-container)] text-[var(--color-on-background)] hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(204,255,0,0.35)] active:scale-[0.97] disabled:opacity-60 flex items-center justify-center gap-2 order-1"
                >
                  <span className="material-symbols-outlined text-[18px]">bolt</span>
                  {buyingNow ? "Redirecting…" : "Buy Now"}
                </button>

                {/* Add to Cart (Secondary Visual CTA) */}
                <div className="relative flex-1 md:flex-initial order-2">
                  <button
                    id="add-to-cart-btn"
                    ref={cartBtnRef}
                    onClick={handleAddToCart}
                    className="w-full py-4 rounded-xl font-black uppercase tracking-[0.18em] text-xs sm:text-sm transition-all duration-300 bg-transparent border border-[var(--color-outline-variant)] text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-high)]/50 hover:-translate-y-0.5 active:scale-[0.97]"
                  >
                    <span className="flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-[18px]">shopping_cart</span>
                      Add to Cart
                    </span>
                  </button>

                  {/* Floating toast animation */}
                  {floatingToast && (
                    <div
                      key={Date.now()}
                      className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-3 z-50"
                      style={{ animation: "floatUp 1.8s ease-out forwards" }}
                    >
                      <div className="flex items-center gap-2 bg-[#ccff00] text-[#111] px-4 py-2 rounded-full shadow-xl font-black text-xs uppercase tracking-[0.15em] whitespace-nowrap">
                        <span className="text-base">✓</span>
                        Added to Cart!
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>

            <div className="border-t border-[var(--color-outline-variant)]/40 my-2" />

            {/* Accordions for Story / Highlights / Shipping - ALL CLOSED BY DEFAULT */}
            <div className="space-y-3">
              {/* Product Story Accordion */}
              {product.product_story && (
                <details className="group border-b border-[var(--color-outline-variant)]/30 pb-3">
                  <summary className="flex justify-between items-center font-black text-xs uppercase tracking-[0.2em] text-[var(--color-on-surface)] cursor-pointer select-none">
                    <span>Product Story</span>
                    <span className="material-symbols-outlined transition-transform duration-300 group-open:rotate-180">expand_more</span>
                  </summary>
                  <div className="mt-3 text-sm leading-relaxed text-[var(--color-secondary)] whitespace-pre-line font-medium">
                    {product.product_story}
                  </div>
                </details>
              )}

              {/* Highlights Accordion */}
              {(product.highlights || (product.is_bundle && product.value_points)) && (
                <details className="group border-b border-[var(--color-outline-variant)]/30 pb-3">
                  <summary className="flex justify-between items-center font-black text-xs uppercase tracking-[0.2em] text-[var(--color-on-surface)] cursor-pointer select-none">
                    <span>Key Highlights</span>
                    <span className="material-symbols-outlined transition-transform duration-300 group-open:rotate-180">expand_more</span>
                  </summary>
                  <div className="mt-3">
                    <ul className="list-disc list-inside text-xs text-[var(--color-secondary)] space-y-1.5">
                      {product.is_bundle && product.value_points && product.value_points.length > 0 
                        ? product.value_points.map((h: string, i: number) => (
                            <li key={i} className="leading-relaxed">{h}</li>
                          ))
                        : product.highlights?.map((h: string, i: number) => (
                            <li key={i} className="leading-relaxed">{h}</li>
                          ))
                      }
                    </ul>
                  </div>
                </details>
              )}

              {/* Shipping & Handling Accordion */}
              <details className="group border-b border-[var(--color-outline-variant)]/30 pb-3">
                <summary className="flex justify-between items-center font-black text-xs uppercase tracking-[0.2em] text-[var(--color-on-surface)] cursor-pointer select-none">
                  <span>Shipping & Handling</span>
                  <span className="material-symbols-outlined transition-transform duration-300 group-open:rotate-180">expand_more</span>
                </summary>
                <div className="mt-3 text-xs leading-relaxed text-[var(--color-secondary)] space-y-2 font-medium">
                  <p>Every poster is printed fresh for your order and packaged securely to protect it in transit.</p>
                  <p>Standard shipping is free across India. Delivery takes 5-7 business days depending on location.</p>
                  {isPoster && (
                    <p>Posters come with an adhesive backing — just peel and stick, no frame or tools needed.</p>
                  )}
                </div>
              </details>
            </div>

            {/* Trust Badges - 3 badges */}
            <div className="grid grid-cols-3 gap-2 mt-3">
              {[
                { icon: "🖼️", label: "Photo-Quality", sub: "Premium photo paper" },
                { icon: "🎨", label: "Vivid Color", sub: "6-color photo printing" },
                { icon: "📌", label: "Peel & Stick", sub: "Adhesive backing" }
              ].map((b) => (
                <div
                  key={b.label}
                  className="rounded-xl border border-[var(--color-outline-variant)]/40 bg-white/60 p-3 text-center flex flex-col items-center justify-center"
                >
                  <p className="text-xl mb-1">{b.icon}</p>
                  <p className="text-[8px] font-black uppercase tracking-[0.12em] text-[var(--color-on-surface)] leading-tight">
                    {b.label}
                  </p>
                  <p className="text-[7px] text-[var(--color-secondary)] mt-0.5 leading-tight">{b.sub}</p>
                </div>
              ))}
            </div>

          </div>
        </div>

        {/* Story relocated above for stronger storytelling layout */}

        {/* ─── BUNDLE CONTENTS SECTION ───────────────────────── */}
        {product.is_bundle && bundleItems.length > 0 && bundleItems.some((item: any) => !item.bundle_only) && (
          <section className="mt-14 pt-10 border-t border-[var(--color-outline-variant)]/30">
            <div className="mb-6">
              <p className="text-[9px] font-black uppercase tracking-[0.35em] text-[var(--color-primary)] mb-1">
                What&apos;s Inside
              </p>
              <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-[var(--color-on-surface)]">
                Included in this Bundle
              </h2>
            </div>
            {/* Horizontal scroll on mobile, grid on sm+ */}
            <div className="flex gap-4 overflow-x-auto pb-6 sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-3 xl:grid-cols-4 snap-x snap-mandatory sm:snap-none -mx-5 px-5 sm:mx-0 sm:px-0">
              {bundleItems.map((item, idx) => (
                <div
                  key={idx}
                  className="flex-shrink-0 w-56 sm:w-auto flex flex-col overflow-hidden rounded-[2rem] border border-[var(--color-outline-variant)]/30 bg-[var(--color-surface-container-lowest)] shadow-[0_8px_30px_rgba(0,0,0,0.04)] snap-start sm:snap-none"
                >
                  {/* Item image */}
                  <div className="relative aspect-[4/5] overflow-hidden bg-[var(--color-surface-container-low)]">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <span className="material-symbols-outlined text-[40px] opacity-10">inventory_2</span>
                      </div>
                    )}
                    {item.quantity > 1 && (
                      <span className="absolute top-3 right-3 rounded-full bg-[var(--color-primary)] px-2.5 py-1 text-[9px] font-black text-[var(--color-on-primary-fixed)] shadow-sm">
                        x{item.quantity}
                      </span>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-60" />
                  </div>
                  {/* Item info */}
                  <div className="p-4 flex flex-col gap-2">
                    <p className="text-sm font-black leading-tight tracking-tight text-[var(--color-on-surface)] line-clamp-2">
                      {item.name}
                    </p>
                    <span className="text-lg font-black text-[var(--color-primary)]">
                      ₹{Number(item.price).toFixed(0)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ─── CROSS-SELL SECTION ────────────────────────────── */}
        {!product.is_bundle && related.length > 0 && (
          <section className="mt-20 pt-10 border-t border-[var(--color-outline-variant)]/30">
            <div className="flex items-end justify-between mb-8">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.35em] text-[var(--color-primary)] mb-1">
                  You Might Also Like
                </p>
                <h2 className="text-2xl font-black uppercase tracking-[-0.03em] text-[var(--color-on-surface)]">
                  Related Products
                </h2>
              </div>
              <Link
                href="/shop"
                className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--color-secondary)] hover:text-[var(--color-primary)] transition-colors flex items-center gap-1.5"
              >
                View All
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path d="M2 6h8M7 3l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((rel) => {
                const img = rel.image_url || (rel.mockup_urls?.[0] ?? null);
                return (
                  <Link
                    key={rel.id}
                    href={`/posters/${rel.url_slug || rel.id}`}
                    className="group relative flex flex-col overflow-hidden rounded-[2rem] border border-[var(--color-outline-variant)]/30 bg-[var(--color-surface-container-lowest)] shadow-[0_12px_40px_rgba(0,0,0,0.04)] transition-all duration-500 hover:-translate-y-2 hover:border-[var(--color-primary)]/20 hover:shadow-[0_32px_64px_rgba(0,0,0,0.08)]"
                  >
                    {/* Image */}
                    <div className="relative aspect-[4/5] overflow-hidden bg-[var(--color-surface-container-low)]">
                      {img ? (
                        <img
                          src={img}
                          alt={rel.name}
                          className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <span className="text-[10px] font-black uppercase tracking-widest opacity-10">No Image</span>
                        </div>
                      )}
                      
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-60" />
                      
                      <div className="absolute bottom-4 left-4 right-4">
                        <p className="text-[8px] font-black uppercase tracking-[0.25em] text-[var(--color-primary)]">
                          {rel.category}
                        </p>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex flex-col flex-1 gap-3 p-4 sm:p-5 bg-[var(--color-surface-container-lowest)]">
                      <h3 className="text-sm font-black leading-tight tracking-tight text-[var(--color-on-surface)] group-hover:text-[var(--color-primary)] transition-colors line-clamp-1">
                        {displayName(rel.name)}
                      </h3>
                      
                      <div className="mt-auto flex items-center justify-between pt-3 border-t border-[var(--color-outline-variant)]/20">
                        <span className="font-mono text-sm sm:text-lg font-black text-[var(--color-on-surface)]">
                          ₹{Number(rel.base_price).toFixed(0)}
                        </span>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" className="text-[var(--color-primary)] transition-transform duration-300 group-hover:translate-x-1">
                          <path d="M3 7H11M11 7L7.5 3.5M11 7L7.5 10.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Back link */}
        <div className="mt-12 pt-8 border-t border-[var(--color-outline-variant)]/30">
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 text-sm font-bold text-[var(--color-secondary)] hover:text-[var(--color-primary)] transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back to Shop
          </Link>
        </div>
        {/* Size Guide Modal */}
        {isSizeGuideOpen && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center px-4 sm:px-6">
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setIsSizeGuideOpen(false)}
            />
            
            {/* Content Card */}
            <div className="relative bg-[var(--color-surface)] border border-[var(--color-outline-variant)]/50 rounded-[2rem] max-w-3xl w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-[var(--color-outline-variant)]/30 flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--color-primary)] mb-1">Size Education</p>
                  <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-[var(--color-on-surface)]">Size Guide</h2>
                </div>
                <button 
                  onClick={() => setIsSizeGuideOpen(false)}
                  className="h-10 w-10 rounded-full border border-[var(--color-outline-variant)]/30 flex items-center justify-center text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-high)] transition-all"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="p-6 space-y-8 overflow-y-auto max-h-[70vh]">
                {/* Size comparison visualization */}
                <div className="rounded-xl bg-[#09090b] border border-[#222] p-6 select-none relative aspect-[16/9] flex items-center justify-center">
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:20px_20px]" />
                  
                  {/* Wall display baseline */}
                  <div className="absolute bottom-4 inset-x-12 h-10 bg-[#222]/40 rounded-md border border-[#333] backdrop-blur-sm flex items-center justify-center">
                    <span className="text-[8px] font-black text-white/30 uppercase tracking-[0.15em]">Standard Studio Wall Space</span>
                  </div>

                  <div className="absolute bottom-16 flex items-end justify-center gap-8 inset-x-0 px-8">
                    {/* A4 */}
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-14 border-2 border-[#ccff00] bg-[#111] flex items-center justify-center rounded shadow-lg shadow-[#ccff00]/5">
                        <span className="text-[7px] font-black text-[#ccff00]">A4</span>
                      </div>
                      <span className="text-[8px] font-bold text-white/50">8.3 × 11.7 in</span>
                    </div>
                    
                    {/* A3 */}
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-16 h-24 border-2 border-[#ccff00] bg-[#111] flex items-center justify-center rounded shadow-xl shadow-[#ccff00]/10">
                        <span className="text-[9px] font-black text-[#ccff00]">A3</span>
                      </div>
                      <span className="text-[8px] font-bold text-white/50">12 × 18 in</span>
                    </div>

                  </div>
                </div>

                {/* Usage guidance metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { size: "A4", usage: "Compact spaces", desc: "Ideal for narrow entryways, desktop setups, or grouped in multi-frame collage walls." },
                    { size: "A3", usage: "Balanced wall display", desc: "Excellent sweet spot for bedrooms, study corners, and everyday personal styling." },
                  ].map((item) => (
                    <div key={item.size} className="p-4 rounded-xl border border-[var(--color-outline-variant)]/30 bg-[var(--color-surface-container-low)]">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 text-[10px] font-black bg-[#ccff00] text-[#111] rounded">{item.size}</span>
                        <span className="text-xs font-black uppercase text-[var(--color-on-surface)]">{item.usage}</span>
                      </div>
                      <p className="text-[11px] text-[var(--color-secondary)] leading-relaxed">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
