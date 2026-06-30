import Link from "next/link";

import { slugifyCategoryName } from "@/lib/categories";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

export const revalidate = 0;

interface SearchParams {
  category?: string;
  series?: string;
  sort?: string;
  q?: string;
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
  category_type?: string | null;
  parent_category?: string | null;
  url_slug?: string | null;
}

interface Category {
  id: string;
  name: string;
  slug?: string | null;
  parent_id?: string | null;
  image_url?: string | null;
}

const SORT_OPTIONS = [
  { label: "Featured", value: "featured" },
  { label: "Newest", value: "latest" },
  { label: "Popular", value: "popular" },
  { label: "Price: Low to High", value: "price-asc" },
  { label: "Price: High to Low", value: "price-desc" },
];

// Spec labels by category keyword
function getProductSpec(product: Product): string {
  const cat = (product.category || "").toLowerCase();
  const name = (product.name || "").toLowerCase();
  if (product.is_bundle) return "Curated Bundle Set";
  if (cat.includes("automotive") || name.includes("car") || name.includes("auto")) return "Photo-Quality Print";
  if (cat.includes("northeast") || cat.includes("regional") || cat.includes("assam")) return "Premium Photo Print";
  if (cat.includes("zubeen") || cat.includes("legend")) return "Collector's Edition";
  if (cat.includes("mindset") || cat.includes("motivat")) return "Premium Matte Finish";
  return "A3 Poster";
}

function getCategorySlug(category: Category) {
  return category.slug?.trim().toLowerCase() || slugifyCategoryName(category.name);
}

function buildShopHref({
  category,
  series,
  sort,
}: {
  category?: string | null;
  series?: string | null;
  sort?: string | null;
}) {
  const searchParams = new URLSearchParams();

  if (category && category !== "all") searchParams.set("category", category);
  if (series && series !== "all") searchParams.set("series", series);
  if (sort && sort !== "latest") searchParams.set("sort", sort);

  const query = searchParams.toString();
  return query ? `/shop?${query}` : "/shop";
}

function getDisplayName(name: string) {
  return name;
}

