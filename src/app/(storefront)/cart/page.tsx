"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCartStore } from "@/store/useCartStore";
import { supabase } from "@/lib/supabaseClient";
import { computeShipping, FREE_SHIPPING_THRESHOLD, amountToFreeShipping } from "@/lib/shipping";
import { unitPrice } from "@/lib/pricing";

export default function CartPage() {
  const items = useCartStore((s) => s.items);
  const addItem = useCartStore((s) => s.addItem);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const updateItem = useCartStore((s) => s.updateItem);
  const getSubtotal = useCartStore((s) => s.getSubtotal);

  // Avoid hydration mismatch — render nothing cart-specific until client mounts
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Cross-sell: a small pool of active products to suggest in the cart
  const [suggestionPool, setSuggestionPool] = useState<any[]>([]);
  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, base_price, image_url, is_bundle, category_type")
        .eq("status", "Active")
        .eq("bundle_only", false)
        .limit(12);
      if (active && data) setSuggestionPool(data);
    })();
    return () => {
      active = false;
    };
  }, []);

  // Variants for items currently in the cart, so size/finish can be edited inline.
  const [variantsByProduct, setVariantsByProduct] = useState<Record<string, any>>({});
  const productKey = [...new Set(items.map((i) => i.productId))].sort().join(",");
  useEffect(() => {
    const ids = productKey ? productKey.split(",") : [];
    if (ids.length === 0) {
      setVariantsByProduct({});
      return;
    }
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("products")
        .select("id, base_price, variants")
        .in("id", ids);
      if (active && data) {
        const map: Record<string, any> = {};
        data.forEach((p: any) => {
          map[p.id] = p;
        });
        setVariantsByProduct(map);
      }
    })();
    return () => {
      active = false;
    };
  }, [productKey]);

  const subtotal = mounted ? getSubtotal() : 0;
  const shipping = computeShipping(subtotal);
  const total = subtotal + shipping;
  const remainingForFreeShipping = amountToFreeShipping(subtotal);

  const cartProductIds = new Set(items.map((i) => i.productId));
  const suggestions = suggestionPool
    .filter((p) => !p.is_bundle && !cartProductIds.has(p.id))
    .slice(0, 4);

  // Quick-add a suggestion at its base (A4 / Matte) price — matches the product page's
  // default cart-id scheme so it merges if the same A4/Matte item is added again.
  function handleQuickAdd(p: any) {
    const isPoster = p.category_type === "poster" || !p.category_type;
    addItem({
      id: isPoster ? `${p.id}-A4-Matte` : p.id,
      productId: p.id,
      name: p.name,
      price: Number(p.base_price),
      quantity: 1,
      image_url: p.image_url || "",
      ...(isPoster ? { size: "A4", finish: "Matte" } : {}),
    });
  }

  function changeSize(item: any, newSize: string) {
    const product = variantsByProduct[item.productId];
    const price = product ? unitPrice(product, newSize) : item.price;
    updateItem(item.id, { size: newSize, price });
  }

  function changeFinish(item: any, newFinish: string) {
    updateItem(item.id, { finish: newFinish });
  }

  return (
    <main className="min-h-screen bg-[var(--color-surface)] pt-32 pb-24 px-5 sm:px-8">
      <div className="mx-auto max-w-[1440px]">
        
        {/* Breadcrumbs / Back button */}
        <div className="mb-12">
          <Link href="/shop" className="group inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-[var(--color-secondary)] hover:text-[var(--color-primary)] transition-colors">
            <span className="material-symbols-outlined text-[18px] group-hover:-translate-x-1 transition-transform">arrow_back</span>
            Back to shop
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-8 xl:gap-16 items-start">
          
          {/* Left Column: Cart Items */}
          <div className="space-y-12">
            <div>
              <h1 className="text-[clamp(2.5rem,8vw,4.5rem)] font-black uppercase tracking-[-0.05em] leading-[0.85] text-[var(--color-on-surface)]">
                Shopping<br /><span className="text-[var(--color-primary)]">Cart</span>
              </h1>
              {mounted && items.length > 0 && (
                <div className="mt-6 flex items-center gap-4">
                  <div className="h-[2px] w-12 bg-[var(--color-primary-container)]" />
                  <p className="text-[12px] font-black uppercase tracking-[0.25em] text-[var(--color-on-surface)]">
                    {items.reduce((t, i) => t + i.quantity, 0)} item{items.reduce((t, i) => t + i.quantity, 0) !== 1 ? "s" : ""} selected
                  </p>
                </div>
              )}
            </div>

            {/* Empty state */}
            {mounted && items.length === 0 && (
              <div className="bg-[var(--color-surface-container-lowest)] border border-[var(--color-outline-variant)]/30 rounded-[3rem] p-16 sm:p-24 text-center shadow-xl shadow-black/5">
                <div className="w-24 h-24 bg-[var(--color-surface-container-low)] rounded-full flex items-center justify-center mx-auto mb-8">
                  <span className="material-symbols-outlined text-[48px] text-[var(--color-outline-variant)]">shopping_basket</span>
                </div>
                <h2 className="text-3xl font-black uppercase tracking-tight text-[var(--color-on-surface)] mb-4">Your basket is empty</h2>
                <p className="text-base text-[var(--color-secondary)] mb-12 max-w-md mx-auto">Looks like you haven't added any designs to your cart yet. Let's find something perfect for you.</p>
                <Link
                  href="/shop"
                  className="inline-flex items-center gap-3 bg-[var(--color-on-background)] text-[var(--color-primary-container)] px-10 py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-xs hover:-translate-y-1 hover:shadow-2xl hover:shadow-[var(--color-primary-container)]/20 transition-all duration-500"
                >
                  Explore Collection
                  <span className="material-symbols-outlined text-[20px]">explore</span>
                </Link>
              </div>
            )}

            {/* Items list */}
            {mounted && items.length > 0 && (
              <div className="space-y-4">
                {items.map((item) => (
                  <div 
                    key={item.id} 
                    className="group relative flex gap-6 sm:gap-10 p-6 sm:p-8 rounded-[2.5rem] bg-[var(--color-surface-container-lowest)] border border-[var(--color-outline-variant)]/20 hover:border-[var(--color-primary-container)] transition-all duration-500 hover:shadow-2xl hover:shadow-black/[0.03]"
                  >
                    {/* Thumbnail */}
                    <div className="w-28 h-28 sm:w-40 sm:h-40 flex-shrink-0 overflow-hidden rounded-3xl bg-[var(--color-surface-container-low)] relative shadow-inner">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="material-symbols-outlined text-[48px] opacity-10">broken_image</span>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 flex flex-col py-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-auto">
                        <div className="min-w-0">
                          <span className="text-[9px] font-black uppercase tracking-[0.3em] text-[var(--color-primary)] mb-2 block">Premium Product</span>
                          <h3 className="text-xl sm:text-2xl font-black leading-tight tracking-tighter text-[var(--color-on-surface)] uppercase truncate">
                            {item.name}
                          </h3>
                          {item.size && (
                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                              <span className="text-[9px] font-black uppercase tracking-widest text-[var(--color-secondary)] mr-1">Size</span>
                              {(variantsByProduct[item.productId]?.variants?.length
                                ? variantsByProduct[item.productId].variants.filter((v: any) => !String(v.size).toUpperCase().includes("A3+"))
                                : [{ size: item.size }]
                              ).map((v: any) => (
                                <button
                                  key={v.size}
                                  type="button"
                                  onClick={() => changeSize(item, v.size)}
                                  className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider border transition-colors ${
                                    item.size === v.size
                                      ? "bg-[var(--color-primary-container)] text-[var(--color-on-background)] border-[var(--color-primary-container)]"
                                      : "border-[var(--color-outline-variant)]/30 text-[var(--color-on-surface)] hover:border-[var(--color-primary-container)]/50"
                                  }`}
                                >
                                  {v.size}
                                </button>
                              ))}
                            </div>
                          )}
                          {item.finish && (
                            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                              <span className="text-[9px] font-black uppercase tracking-widest text-[var(--color-secondary)] mr-1">Finish</span>
                              {["Matte", "Glossy"].map((f) => (
                                <button
                                  key={f}
                                  type="button"
                                  onClick={() => changeFinish(item, f)}
                                  className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider border transition-colors ${
                                    item.finish === f
                                      ? "bg-[var(--color-primary-container)] text-[var(--color-on-background)] border-[var(--color-primary-container)]"
                                      : "border-[var(--color-outline-variant)]/30 text-[var(--color-on-surface)] hover:border-[var(--color-primary-container)]/50"
                                  }`}
                                >
                                  {f}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--color-outline-variant)] hover:text-red-500 hover:bg-red-50 transition-all duration-300 shrink-0"
                          title="Remove item"
                        >
                          <span className="material-symbols-outlined text-[20px]">close</span>
                        </button>
                      </div>

                      <div className="flex flex-wrap items-end justify-between gap-6 mt-6">
                        {/* Quantity selector */}
                        <div className="inline-flex items-center bg-[var(--color-surface-container-low)] p-1 rounded-2xl border border-[var(--color-outline-variant)]/10">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="w-10 h-10 flex items-center justify-center text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-high)] rounded-xl transition-all font-black text-xl"
                          >
                            −
                          </button>
                          <span className="min-w-[40px] text-center text-sm font-black text-[var(--color-on-surface)]">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="w-10 h-10 flex items-center justify-center text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-high)] rounded-xl transition-all font-black text-xl"
                          >
                            +
                          </button>
                        </div>

                        <div className="text-right">
                          <p className="text-[10px] font-bold text-[var(--color-secondary)] uppercase tracking-widest mb-1">Total Price</p>
                          <p className="text-2xl font-black text-[var(--color-on-surface)] tracking-tighter">
                            ₹{(Number(item.price) * item.quantity).toFixed(0)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Cross-sell: Complete your wall */}
            {mounted && items.length > 0 && suggestions.length > 0 && (
              <div className="pt-4">
                <div className="flex flex-col items-start gap-2 mb-6 sm:flex-row sm:items-center sm:gap-4">
                  <h2 className="text-sm font-black uppercase tracking-[0.2em] text-[var(--color-on-surface)] whitespace-nowrap">Complete your wall</h2>
                  <div className="hidden sm:block h-px flex-1 bg-[var(--color-outline-variant)]/30" />
                  {remainingForFreeShipping > 0 && (
                    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-primary)]">
                      Add ₹{remainingForFreeShipping} more → FREE shipping
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {suggestions.map((p) => (
                    <div
                      key={p.id}
                      className="group rounded-3xl bg-[var(--color-surface-container-lowest)] border border-[var(--color-outline-variant)]/20 hover:border-[var(--color-primary-container)] overflow-hidden transition-all duration-500 hover:shadow-xl hover:shadow-black/[0.04]"
                    >
                      <Link href={`/products/${p.id}`} className="block aspect-square overflow-hidden bg-[var(--color-surface-container-low)]">
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="material-symbols-outlined text-[32px] opacity-10">image</span>
                          </div>
                        )}
                      </Link>
                      <div className="p-4">
                        <Link href={`/products/${p.id}`} className="block">
                          <h3 className="text-xs font-black uppercase tracking-tight text-[var(--color-on-surface)] truncate hover:text-[var(--color-primary)] transition-colors">{p.name}</h3>
                        </Link>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-sm font-black text-[var(--color-on-surface)]">From ₹{Number(p.base_price).toFixed(0)}</span>
                          <button
                            type="button"
                            onClick={() => handleQuickAdd(p)}
                            title="Add to cart"
                            aria-label={`Add ${p.name} to cart`}
                            className="w-9 h-9 -mr-1 flex items-center justify-center rounded-full bg-[var(--color-primary-container)] text-[var(--color-on-background)] hover:scale-110 active:scale-95 transition-transform shadow-sm"
                          >
                            <span className="material-symbols-outlined text-[20px]">add</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Order Summary */}
          {mounted && items.length > 0 && (
            <div className="lg:sticky lg:top-32 space-y-6">
              
              {/* Shipping Progress */}
              <div className="bg-[var(--color-surface-container-lowest)] rounded-[2.5rem] p-8 border border-[var(--color-outline-variant)]/30 shadow-sm overflow-hidden relative">
                <div className="relative z-10">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-on-surface)]">Delivery Progress</h3>
                    <span className="text-[10px] font-black uppercase text-[var(--color-primary)]">
                      {remainingForFreeShipping === 0 ? "Unlocked" : `₹${remainingForFreeShipping} more for FREE shipping`}
                    </span>
                  </div>
                  <div className="h-2 bg-[var(--color-surface-container-low)] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[var(--color-primary-container)] transition-all duration-1000 ease-out"
                      style={{ width: `${Math.min((subtotal / FREE_SHIPPING_THRESHOLD) * 100, 100)}%` }}
                    />
                  </div>
                </div>
                {/* Decorative glow */}
                <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-[var(--color-primary-container)] opacity-5 blur-[60px]" />
              </div>

              {/* Summary Card */}
              <div className="bg-[var(--color-on-background)] text-white rounded-[2.5rem] p-8 shadow-2xl shadow-black/20 relative overflow-hidden max-w-full">
                <h2 className="text-[11px] font-black uppercase tracking-[0.4em] text-white/40 mb-10">Order Summary</h2>
                
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-white/60 uppercase tracking-widest">Bag Subtotal</span>
                    <span className="text-base font-black tracking-tight">₹{subtotal.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-white/60 uppercase tracking-widest">Shipping Fee</span>
                    <span className="text-base font-black tracking-tight">
                      {shipping === 0 ? <span className="text-[var(--color-primary-container)]">FREE</span> : `₹${shipping}`}
                    </span>
                  </div>
                  
                  <div className="h-px bg-white/10 my-8" />
                  
                  <div className="flex justify-between items-end mb-10">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 block mb-2">Grand Total</span>
                      <span className="text-4xl font-black tracking-tighter italic">₹{total.toFixed(0)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] font-bold text-white/30 uppercase tracking-[0.1em] block">Incl. all taxes</span>
                    </div>
                  </div>

                  <Link
                    href="/checkout"
                    className="group w-full bg-[var(--color-primary-container)] text-[var(--color-on-background)] font-black uppercase tracking-[0.2em] text-xs py-6 rounded-2xl flex items-center justify-center gap-4 hover:scale-[1.02] active:scale-[0.98] transition-all duration-500 shadow-xl shadow-[var(--color-primary-container)]/10"
                  >
                    Proceed to Checkout
                    <span className="material-symbols-outlined text-[20px] group-hover:translate-x-1 transition-transform">lock</span>
                  </Link>
                  
                  <Link
                    href="/shop"
                    className="w-full text-center text-[10px] font-bold uppercase tracking-[0.3em] text-white/40 hover:text-[var(--color-primary-container)] transition-colors block py-2"
                  >
                    Continue Selection
                  </Link>
                </div>

                {/* Decorative background shapes */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-32 -mt-32" />
              </div>

              {/* Trust Indicators */}
              <div className="flex items-center justify-center gap-8 py-4">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-[var(--color-surface-container-low)] flex items-center justify-center text-[var(--color-secondary)]">
                    <span className="material-symbols-outlined text-[18px]">verified</span>
                  </div>
                  <span className="text-[8px] font-black uppercase tracking-widest text-[var(--color-secondary)]">Authentic</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-[var(--color-surface-container-low)] flex items-center justify-center text-[var(--color-secondary)]">
                    <span className="material-symbols-outlined text-[18px]">shield</span>
                  </div>
                  <span className="text-[8px] font-black uppercase tracking-widest text-[var(--color-secondary)]">Secure</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-[var(--color-surface-container-low)] flex items-center justify-center text-[var(--color-secondary)]">
                    <span className="material-symbols-outlined text-[18px]">package_2</span>
                  </div>
                  <span className="text-[8px] font-black uppercase tracking-widest text-[var(--color-secondary)]">Safe Packing</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
