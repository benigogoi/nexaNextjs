import Link from "next/link";

import { slugifyCategoryName } from "@/lib/categories";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

export const revalidate = 0;

interface SearchParams {
  category?: string;
  series?: string;
  sort?: string;
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
}

interface Category {
  id: string;
  name: string;
  slug?: string | null;
  parent_id?: string | null;
  image_url?: string | null;
}

const SORT_OPTIONS = [
  { label: "Latest", value: "latest" },
  { label: "Price ↑", value: "price-asc" },
  { label: "Price ↓", value: "price-desc" },
  { label: "A–Z", value: "name-asc" },
];

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

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const supabase = await createServerSupabaseClient();
  const params = await searchParams;

  const activeCategory = params.category?.toLowerCase() || "all";
  const activeSeries = params.series?.toLowerCase() || "all";
  const activeSort = params.sort?.toLowerCase() || "latest";

  const { data: allCategories } = await supabase.from("categories").select("*").order("name");
  const categories: Category[] = (allCategories || []).filter((c: any) => c.is_visible !== false);

  const mainCategories = categories.filter((category) => !category.parent_id);
  const subCategories = categories.filter((category) => category.parent_id);

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

  const products: Product[] = [...(dbProducts || [])];

  if (activeSort === "price-asc") {
    products.sort((a, b) => Number(a.base_price) - Number(b.base_price));
  } else if (activeSort === "price-desc") {
    products.sort((a, b) => Number(b.base_price) - Number(a.base_price));
  } else if (activeSort === "name-asc") {
    products.sort((a, b) => a.name.localeCompare(b.name));
  } else {
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
  if (activeSort !== "latest") activeFilterCount++;

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
          <div className="flex gap-8">

            {/* === LEFT SIDEBAR (desktop only) ======================== */}
            <aside className="hidden lg:block w-64 xl:w-72 flex-shrink-0">
              <div className="sticky top-28 rounded-[2rem] border border-[var(--color-outline-variant)]/55 bg-white/70 p-6 shadow-[0_20px_60px_rgba(25,28,29,0.06)] backdrop-blur-sm space-y-7">

                {/* Category filter */}
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.35em] text-[var(--color-secondary)] mb-3">
                    Category
                  </p>
                  <div className="space-y-1">
                    <Link
                      href={buildShopHref({ category: "all", series: null, sort: activeSort })}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-all duration-200 ${activeCategory === "all"
                          ? "bg-[var(--color-on-background)] text-[var(--color-primary-container)]"
                          : "text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-high)]"
                        }`}
                    >
                      <span className={`h-2 w-2 rounded-full flex-shrink-0 ${activeCategory === "all" ? "bg-[var(--color-primary-container)]" : "bg-[var(--color-outline-variant)]"}`} />
                      All
                    </Link>
                    {mainCategories.map((cat) => {
                      const slug = getCategorySlug(cat);
                      const isActive = activeCategory === slug;
                      return (
                        <Link
                          key={cat.id}
                          href={buildShopHref({ category: slug, series: null, sort: activeSort })}
                          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-all duration-200 ${isActive
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

                {/* Divider */}
                <div className="border-t border-[var(--color-outline-variant)]/55" />

                {/* Series filter */}
                {availableSeries.length > 0 && (
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.35em] text-[var(--color-secondary)] mb-3">
                      Series
                    </p>
                    <div className="space-y-1">
                      <Link
                        href={buildShopHref({ category: activeCategory, series: null, sort: activeSort })}
                        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-all duration-200 ${activeSeries === "all"
                            ? "bg-[var(--color-primary-container)]/15 text-[var(--color-primary)]"
                            : "text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-high)]"
                          }`}
                      >
                        <span className={`h-2 w-2 rounded-full flex-shrink-0 ${activeSeries === "all" ? "bg-[var(--color-primary)]" : "bg-[var(--color-outline-variant)]"}`} />
                        All Series
                      </Link>
                      {availableSeries.map((series) => {
                        const seriesSlug = getCategorySlug(series);
                        const isActive = activeSeries === seriesSlug;
                        return (
                          <Link
                            key={series.id}
                            href={buildShopHref({ category: activeCategory, series: seriesSlug, sort: activeSort })}
                            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-all duration-200 ${isActive
                                ? "bg-[var(--color-primary-container)]/15 text-[var(--color-primary)]"
                                : "text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-high)]"
                              }`}
                          >
                            <span className={`h-2 w-2 rounded-full flex-shrink-0 ${isActive ? "bg-[var(--color-primary)]" : "bg-[var(--color-outline-variant)]"}`} />
                            {getDisplayName(series.name)}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Divider */}
                <div className="border-t border-[var(--color-outline-variant)]/55" />

                {/* Sort */}
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.35em] text-[var(--color-secondary)] mb-3">
                    Sort By
                  </p>
                  <div className="space-y-1">
                    {SORT_OPTIONS.map((opt) => {
                      const isActive = activeSort === opt.value;
                      return (
                        <Link
                          key={opt.value}
                          href={buildShopHref({ category: activeCategory, series: activeSeries, sort: opt.value })}
                          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-all duration-200 ${isActive
                              ? "bg-[var(--color-surface-container-high)] text-[var(--color-primary)]"
                              : "text-[var(--color-secondary)] hover:bg-[var(--color-surface-container-high)] hover:text-[var(--color-on-surface)]"
                            }`}
                        >
                          <span className={`h-2 w-2 rounded-full flex-shrink-0 ${isActive ? "bg-[var(--color-primary)]" : "bg-transparent border border-[var(--color-outline-variant)]"}`} />
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
              {/* Result count bar */}
              <div className="mb-6 flex items-center justify-between">
                <p className="text-sm text-[var(--color-secondary)]">
                  <span className="font-black text-[var(--color-on-surface)]">{products.length}</span>
                  {" "}{products.length === 1 ? "product" : "products"} in{" "}
                  <span className="font-bold text-[var(--color-on-surface)]">{filterLabel}</span>
                </p>
                {activeFilterCount > 0 && (
                  <Link
                    href="/shop"
                    className="hidden sm:flex lg:hidden items-center gap-1.5 rounded-full border border-dashed border-[var(--color-outline-variant)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-secondary)] hover:border-red-400/50 hover:text-red-500 transition-all"
                  >
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                      <path d="M9 3L3 9M3 3L9 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                    Clear filters
                  </Link>
                )}
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
                <div className="grid grid-cols-2 gap-3.5 sm:gap-6 sm:grid-cols-2 md:grid-cols-2 xl:grid-cols-3">
                  {products.map((product, index) => {
                    const img = getProductImage(product);
                    const categoryLabel = getDisplayName(product.category || "Product");

                    return (
                      <Link
                        href={`/products/${product.id}`}
                        key={product.id}
                        className="group relative flex flex-col overflow-hidden rounded-[1.5rem] border border-[var(--color-outline-variant)]/40 bg-[var(--color-surface-container-lowest)] shadow-[0_16px_40px_rgba(25,28,29,0.06)] transition-all duration-500 hover:-translate-y-1 hover:border-[var(--color-primary-container)]/30 hover:shadow-[0_24px_60px_rgba(25,28,29,0.12)]"
                      >
                        {/* Image */}
                        <div className="relative overflow-hidden rounded-t-[1.5rem] border-b border-black/5 bg-[var(--color-surface)] flex-shrink-0">
                          <div className="absolute left-0 top-0 bottom-0 z-20 w-[2px] origin-bottom scale-y-0 rounded-full bg-[var(--color-primary-container)] transition-transform duration-500 group-hover:scale-y-100" />
                          <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-3.5 py-3.5">
                            <span className={`rounded-full px-2 py-0.5 text-[7px] font-black uppercase tracking-[0.24em] shadow-sm ${product.is_bundle
                                ? "bg-[#ccff00] text-[#121212]"
                                : "bg-white/90 text-black"
                              }`}>
                              {product.is_bundle ? "Bundle" : index < 4 ? "New" : "Live"}
                            </span>
                            <span className="font-mono text-[8px] font-bold uppercase tracking-[0.2em] text-white/50">
                              {String(index + 1).padStart(2, "0")}
                            </span>
                          </div>

                          <div className="relative aspect-[1.1/1]">
                            {img ? (
                              <img
                                src={img}
                                alt={product.name}
                                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                                loading="lazy"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-neutral-900">
                                <span className="text-sm opacity-20 text-white">[]</span>
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                          </div>
                        </div>

                        {/* Card footer */}
                        <div className="flex flex-col flex-1 justify-between gap-3 p-3.5 sm:p-5 bg-[var(--color-surface-container-lowest)]">
                          <div className="flex flex-col gap-1">
                            <p className="text-[7.5px] sm:text-[9px] font-black uppercase tracking-[0.28em] text-[var(--color-primary)]">
                              {categoryLabel}
                            </p>
                            <h3 className="text-sm sm:text-lg font-black leading-tight tracking-[-0.02em] text-[var(--color-on-surface)] transition-colors group-hover:text-[var(--color-secondary)]">
                              {product.name}
                            </h3>
                          </div>

                          <div className="flex flex-col gap-2.5 pt-3 border-t border-[var(--color-outline-variant)]/40 mt-auto">
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-xs sm:text-base font-black text-[var(--color-on-surface)] tracking-tight">
                                ₹{Number(product.base_price).toFixed(0)}
                              </span>
                              <span className="flex items-center gap-1 text-[7.5px] sm:text-[9px] font-black uppercase tracking-[0.2em] text-[var(--color-on-surface)]/70">
                                View
                                <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true" className="text-[var(--color-primary)] transition-transform duration-300 group-hover:translate-x-0.5">
                                  <path d="M3 7H11M11 7L7.5 3.5M11 7L7.5 10.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              </span>
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
            {/* Category */}
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.35em] text-[var(--color-secondary)] mb-3">
                Category
              </p>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={buildShopHref({ category: "all", series: null, sort: activeSort })}
                  className={`rounded-full px-4 py-2 text-sm font-bold transition-all duration-200 ${activeCategory === "all"
                      ? "bg-[var(--color-on-background)] text-[var(--color-primary-container)] shadow-sm border-none"
                      : "border border-[var(--color-outline-variant)]/80 text-[var(--color-on-surface)]"
                    }`}
                >
                  All
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
    </main>
  );
}