// Product names may carry an SEO suffix after a "|" — strip it for card display
function getProductDisplayName(name: string) {
  return (name || "").split("|")[0].trim();
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const supabase = await createServerSupabaseClient();
  const params = await searchParams;

  const activeCategory = params.category?.toLowerCase() || "all";
  const activeSeries = params.series?.toLowerCase() || "all";
  const activeSort = params.sort?.toLowerCase() || "featured";
  const activeSearch = params.q?.toLowerCase() || "";

  const { data: allCategories } = await supabase.from("categories").select("*").order("name");
  const categories: Category[] = (allCategories || []).filter(
    (c: any) => 
      c.is_visible !== false && 
      c.category_type !== 'decal' && 
      c.category_type !== 'sticker' &&
      !c.name.toLowerCase().includes("decal") &&
      !c.name.toLowerCase().includes("sticker")
  );

  const { data: activeProductCats } = await supabase
    .from("products")
    .select("category")
    .eq("status", "Active")
    .eq("bundle_only", false);
  const activeCatNames = new Set((activeProductCats || []).map((p) => p.category));

  // Fetch bundle count separately
  const { count: bundleCount } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true })
    .eq("status", "Active")
    .eq("is_bundle", true);

  const hasBundles = (bundleCount ?? 0) > 0;

  const subCategories = categories.filter((category) => category.parent_id).filter(
    (sub) => activeCatNames.has(sub.name)
  );
  // Exclude any category named "Bundles" or "Bundle" from main poster categories
  const mainCategories = categories.filter((category) => !category.parent_id).filter((main) => {
    if (main.name.toLowerCase().includes("bundle")) return false;
    const hasActiveSubCategories = subCategories.some((sub) => sub.parent_id === main.id);
    const hasDirectActiveProducts = activeCatNames.has(main.name);
    return hasActiveSubCategories || hasDirectActiveProducts;
  });

  // Fetch per-collection product counts for the Browse Collections cards
  const collectionSlugs = [
    { key: "automotive", series: "automotive-series" },
    { key: "regional",   series: "regional-series" },
    { key: "mindset",    series: "mindset-series" },
    { key: "zubeen",     series: "zubeen-garg-posters" },
  ];

  const collectionCountsArr = await Promise.all(
    collectionSlugs.map(async ({ key, series }) => {
      // Find sub-category by slug
      const seriesCat = subCategories.find((s) => getCategorySlug(s) === series);
      let count = 0;
      if (seriesCat) {
        const { count: c } = await supabase
          .from("products")
          .select("*", { count: "exact", head: true })
          .eq("status", "Active")
          .eq("bundle_only", false)
          .eq("category", seriesCat.name);
        count = c ?? 0;
      }
      return { key, count };
    })
  );
  const collectionCounts: Record<string, number> = {};
  collectionCountsArr.forEach(({ key, count }) => { collectionCounts[key] = count; });

  const selectedMainCategory =
    activeCategory === "all"
      ? null
      : mainCategories.find((category) => getCategorySlug(category) === activeCategory) || null;

  const availableSeries = selectedMainCategory
    ? subCategories.filter((category) => category.parent_id === selectedMainCategory.id)
    : subCategories;

  const selectedSeries =
    activeSeries === "all"
      ? null
      : availableSeries.find((category) => getCategorySlug(category) === activeSeries) || null;

  let productQuery = supabase
    .from("products")
    .select("*")
    .eq("status", "Active")
    .eq("bundle_only", false);

  if (selectedSeries) {
    productQuery = productQuery.eq("category", selectedSeries.name);
  } else if (selectedMainCategory) {
    const childNames = subCategories
      .filter((category) => category.parent_id === selectedMainCategory.id)
      .map((category) => category.name);

    const filterNames = [selectedMainCategory.name, ...childNames];
    productQuery = productQuery.in("category", filterNames);

    // If it's a bundle category, ensure we only show bundles
    if (activeCategory.includes("bundle") || selectedMainCategory.name.toLowerCase().includes("bundle")) {
      productQuery = productQuery.eq("is_bundle", true);
    }
  }

  const { data: dbProducts, error: productsError } = await productQuery.order("created_at", {
    ascending: false,
  });

  if (productsError) {
    console.error("[Shop] Query error:", productsError);
  }

  const products: Product[] = [...(dbProducts || [])].filter((p) => {
    const isDecalOrSticker = p.category_type === 'decal' || 
      p.category_type === 'sticker' ||
      p.parent_category?.toLowerCase().includes("decal") ||
      p.parent_category?.toLowerCase().includes("sticker") ||
      ( !p.category_type && !p.parent_category && (p.category?.toLowerCase().includes("decal") || p.category?.toLowerCase().includes("sticker")) );
    
    if (isDecalOrSticker) return false;
    
    if (activeSearch && !p.name.toLowerCase().includes(activeSearch)) return false;
    
    return true;
  });

  if (activeSort === "price-asc") {
    products.sort((a, b) => Number(a.base_price) - Number(b.base_price));
  } else if (activeSort === "price-desc") {
    products.sort((a, b) => Number(b.base_price) - Number(a.base_price));
  } else if (activeSort === "popular") {
    // Popular: sort by index as a proxy for curated order (already returned by DB default)
    // No additional sort needed — keep DB order
  } else if (activeSort === "featured") {
    // Featured: stable default order from DB
  } else {
    // "latest" / default
    products.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  const getProductImage = (product: Product): string | null => {
    if (product.image_url) return product.image_url;
    if (product.mockup_urls && product.mockup_urls.length > 0) return product.mockup_urls[0];
    return null;
  };

  const filterLabel = selectedSeries
    ? getDisplayName(selectedSeries.name)
    : selectedMainCategory
      ? getDisplayName(selectedMainCategory.name)
      : "All Products";

  // Build active filter count for mobile badge
  let activeFilterCount = 0;
  if (activeCategory !== "all") activeFilterCount++;
  if (activeSeries !== "all") activeFilterCount++;
  if (activeSort !== "featured") activeFilterCount++;

  return (
    <main className="min-h-screen bg-[var(--color-surface)] pb-28 lg:pb-16 pt-36">

      {/* === HEADER =================================================== */}

      <section className="px-5 pb-5 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="mt-1 h-10 w-1 rounded-full bg-[var(--color-primary-container)] flex-shrink-0" />
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.35em] text-[var(--color-primary)] mb-1">
                  Shop
                </p>
                <h1 className="text-[clamp(2.2rem,5vw,4rem)] font-black uppercase leading-[0.95] tracking-[-0.05em] text-[var(--color-on-surface)]">
                  {selectedSeries ? (
                    <>
                      {getDisplayName(selectedSeries.name)}{" "}
                      <span className="text-[var(--color-primary)]">Series</span>
                    </>
                  ) : selectedMainCategory ? (
                    <>
                      {getDisplayName(selectedMainCategory.name)}{" "}
                      <span className="text-[var(--color-primary)]">Collection</span>
                    </>
                  ) : (
                    <>
                      Full{" "}
                      <span className="text-[var(--color-primary)]">Catalog</span>
                    </>
                  )}
                </h1>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* === MAIN CONTENT WITH SIDEBAR ================================ */}
      <section className="px-5 pt-6 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex gap-6 xl:gap-8">

            {/* === LEFT SIDEBAR (desktop only) ======================== */}
            <aside className="hidden lg:block w-56 xl:w-60 flex-shrink-0">
              <div className="sticky top-28 rounded-[1.5rem] border border-[var(--color-outline-variant)]/55 bg-white/75 p-4 shadow-[0_18px_52px_rgba(25,28,29,0.055)] backdrop-blur-sm space-y-5">

                {/* Posters section */}
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.35em] text-[var(--color-secondary)] mb-2.5">
                    Posters
                  </p>
                  <div className="space-y-1">
                    <Link
                      href={buildShopHref({ category: "all", series: null, sort: activeSort })}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-bold transition-all duration-200 ${activeCategory === "all"
                          ? "bg-[var(--color-on-background)] text-[var(--color-primary-container)]"
                          : "text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-high)]"
                        }`}
                    >
                      <span className={`h-2 w-2 rounded-full flex-shrink-0 ${activeCategory === "all" ? "bg-[var(--color-primary-container)]" : "bg-[var(--color-outline-variant)]"}`} />
                      All Posters
                    </Link>
                    {mainCategories.map((cat) => {
                      const slug = getCategorySlug(cat);
                      const isActive = activeCategory === slug;
                      return (
                        <Link
                          key={cat.id}
                          href={buildShopHref({ category: slug, series: null, sort: activeSort })}
                          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-bold transition-all duration-200 ${isActive
                              ? "bg-[var(--color-on-background)] text-[var(--color-primary-container)]"
                              : "text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-high)]"
                            }`}
                        >
                          <span className={`h-2 w-2 rounded-full flex-shrink-0 ${isActive ? "bg-[var(--color-primary-container)]" : "bg-[var(--color-outline-variant)]"}`} />
                          {cat.name}
                        </Link>
                      );
                    })}
                  </div>
                </div>

                {/* Series filter */}
                {availableSeries.length > 0 && (
                  <>
                    <div className="border-t border-[var(--color-outline-variant)]/55" />
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.35em] text-[var(--color-secondary)] mb-2.5">
                        Series
                      </p>
                      <div className="space-y-1">
                        <Link
                          href={buildShopHref({ category: activeCategory, series: null, sort: activeSort })}
                          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-bold transition-all duration-200 ${activeSeries === "all"
                              ? "bg-[var(--color-on-background)] text-[var(--color-primary-container)]"
                              : "text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-high)]"
                            }`}
                        >
                          <span className={`h-2 w-2 rounded-full flex-shrink-0 ${activeSeries === "all" ? "bg-[var(--color-primary-container)]" : "bg-[var(--color-outline-variant)]"}`} />
                          All Series
                        </Link>
                        {availableSeries.map((series) => {
                          const seriesSlug = getCategorySlug(series);
                          const isActive = activeSeries === seriesSlug;
                          return (
                            <Link
                              key={series.id}
                              href={buildShopHref({ category: activeCategory, series: seriesSlug, sort: activeSort })}
                              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-bold transition-all duration-200 ${isActive
                                  ? "bg-[var(--color-on-background)] text-[var(--color-primary-container)]"
                                  : "text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-high)]"
                                }`}
                            >
                              <span className={`h-2 w-2 rounded-full flex-shrink-0 ${isActive ? "bg-[var(--color-primary-container)]" : "bg-[var(--color-outline-variant)]"}`} />
                              {getDisplayName(series.name)}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}

                {/* Bundles — separate section */}
                {hasBundles && (
                  <>
                    <div className="border-t border-[var(--color-outline-variant)]/55" />
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.35em] text-[var(--color-secondary)] mb-2.5">
                        Bundles
                      </p>
                      <div className="space-y-1">
                        <Link
                          href="/shop?category=bundles"
                          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-bold transition-all duration-200 ${activeCategory === "bundles"
                              ? "bg-[var(--color-on-background)] text-[var(--color-primary-container)]"
                              : "text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-high)]"
                            }`}
                        >
                          <span className={`h-2 w-2 rounded-full flex-shrink-0 ${activeCategory === "bundles" ? "bg-[var(--color-primary-container)]" : "bg-[var(--color-outline-variant)]"}`} />
                          All Bundles
                          <span className="ml-auto text-[10px] font-bold text-[var(--color-secondary)] bg-[var(--color-surface-container-high)] rounded-full px-2 py-0.5">
                            {bundleCount ?? 0}
                          </span>
                        </Link>
                      </div>
                    </div>
                  </>
                )}

                {/* Divider */}
                <div className="border-t border-[var(--color-outline-variant)]/55" />

                {/* Sort */}
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.35em] text-[var(--color-secondary)] mb-2.5">
                    Sort By
                  </p>
                  <div className="space-y-1">
                    {SORT_OPTIONS.map((opt) => {
                      const isActive = activeSort === opt.value;
                      return (
                        <Link
                          key={opt.value}
                          href={buildShopHref({ category: activeCategory, series: activeSeries, sort: opt.value })}
                          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-bold transition-all duration-200 ${isActive
                              ? "bg-[var(--color-on-background)] text-[var(--color-primary-container)]"
                              : "text-[var(--color-secondary)] hover:bg-[var(--color-surface-container-high)] hover:text-[var(--color-on-surface)]"
                            }`}
                        >
                          <span className={`h-2 w-2 rounded-full flex-shrink-0 ${isActive ? "bg-[var(--color-primary-container)]" : "bg-transparent border border-[var(--color-outline-variant)]"}`} />
                          {opt.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>

                {/* Reset link */}
                {activeFilterCount > 0 && (
                  <Link
                    href="/shop"
                    className="flex items-center gap-2 rounded-xl border border-dashed border-[var(--color-outline-variant)] px-3 py-2.5 text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--color-secondary)] transition-all hover:border-red-400/50 hover:text-red-500"
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                      <path d="M9 3L3 9M3 3L9 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                    Clear all filters
                  </Link>
                )}
              </div>
            </aside>

            {/* === PRODUCT GRID ======================================= */}
            <div className="flex-1 min-w-0">
              
              {/* === BROWSE COLLECTIONS (desktop only) ================ */}
              {activeCategory === "all" && activeSeries === "all" && !activeSearch && (
                <div className="hidden lg:block mb-10">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="h-px flex-1 bg-[var(--color-outline-variant)]/40" />
                    <p className="text-[9px] font-black uppercase tracking-[0.35em] text-[var(--color-secondary)]">Browse Collections</p>
                    <div className="h-px flex-1 bg-[var(--color-outline-variant)]/40" />
                  </div>

                  {/* Desktop: 4-column grid */}
                  <div className="grid grid-cols-4 gap-4">
                    {/* Automotive Posters */}
                    <Link
                      href="/shop?category=posters&series=automotive-series"
                      className="group relative overflow-hidden rounded-[1.25rem] border border-white/10 bg-[#0a0a0a] shadow-[0_8px_32px_rgba(0,0,0,0.18)] transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_20px_48px_rgba(0,0,0,0.28)]"
                    >
                      <div className="relative h-52 overflow-hidden">
                        <img src="/collections/card_automotive.png" alt="Automotive Posters" className="h-full w-full object-cover opacity-55 transition-all duration-700 group-hover:scale-105 group-hover:opacity-80" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent" />
                        <div className="absolute top-3 left-3">
                          <span className="rounded-full bg-[var(--color-primary)]/20 border border-[var(--color-primary)]/30 backdrop-blur-sm px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.2em] text-[var(--color-primary)]">
                            Posters
                          </span>
                        </div>
                      </div>
                      <div className="p-4">
                        <h3 className="text-sm font-black uppercase text-white leading-tight tracking-tight mb-1">Automotive</h3>
                        <p className="text-[10px] text-white/40 mb-3">{collectionCounts["automotive"] ?? 0} designs</p>
                        <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.15em] text-[var(--color-primary)] group-hover:gap-2.5 transition-all duration-300">
                          Explore Collection
                          <svg width="10" height="10" viewBox="0 0 14 14" fill="none" aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1">
                            <path d="M3 7H11M11 7L7.5 3.5M11 7L7.5 10.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                      </div>
                    </Link>

                    {/* Northeast India Posters */}
                    <Link
                      href="/shop?category=posters&series=regional-series"
                      className="group relative overflow-hidden rounded-[1.25rem] border border-white/10 bg-[#0a0a0a] shadow-[0_8px_32px_rgba(0,0,0,0.18)] transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_20px_48px_rgba(0,0,0,0.28)]"
                    >
                      <div className="relative h-52 overflow-hidden">
                        <img src="/collections/card_regional.png" alt="Northeast India Wall Art" className="h-full w-full object-cover opacity-55 transition-all duration-700 group-hover:scale-105 group-hover:opacity-80" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent" />
                        <div className="absolute top-3 left-3">
                          <span className="rounded-full bg-[var(--color-primary)]/20 border border-[var(--color-primary)]/30 backdrop-blur-sm px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.2em] text-[var(--color-primary)]">
                            Posters
                          </span>
                        </div>
                      </div>
                      <div className="p-4">
                        <h3 className="text-sm font-black uppercase text-white leading-tight tracking-tight mb-1">Northeast India</h3>
                        <p className="text-[10px] text-white/40 mb-3">{collectionCounts["regional"] ?? 0} designs</p>
                        <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.15em] text-[var(--color-primary)] group-hover:gap-2.5 transition-all duration-300">
                          Explore Collection
                          <svg width="10" height="10" viewBox="0 0 14 14" fill="none" aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1">
                            <path d="M3 7H11M11 7L7.5 3.5M11 7L7.5 10.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                      </div>
                    </Link>

                    {/* Motivational Posters */}
                    <Link
                      href="/shop?category=posters&series=mindset-series"
                      className="group relative overflow-hidden rounded-[1.25rem] border border-white/10 bg-[#0a0a0a] shadow-[0_8px_32px_rgba(0,0,0,0.18)] transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_20px_48px_rgba(0,0,0,0.28)]"
                    >
                      <div className="relative h-52 overflow-hidden">
                        <img src="/collections/card_mindset.png" alt="Motivational Posters" className="h-full w-full object-cover opacity-55 transition-all duration-700 group-hover:scale-105 group-hover:opacity-80" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent" />
                        <div className="absolute top-3 left-3">
                          <span className="rounded-full bg-[var(--color-primary)]/20 border border-[var(--color-primary)]/30 backdrop-blur-sm px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.2em] text-[var(--color-primary)]">
                            Posters
                          </span>
                        </div>
                      </div>
                      <div className="p-4">
                        <h3 className="text-sm font-black uppercase text-white leading-tight tracking-tight mb-1">Motivational</h3>
                        <p className="text-[10px] text-white/40 mb-3">{collectionCounts["mindset"] ?? 0} designs</p>
                        <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.15em] text-[var(--color-primary)] group-hover:gap-2.5 transition-all duration-300">
                          Explore Collection
                          <svg width="10" height="10" viewBox="0 0 14 14" fill="none" aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1">
                            <path d="M3 7H11M11 7L7.5 3.5M11 7L7.5 10.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                      </div>
                    </Link>

                    {/* Zubeen Garg Posters */}
                    <Link
                      href="/shop?category=posters&series=zubeen-garg-posters"
                      className="group relative overflow-hidden rounded-[1.25rem] border border-white/10 bg-[#0a0a0a] shadow-[0_8px_32px_rgba(0,0,0,0.18)] transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_20px_48px_rgba(0,0,0,0.28)]"
                    >
                      <div className="relative h-52 overflow-hidden">
                        <img src="/collections/card_zubeen.png" alt="Zubeen Garg Posters" className="h-full w-full object-cover opacity-55 transition-all duration-700 group-hover:scale-105 group-hover:opacity-80" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent" />
                        <div className="absolute top-3 left-3">
                          <span className="rounded-full bg-[var(--color-primary)]/20 border border-[var(--color-primary)]/30 backdrop-blur-sm px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.2em] text-[var(--color-primary)]">
                            Posters
                          </span>
                        </div>
                      </div>
                      <div className="p-4">
                        <h3 className="text-sm font-black uppercase text-white leading-tight tracking-tight mb-1">Zubeen Garg</h3>
                        <p className="text-[10px] text-white/40 mb-3">{collectionCounts["zubeen"] ?? 0} designs</p>
                        <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.15em] text-[var(--color-primary)] group-hover:gap-2.5 transition-all duration-300">
                          Explore Collection
                          <svg width="10" height="10" viewBox="0 0 14 14" fill="none" aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1">
                            <path d="M3 7H11M11 7L7.5 3.5M11 7L7.5 10.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                      </div>
                    </Link>
                  </div>
                </div>
              )}

              {/* Result count bar */}
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[var(--color-secondary)]">
                    {filterLabel}
                  </p>
                  <p className="mt-1 text-sm font-medium text-[var(--color-secondary)]">
                    Showing <span className="font-black text-[var(--color-on-surface)]">{products.length}</span> posters
                    <span className="mx-2 text-[var(--color-outline-variant)]">/</span>
                    sorted by <span className="font-bold text-[var(--color-on-surface)]">{SORT_OPTIONS.find((opt) => opt.value === activeSort)?.label || "Featured"}</span>
                  </p>
                </div>
                {activeFilterCount > 0 && (
                  <Link
                    href="/shop"
                    className="hidden sm:flex items-center gap-1.5 rounded-full border border-dashed border-[var(--color-outline-variant)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-secondary)] hover:border-red-400/50 hover:text-red-500 transition-all"
                  >
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                      <path d="M9 3L3 9M3 3L9 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                    Clear filters
                  </Link>
                )}
              </div>

              <div className="mb-8 grid gap-2 rounded-2xl border border-[var(--color-outline-variant)]/35 bg-[var(--color-surface-container-lowest)]/80 p-3 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--color-secondary)] shadow-[0_10px_36px_rgba(25,28,29,0.035)] sm:grid-cols-3">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[var(--color-primary-container)]" />
                  Professional photo prints
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[var(--color-primary-container)]" />
                  Secure packaging
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[var(--color-primary-container)]" />
                  Ships across India
                </div>
              </div>

              {products.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-[2rem] border border-dashed border-[var(--color-outline-variant)]/80 bg-white/55 py-32 text-center">
                  <span className="material-symbols-outlined mb-6 text-[48px] text-[var(--color-secondary)]">
                    inventory_2
                  </span>
                  <p className="mb-2 text-xl font-bold text-[var(--color-on-surface)]">
                    Nothing here yet
                  </p>
                  <p className="mb-8 max-w-sm text-sm text-[var(--color-secondary)]">
                    No {filterLabel.toLowerCase()} are live yet. Reset the filters or check back soon.
                  </p>
                  <Link
                    href="/shop"
                    className="rounded-full bg-[var(--color-on-background)] px-6 py-3 text-xs font-black uppercase tracking-[0.2em] text-[var(--color-primary-container)] shadow-md transition-all hover:scale-105 active:scale-95"
                  >
                    Reset filters
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 sm:gap-6 sm:grid-cols-2 md:grid-cols-2 xl:grid-cols-3">
                  {products.map((product, index) => {
                    const img = getProductImage(product);
                    const categoryLabel = getDisplayName(product.category || "Product");

                    return (
                      <Link
                        href={`/posters/${product.url_slug || product.id}`}
                        key={product.id}
                        className="group relative flex flex-col overflow-hidden rounded-[1.35rem] border border-[var(--color-outline-variant)]/30 bg-[var(--color-surface-container-lowest)] shadow-[0_12px_36px_rgba(0,0,0,0.04)] transition-all duration-500 hover:-translate-y-1.5 hover:border-[var(--color-primary)]/25 hover:shadow-[0_28px_56px_rgba(0,0,0,0.08)]"
                      >
                        {/* Image / Mockup Container */}
                        <div className="relative aspect-[4/5] overflow-hidden bg-[var(--color-surface-container-low)]">
                          {img ? (
                            <img
                              src={img}
                              alt={product.name}
                              className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-105"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-neutral-900/5">
                              <span className="text-[10px] font-black uppercase tracking-widest opacity-20 text-[var(--color-on-surface)]">No Image</span>
                            </div>
                          )}
                          
                          {/* Badges */}
                          <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between p-3 sm:p-4">
                            <span className={`rounded-full px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.2em] shadow-sm backdrop-blur-md ${product.is_bundle
                                ? "bg-[var(--color-primary)] text-[var(--color-on-primary-fixed)]"
                                : "bg-white/90 text-black"
                              }`}>
                              {product.is_bundle ? "Bundle" : index < 4 ? "New Drop" : "Live"}
                            </span>
                            <span className="font-mono text-[9px] font-bold text-black/20 group-hover:text-[var(--color-primary)]/40 transition-colors">
                              {String(index + 1).padStart(2, "0")}
                            </span>
                          </div>

                          {/* Soft Vignette */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-60" />
                        </div>

                        {/* Card Content */}
                        <div className="flex flex-col flex-1 gap-4 p-4 sm:p-5">
                          <div className="flex flex-col gap-1">
                            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[var(--color-primary)]">
                              {categoryLabel}
                            </p>
                            <h3 className="min-h-[2.35rem] text-sm sm:min-h-[3.15rem] sm:text-base font-black leading-tight tracking-tight text-[var(--color-on-surface)] transition-colors group-hover:text-[var(--color-primary)]">
                              {getProductDisplayName(product.name)}
                            </h3>
                            <p className="text-[10px] font-medium text-[var(--color-secondary)] tracking-wide mt-0.5">
                              {getProductSpec(product)}
                            </p>
                          </div>

                          <div className="mt-auto flex items-center justify-between pt-4 border-t border-[var(--color-outline-variant)]/20">
                            <span className="font-mono text-sm sm:text-xl font-black text-[var(--color-on-surface)]">
                              ₹{Number(product.base_price).toFixed(0)}
                            </span>
                            <div className="flex items-center gap-1.5 rounded-full bg-[var(--color-on-background)] px-3 py-2 text-[9px] font-black uppercase tracking-[0.16em] text-[var(--color-primary-container)] shadow-sm transition-all duration-300 group-hover:bg-[var(--color-primary-container)] group-hover:text-[var(--color-on-background)]">
                              <span className="hidden sm:inline">View Print</span>
                              <span className="sm:hidden">View</span>
                              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1">
                                <path d="M3 7H11M11 7L7.5 3.5M11 7L7.5 10.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* === MOBILE BOTTOM FILTER TAB ==================================== */}
      <div className="lg:hidden">
        {/* Hidden checkbox for CSS state */}
        <input type="checkbox" id="shop-filter-toggle" className="hidden" />

        {/* Dark overlay */}
        <label
          htmlFor="shop-filter-toggle"
          className="filter-overlay fixed inset-0 z-40 bg-black/60 backdrop-blur-sm cursor-pointer"
          aria-hidden="true"
        />

        {/* Bottom sheet drawer */}
        <div className="filter-drawer fixed bottom-0 left-0 right-0 z-50 rounded-t-[2rem] border-t border-[var(--color-outline-variant)]/55 bg-white shadow-[0_-24px_60px_rgba(25,28,29,0.18)] max-h-[80vh] overflow-y-auto">
          {/* Drag handle + close */}
          <div className="sticky top-0 bg-white/95 backdrop-blur-sm rounded-t-[2rem] border-b border-[var(--color-outline-variant)]/30 px-6 pt-4 pb-4 flex items-center justify-between">
            <div>
              <div className="mx-auto w-10 h-1 rounded-full bg-[var(--color-outline-variant)] mb-3" />
              <p className="text-sm font-black uppercase tracking-[0.2em] text-[var(--color-on-surface)]">
                Filter &amp; Sort
              </p>
            </div>
            <label
              htmlFor="shop-filter-toggle"
              className="cursor-pointer flex items-center justify-center w-9 h-9 rounded-full bg-[var(--color-on-background)] text-[var(--color-primary-container)] hover:opacity-90 shadow-md transition-all duration-200 active:scale-90"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M2 2L12 12M12 2L2 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </label>
          </div>

          <div className="px-6 py-6 space-y-10">
            {/* Posters */}
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.35em] text-[var(--color-secondary)] mb-3">
                Posters
              </p>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={buildShopHref({ category: "all", series: null, sort: activeSort })}
                  className={`rounded-full px-4 py-2 text-sm font-bold transition-all duration-200 ${activeCategory === "all"
                      ? "bg-[var(--color-on-background)] text-[var(--color-primary-container)] shadow-sm border-none"
                      : "border border-[var(--color-outline-variant)]/80 text-[var(--color-on-surface)]"
                    }`}
                >
                  All Posters
                </Link>
                {mainCategories.map((cat) => {
                  const slug = getCategorySlug(cat);
                  const isActive = activeCategory === slug;
                  return (
                    <Link
                      key={cat.id}
                      href={buildShopHref({ category: slug, series: null, sort: activeSort })}
                      className={`rounded-full px-4 py-2 text-sm font-bold transition-all duration-200 ${isActive
                          ? "bg-[var(--color-on-background)] text-[var(--color-primary-container)] shadow-sm border-none"
                          : "border border-[var(--color-outline-variant)]/80 text-[var(--color-on-surface)]"
                        }`}
                    >
                      {getDisplayName(cat.name)}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Bundles — mobile */}
            {hasBundles && (
              <>
                <div className="h-px bg-[var(--color-outline-variant)]/20 my-2" />
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.35em] text-[var(--color-secondary)] mb-3">
                    Bundles
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href="/shop?category=bundles"
                      className={`rounded-full px-4 py-2 text-sm font-bold transition-all duration-200 ${activeCategory === "bundles"
                          ? "bg-[var(--color-on-background)] text-[var(--color-primary-container)] shadow-sm border-none"
                          : "border border-[var(--color-outline-variant)]/80 text-[var(--color-on-surface)]"
                        }`}
                    >
                      All Bundles
                    </Link>
                  </div>
                </div>
              </>
            )}

            {/* Series */}
            {availableSeries.length > 0 && (
              <>
                <div className="h-px bg-[var(--color-outline-variant)]/20 my-2" />
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.35em] text-[var(--color-secondary)] mb-3">
                    Series
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={buildShopHref({ category: activeCategory, series: null, sort: activeSort })}
                      className={`rounded-full px-4 py-2 text-sm font-bold transition-all duration-200 ${activeSeries === "all"
                          ? "bg-[var(--color-on-background)] text-[var(--color-primary-container)] shadow-sm border-none"
                          : "border border-[var(--color-outline-variant)]/80 text-[var(--color-on-surface)]"
                        }`}
                    >
                      All Series
                    </Link>
                    {availableSeries.map((series) => {
                      const seriesSlug = getCategorySlug(series);
                      const isActive = activeSeries === seriesSlug;
                      return (
                        <Link
                          key={series.id}
                          href={buildShopHref({ category: activeCategory, series: seriesSlug, sort: activeSort })}
                          className={`rounded-full px-4 py-2 text-sm font-bold transition-all duration-200 ${isActive
                              ? "bg-[var(--color-on-background)] text-[var(--color-primary-container)] shadow-sm border-none"
                              : "border border-[var(--color-outline-variant)]/80 text-[var(--color-on-surface)]"
                            }`}
                        >
                          {getDisplayName(series.name)}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            <div className="h-px bg-[var(--color-outline-variant)]/20 my-2" />
            {/* Sort */}
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.35em] text-[var(--color-secondary)] mb-3">
                Sort By
              </p>
              <div className="flex flex-wrap gap-2">
                {SORT_OPTIONS.map((opt) => {
                  const isActive = activeSort === opt.value;
                  return (
                    <Link
                      key={opt.value}
                      href={buildShopHref({ category: activeCategory, series: activeSeries, sort: opt.value })}
                      className={`rounded-full px-4 py-2 text-sm font-bold transition-all duration-200 ${isActive
                          ? "bg-[var(--color-on-background)] text-[var(--color-primary-container)] shadow-sm border-none"
                          : "border border-[var(--color-outline-variant)]/80 text-[var(--color-secondary)]"
                        }`}
                    >
                      {opt.label}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Clear filters */}
            {activeFilterCount > 0 && (
              <Link
                href="/shop"
                className="flex items-center justify-center gap-2 w-full rounded-xl border border-dashed border-red-300 px-4 py-3 text-sm font-bold text-red-500 transition-all hover:bg-red-50"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path d="M9 3L3 9M3 3L9 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
                Clear all filters
              </Link>
            )}

            {/* Bottom spacing for safe area */}
            <div className="h-4" />
          </div>
        </div>

        {/* Sticky bottom-right trigger button */}
        <label
          htmlFor="shop-filter-toggle"
          className="fixed bottom-6 right-5 z-30 flex cursor-pointer items-center gap-2.5 rounded-full bg-[var(--color-on-background)] px-5 py-3 text-[11px] font-black uppercase tracking-[0.22em] text-[var(--color-primary-container)] shadow-[0_12px_40px_rgba(25,28,29,0.3)] transition-all hover:scale-105 active:scale-95"
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          Filters
          {activeFilterCount > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-primary-container)] text-[10px] font-black text-[var(--color-on-background)]">
              {activeFilterCount}
            </span>
          )}
        </label>
      </div>

      {/* === SEO CONTENT ============================================== */}
      <section className="border-t border-[var(--color-outline-variant)]/30 bg-[var(--color-surface-container-lowest)]" aria-label="About our collections">
        <div className="mx-auto max-w-5xl px-5 sm:px-8 py-16 lg:py-20">

          {/* Section heading */}
          <div className="mb-12">
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-[var(--color-secondary)] mb-4">Our Collections</p>
            <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-[var(--color-on-surface)] leading-tight max-w-xl">
              Premium Posters &amp; Wall Art —{" "}
              <span className="text-[var(--color-primary)]">Crafted for India</span>
            </h2>
            <p className="mt-4 text-sm sm:text-base leading-relaxed text-[var(--color-secondary)] max-w-2xl">
              NexaDesignLab is your destination for{" "}
              <strong className="text-[var(--color-on-surface)] font-semibold">premium posters in India</strong>{" "}
              — wall art designed with intention and printed on professional photo paper. Every order is printed fresh and carefully packaged before it ships, because we believe what you hang on your wall says something about you.
            </p>
          </div>

          {/* Editorial rows */}
          <div className="divide-y divide-[var(--color-outline-variant)]/25">

            {/* Row 1 — Automotive */}
            <div className="flex items-start gap-6 sm:gap-10 py-8">
              {/* Thumbnail */}
              <div className="flex-shrink-0 w-16 sm:w-20">
                <div className="relative aspect-[3/4] overflow-hidden border border-[var(--color-outline-variant)]/40" style={{ boxShadow: '2px 4px 16px rgba(0,0,0,0.08)' }}>
                  <img src="/collections/card_automotive.png" alt="Automotive Posters" className="h-full w-full object-cover opacity-80" />
                </div>
              </div>
              {/* Text */}
              <div className="flex-1 min-w-0 pt-0.5">
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[var(--color-primary)] mb-1.5">01</p>
                <h3 className="text-base font-black uppercase tracking-tight text-[var(--color-on-surface)] mb-2">Automotive Excellence</h3>
                <p className="text-sm leading-relaxed text-[var(--color-secondary)]">
                  Our <strong className="text-[var(--color-on-surface)] font-medium">Automotive Posters</strong> are a love letter to machines — from legendary circuits to iconic road cars. Designed with precision and printed on <strong className="text-[var(--color-on-surface)] font-medium">premium photo paper</strong>, each piece is built for the enthusiast who wants more than decoration.
                </p>
              </div>
            </div>

            {/* Row 2 — Regional */}
            <div className="flex items-start gap-6 sm:gap-10 py-8">
              <div className="flex-shrink-0 w-16 sm:w-20">
                <div className="relative aspect-[3/4] overflow-hidden border border-[var(--color-outline-variant)]/40" style={{ boxShadow: '2px 4px 16px rgba(0,0,0,0.08)' }}>
                  <img src="/collections/card_regional.png" alt="Northeast India Wall Art" className="h-full w-full object-cover opacity-80" />
                </div>
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[var(--color-primary)] mb-1.5">02</p>
                <h3 className="text-base font-black uppercase tracking-tight text-[var(--color-on-surface)] mb-2">Regional Pride</h3>
                <p className="text-sm leading-relaxed text-[var(--color-secondary)]">
                  The <strong className="text-[var(--color-on-surface)] font-medium">Northeast India wall art</strong> collection celebrates the culture, landscapes, and spirit of the region. These are not generic travel prints — they are deliberate, researched, and made with genuine pride in the Northeast.
                </p>
              </div>
            </div>

            {/* Row 3 — Motivation */}
            <div className="flex items-start gap-6 sm:gap-10 py-8">
              <div className="flex-shrink-0 w-16 sm:w-20">
                <div className="relative aspect-[3/4] overflow-hidden border border-[var(--color-outline-variant)]/40" style={{ boxShadow: '2px 4px 16px rgba(0,0,0,0.08)' }}>
                  <img src="/collections/card_mindset.png" alt="Motivational Posters" className="h-full w-full object-cover opacity-80" />
                </div>
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[var(--color-primary)] mb-1.5">03</p>
                <h3 className="text-base font-black uppercase tracking-tight text-[var(--color-on-surface)] mb-2">Modern Motivation</h3>
                <p className="text-sm leading-relaxed text-[var(--color-secondary)]">
                  Our <strong className="text-[var(--color-on-surface)] font-medium">Motivational Posters</strong> skip the clichés. Instead, you'll find words that actually resonate — paired with strong, modern typography that looks as good in a studio as it does in a boardroom.
                </p>
              </div>
            </div>

            {/* Row 4 — Cultural Icons */}
            <div className="flex items-start gap-6 sm:gap-10 py-8">
              <div className="flex-shrink-0 w-16 sm:w-20">
                <div className="relative aspect-[3/4] overflow-hidden border border-[var(--color-outline-variant)]/40" style={{ boxShadow: '2px 4px 16px rgba(0,0,0,0.08)' }}>
                  <img src="/collections/card_zubeen.png" alt="Zubeen Garg Collector Posters" className="h-full w-full object-cover opacity-80" />
                </div>
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[var(--color-primary)] mb-1.5">04</p>
                <h3 className="text-base font-black uppercase tracking-tight text-[var(--color-on-surface)] mb-2">Cultural Icons</h3>
                <p className="text-sm leading-relaxed text-[var(--color-secondary)]">
                  The Zubeen Garg Posters series is a tribute to a cultural icon — collector-grade prints for fans who want something genuinely special on their wall. All orders ship across India, packaged to protect your print in transit.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>
    </main>
  );
}
