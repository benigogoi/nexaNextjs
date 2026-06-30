import Link from "next/link";

import CategoryFilmstrip from "@/components/CategoryFilmstrip";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

function getProductDisplayName(name?: string | null) {
  return (name || "").split("|")[0].trim();
}

export const revalidate = 0;

export const metadata = {
  title: "Premium Wall Posters & Art Prints | NexaDesignLab",
  description: "Elevate your space with professional photo-quality posters and art prints. Automotive, Northeast India, motivational and collector-inspired designs shipped across India.",
  keywords: "premium wall posters, art prints India, photo quality posters, automotive posters, Northeast India posters",
  openGraph: {
    title: "Premium Wall Posters & Art Prints | NexaDesignLab",
    description: "Professional photo-quality posters and art prints shipped across India.",
    type: "website",
    url: "https://nexadesignlab.com",
  }
};

export default async function Home() {
  const supabase = await createServerSupabaseClient();

  const { data: dbCategories } = await supabase.from("categories").select("*").order("name");
  const visibleCategories = dbCategories?.filter((category) =>
    category.is_visible !== false &&
    category.category_type !== 'decal' &&
    category.category_type !== 'sticker' &&
    !category.name.toLowerCase().includes("decal") &&
    !category.name.toLowerCase().includes("sticker")
  ) || [];
  const mainCats = visibleCategories.filter((category) => !category.parent_id);

  const { data: dbProducts } = await supabase
    .from("products")
    .select("*")
    .eq("status", "Active")
    .eq("bundle_only", false)
    .order("created_at", { ascending: false });

  const allProducts = dbProducts || [];

  const posters = allProducts.filter((p) =>
    p.category_type === 'poster' ||
    (p.parent_category?.toLowerCase().includes("poster")) ||
    (!p.category_type && !p.parent_category && (p.category?.toLowerCase().includes("poster") || p.category?.toLowerCase().includes("series")))
  ).filter(p => p.category_type !== 'decal' && p.category_type !== 'sticker');

  const bestsellerSkus = ['NX-PT-MS-005', 'NX-PF-ZG-002', 'NX-PT-MS-004', 'NX-PF-ZG-004'];
  const bestsellers = bestsellerSkus
    .map(sku => posters.find(p => p.sku === sku))
    .filter(Boolean);

  if (bestsellers.length < 4) {
    const fallbackBestsellers = posters.filter(p => !bestsellers.some(b => b.id === p.id)).slice(0, 4 - bestsellers.length);
    bestsellers.push(...fallbackBestsellers);
  }

  const bestsellersIds = new Set(bestsellers.map(p => p.id));
  const latestProducts = posters
    .filter(p => !bestsellersIds.has(p.id))
    .slice(0, 4);

  const allSubCats = visibleCategories.filter((category) => category.parent_id).filter((sub) =>
    posters.some((p) => p.category === sub.name)
  );

  const postersMainCat = mainCats.find(c => c.name.toLowerCase() === "posters");
  const posterSubCats = postersMainCat
    ? allSubCats
        .filter(sub => sub.parent_id === postersMainCat.id)
        .map(sub => ({ ...sub, parentName: "Posters" }))
    : [];

  const groupedSeries = posterSubCats.length > 0 ? [
    {
      id: postersMainCat?.id || "posters-group",
      name: "Posters",
      slug: "posters",
      cards: posterSubCats.map(card => {
        let imageUrl = card.image_url || "";
        if (!imageUrl) {
          if (card.name.includes("Automotive")) imageUrl = "/collections/card_automotive.png";
          else if (card.name.includes("Regional") || card.name.includes("Northeast")) imageUrl = "/collections/card_regional.png";
          else if (card.name.includes("Mindset") || card.name.includes("Motivational")) imageUrl = "/collections/card_mindset.png";
          else if (card.name.includes("Zubeen")) imageUrl = "/collections/card_zubeen.png";
        }
        return { ...card, image_url: imageUrl };
      }),
    }
  ] : [];

  return (
    <main className="bg-[var(--color-surface)] text-[var(--color-on-surface)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "NexaDesignLab",
            "url": "https://nexadesignlab.com",
            "logo": "https://nexadesignlab.com/logo.png",
            "description": "Professional photo-quality posters and art prints for automotive enthusiasts, Northeast India culture, and beyond.",
            "sameAs": ["https://instagram.com/nexadesignlab"]
          })
        }}
      />

      {/* 1. HERO */}
      <section className="relative overflow-hidden pt-20 pb-0 md:pt-24 md:pb-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(204,255,0,0.07),transparent_60%)]" />

        <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-8">
          {/* Mobile: stacked. Desktop: side-by-side */}
          <div className="flex flex-col lg:grid lg:grid-cols-12 lg:items-center lg:gap-12">

            {/* Text block */}
            <div className="lg:col-span-6 xl:col-span-5 pb-10 lg:pb-0">
              <div className="mb-4 flex items-center gap-3 text-[9px] font-black uppercase tracking-[0.4em]">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-white/60">
                  Est. 2024
                </span>
                <span className="text-[var(--color-primary)] opacity-70">Design Studio</span>
              </div>

              <h1 className="text-[clamp(2.8rem,9vw,4.5rem)] font-black leading-[0.92] tracking-[-0.04em] text-[var(--color-on-surface)]">
                Premium Posters
                <br />
                <span className="text-[var(--color-primary)]">For What<br className="sm:hidden" /> Drives You.</span>
              </h1>

              <p className="mt-5 max-w-md text-sm leading-7 text-[var(--color-secondary)] opacity-80">
                Automotive, Northeast India, motivational and collector-inspired designs — printed on premium photo paper and shipped across India.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/shop?category=posters"
                  className="inline-flex w-full items-center justify-center rounded-2xl bg-[var(--color-primary)] px-8 py-4 text-xs font-black uppercase tracking-[0.25em] text-black shadow-[0_12px_30px_rgba(204,255,0,0.25)] transition-all duration-300 active:scale-95 sm:w-auto"
                >
                  Shop Posters
                </Link>
                <Link
                  href="/shop"
                  className="inline-flex w-full items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-8 py-4 text-xs font-black uppercase tracking-[0.25em] text-white transition-all duration-300 active:scale-95 sm:w-auto"
                >
                  Explore Collections
                </Link>
              </div>
            </div>

            {/* Image block */}
            <div className="lg:col-span-6 xl:col-span-7">
              {/* Mobile: single full-width image */}
              <div className="relative lg:hidden">
                <div className="relative w-full overflow-hidden rounded-t-[2rem]">
                  <img
                    src="/hero_poster_collectible.png"
                    alt="Premium Art Print"
                    className="w-full object-cover aspect-[4/5]"
                    loading="eager"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-surface)] via-transparent to-transparent" />
                  <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between">
                    <div>
                      <span className="inline-flex rounded-full bg-black/60 px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.2em] text-white backdrop-blur-md border border-white/10">
                        Wall Art
                      </span>
                      <p className="mt-2 text-sm font-black uppercase text-white tracking-tight">Signature Pieces</p>
                    </div>
                    <span className="rounded-full bg-[var(--color-primary)] px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.15em] text-black">
                      New Drop
                    </span>
                  </div>
                </div>
              </div>

              {/* Desktop: two overlapping cards */}
              <div className="hidden lg:flex items-start justify-end gap-4 xl:gap-6">
                <div className="group relative w-[240px] xl:w-[270px] shrink-0 overflow-hidden rounded-[1.5rem] border border-white/10 bg-black shadow-[0_30px_60px_rgba(0,0,0,0.5)] transition-all duration-700 hover:-translate-y-2 hover:shadow-[0_40px_80px_rgba(204,255,0,0.1)]">
                  <img
                    src="/hero_poster_collectible.png"
                    alt="Premium Collectible Art Print"
                    className="w-full object-cover aspect-[3/4] transition-transform duration-[2s] group-hover:scale-[1.03]"
                    loading="eager"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <span className="inline-flex rounded-full bg-black/60 px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.2em] text-white backdrop-blur-md border border-white/10">Wall Art</span>
                    <h3 className="mt-2 text-sm font-black text-white tracking-tight uppercase">Signature Pieces</h3>
                  </div>
                </div>

                <div className="group relative w-[240px] xl:w-[270px] shrink-0 mt-14 overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#0e0f10] shadow-[0_25px_50px_rgba(0,0,0,0.5)] transition-all duration-700 hover:-translate-y-2 hover:shadow-[0_35px_70px_rgba(204,255,0,0.1)]">
                  <img
                    src="/hero_poster_new.png"
                    alt="Premium Spec Print"
                    className="w-full object-cover aspect-[3/4] transition-transform duration-700 group-hover:scale-[1.04]"
                    loading="eager"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <span className="inline-flex rounded-full bg-black/60 px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.2em] text-white backdrop-blur-md border border-white/10">Signature Series</span>
                    <h3 className="mt-2 text-sm font-black text-white tracking-tight uppercase">Precision Layouts</h3>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MARQUEE STRIP */}
      <section className="border-y border-white/[0.05] bg-[#050505] py-4 overflow-hidden">
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes marquee { 0% { transform: translateX(0%); } 100% { transform: translateX(-50%); } }
          .marquee-track { animation: marquee 30s linear infinite; }
        `}} />
        <div className="flex whitespace-nowrap marquee-track">
          {[0, 1].map(i => (
            <div key={i} className="flex items-center space-x-12 text-[10px] font-bold uppercase tracking-[0.3em] text-white/40 mx-8" aria-hidden={i === 1}>
              <span>Premium Print Quality</span>
              <span className="h-1 w-1 rounded-full bg-[var(--color-primary)]" />
              <span>Vivid Photo Printing</span>
              <span className="h-1 w-1 rounded-full bg-[var(--color-primary)]" />
              <span>Ships Across India</span>
              <span className="h-1 w-1 rounded-full bg-[var(--color-primary)]" />
              <span>Glossy &amp; Matte Finish</span>
              <span className="h-1 w-1 rounded-full bg-[var(--color-primary)]" />
              <span>A3+ Format</span>
              <span className="h-1 w-1 rounded-full bg-[var(--color-primary)]" />
              <span>6-Color Printing</span>
            </div>
          ))}
        </div>
      </section>

      {/* 2. BESTSELLERS — hidden when empty */}
      {bestsellers.length > 0 && (
        <section className="relative overflow-hidden bg-[#050505] py-16 sm:py-24">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(204,255,0,0.06),transparent)]" />
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="mb-8 flex items-end justify-between gap-4">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.4em] text-[var(--color-primary)]">The Standard</p>
                <h2 className="mt-2 text-3xl font-black uppercase leading-[0.95] tracking-tighter text-white sm:text-5xl">
                  Bestselling <span className="text-white/15">Series</span>
                </h2>
              </div>
              <Link href="/shop?category=posters" className="shrink-0 text-[10px] font-black uppercase tracking-[0.3em] text-white/30 hover:text-[var(--color-primary)] transition-colors flex items-center gap-1.5 group">
                All <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
              {bestsellers.map((prod) => (
                <Link
                  href={`/posters/${prod.url_slug || prod.id}`}
                  key={prod.id}
                  className="group relative flex flex-col overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#111] shadow-[0_12px_40px_rgba(0,0,0,0.2)] transition-all duration-500 active:scale-[0.98] hover:-translate-y-1 hover:border-[var(--color-primary)]/20"
                >
                  <div className="relative aspect-[3/4] overflow-hidden bg-black">
                    {prod.image_url ? (
                      <img
                        src={prod.image_url}
                        alt={prod.name}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/20">No Image</span>
                      </div>
                    )}
                    <div className="absolute top-3 left-3">
                      <span className="rounded-full bg-[var(--color-primary)] px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.15em] text-black">
                        Bestseller
                      </span>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  </div>
                  <div className="flex flex-col flex-1 gap-2 p-4">
                    <p className="text-[8px] font-black uppercase tracking-[0.3em] text-[var(--color-primary)]">{prod.category || "Poster"}</p>
                    <h3 className="text-xs font-black leading-tight tracking-tight text-white transition-colors group-hover:text-[var(--color-primary)] sm:text-sm">
                      {getProductDisplayName(prod.name)}
                    </h3>
                    <div className="mt-auto flex items-center justify-between pt-3 border-t border-white/5">
                      <span className="font-mono text-sm font-black text-[var(--color-primary)] sm:text-base">₹{prod.base_price?.toFixed(0)}</span>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" className="text-[var(--color-primary)] transition-transform duration-300 group-hover:translate-x-1">
                        <path d="M3 7H11M11 7L7.5 3.5M11 7L7.5 10.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 3. COLLECTIONS — hidden when empty */}
      {groupedSeries.length > 0 && (
        <section id="spectrum" className="relative overflow-hidden border-t border-white/[0.03] bg-[var(--color-surface)] py-16 sm:py-24">
          <div className="mx-auto mb-10 flex max-w-7xl items-end justify-between gap-6 px-5 sm:px-8">
            <div>
              <p className="mb-2 text-[9px] font-black uppercase tracking-[0.4em] text-[var(--color-primary)]">The Collection List</p>
              <h2 className="text-3xl font-black uppercase leading-[0.95] tracking-tighter text-[var(--color-on-surface)] sm:text-5xl">
                Find Your
                <br />
                <span className="text-[var(--color-secondary)]">Discipline</span>
              </h2>
            </div>
            <Link
              href="/shop"
              className="shrink-0 inline-flex items-center gap-2 border border-[var(--color-outline-variant)] px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--color-on-surface)] transition-all duration-300 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
            >
              Browse All
              <svg aria-hidden="true" viewBox="0 0 14 14" className="h-3.5 w-3.5 text-[var(--color-primary)]" fill="none">
                <path d="M3 7H11M11 7L7.5 3.5M11 7L7.5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <CategoryFilmstrip groups={groupedSeries} />
          </div>
        </section>
      )}

      {/* 4. PREMIUM TRUST */}
      <section className="relative overflow-hidden border-t border-white/[0.03] bg-[#0a0a0a] py-16 sm:py-24 text-white">
        <div className="relative z-10 mx-auto max-w-5xl px-5 sm:px-8">
          <div className="mb-12 text-center">
            <p className="text-[9px] font-black uppercase tracking-[0.4em] text-[var(--color-primary)]">Engineering Standards</p>
            <h2 className="mt-3 text-3xl font-black uppercase tracking-tighter sm:text-5xl">
              Premium By <span className="text-white/15">Design</span>
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
            {[
              { icon: "palette", title: "Photo-Quality Prints", body: "Premium glossy or matte photo paper with vivid, accurate color." },
              { icon: "layers", title: "6-Color Printing", body: "Professional photo printing for rich, sharp, true-to-design output." },
              { icon: "workspace_premium", title: "A3+ Format", body: "Large-format prints designed to make an impact on any wall." },
              { icon: "local_shipping", title: "Ships Across India", body: "Carefully packaged and shipped to your door anywhere in India." },
            ].map(({ icon, title, body }) => (
              <div key={title} className="flex flex-col items-center text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-[var(--color-primary)]">
                  <span className="material-symbols-outlined text-[28px]">{icon}</span>
                </div>
                <h3 className="text-xs font-bold uppercase tracking-wide sm:text-sm">{title}</h3>
                <p className="mt-2 text-xs leading-5 text-white/50 sm:text-sm sm:leading-6">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. NEW RELEASES — hidden when empty */}
      {latestProducts.length > 0 && (
        <section className="relative overflow-hidden border-t border-white/[0.03] bg-[var(--color-surface)] px-5 py-16 sm:px-8 sm:py-24">
          <div className="relative z-10 mx-auto max-w-7xl">
            <div className="mb-8 flex items-end justify-between gap-4">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.4em] text-[var(--color-primary)]">The Feed</p>
                <h2 className="mt-2 text-3xl font-black uppercase leading-[0.95] tracking-tighter text-[var(--color-on-surface)] sm:text-5xl">
                  New <span className="text-[var(--color-secondary)]">Releases</span>
                </h2>
              </div>
              <Link href="/shop" className="shrink-0 text-[10px] font-black uppercase tracking-[0.3em] text-[var(--color-secondary)]/40 hover:text-[var(--color-primary)] transition-colors flex items-center gap-1.5 group">
                All <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
              {latestProducts.map((prod) => (
                <Link
                  href={`/posters/${prod.url_slug || prod.id}`}
                  key={prod.id}
                  className="group relative flex flex-col overflow-hidden rounded-[1.5rem] border border-[var(--color-outline-variant)]/30 bg-[var(--color-surface-container-lowest)] transition-all duration-500 active:scale-[0.98] hover:-translate-y-1 hover:border-[var(--color-primary)]/20"
                >
                  <div className="relative aspect-[3/4] overflow-hidden bg-[var(--color-surface-container-low)]">
                    {prod.image_url ? (
                      <img
                        src={prod.image_url}
                        alt={prod.name}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/20">No Image</span>
                      </div>
                    )}
                    <div className="absolute top-3 left-3">
                      <span className="rounded-full bg-white/90 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.15em] text-black">New</span>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                  </div>
                  <div className="flex flex-col flex-1 gap-2 p-4">
                    <p className="text-[8px] font-black uppercase tracking-[0.3em] text-[var(--color-primary)]">{prod.category || "Poster"}</p>
                    <h3 className="text-xs font-black leading-tight tracking-tight text-[var(--color-on-surface)] transition-colors group-hover:text-[var(--color-primary)] sm:text-sm">
                      {getProductDisplayName(prod.name)}
                    </h3>
                    <div className="mt-auto flex items-center justify-between pt-3 border-t border-[var(--color-outline-variant)]/20">
                      <span className="font-mono text-sm font-black text-[var(--color-on-surface)] sm:text-base">₹{prod.base_price?.toFixed(0)}</span>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" className="text-[var(--color-primary)] transition-transform duration-300 group-hover:translate-x-1">
                        <path d="M3 7H11M11 7L7.5 3.5M11 7L7.5 10.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 6. COMPLETE THE SET */}
      <section className="relative overflow-hidden border-t border-white/[0.03] bg-[var(--color-surface)] py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="relative overflow-hidden rounded-[2rem] border border-[var(--color-outline-variant)]/20 bg-[var(--color-surface-container-lowest)] p-8 sm:p-12 lg:p-16">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(204,255,0,0.06),transparent_50%)]" />
            <div className="relative z-10 flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
              <div className="max-w-xl">
                <span className="inline-flex rounded-full border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.3em] text-[var(--color-primary)]">
                  Tier Pairings
                </span>
                <h2 className="mt-4 text-3xl font-black uppercase leading-[0.95] tracking-tighter text-[var(--color-on-surface)] sm:text-5xl">
                  Complete The Set
                </h2>
                <p className="mt-4 text-sm leading-7 text-[var(--color-secondary)] opacity-80">
                  Pair premium photo prints with complementary designs from the same series — and save on the set.
                </p>
              </div>
              <Link
                href="/shop?category=bundles"
                className="inline-flex shrink-0 items-center justify-center rounded-2xl bg-[var(--color-on-background)] px-8 py-4 text-sm font-black uppercase tracking-[0.22em] text-[var(--color-primary-container)] shadow-[0_12px_30px_rgba(0,0,0,0.15)] transition-all duration-300 active:scale-95 hover:-translate-y-0.5 w-full md:w-auto"
              >
                Shop Bundles
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 7. FINAL CTA */}
      <section className="relative overflow-hidden border-t border-white/[0.05] bg-[#050505] px-5 py-16 sm:px-8 sm:py-24 text-white">
        <div className="mx-auto max-w-7xl">
          <div className="group relative overflow-hidden rounded-[2.5rem] border border-white/[0.08] bg-[#0a0a0a] px-6 py-16 sm:px-12 sm:py-20 lg:px-20">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(204,255,0,0.08),transparent_50%)]" />
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="mb-6 flex items-center gap-4">
                <div className="h-px w-8 bg-[var(--color-primary)] opacity-40" />
                <p className="text-[9px] font-black uppercase tracking-[0.4em] text-[var(--color-primary)]">Claim Your Space</p>
                <div className="h-px w-8 bg-[var(--color-primary)] opacity-40" />
              </div>

              <h2 className="text-[clamp(2.2rem,7vw,5rem)] font-black uppercase leading-[0.88] tracking-[-0.05em]">
                Discover Posters
                <br />
                <span className="text-white/20">Worth Displaying</span>
              </h2>

              <p className="mt-6 max-w-lg text-sm leading-7 text-white/50 sm:text-base">
                Join the collective of individuals who value precision and aesthetic impact. Secure your premium art prints today.
              </p>

              <div className="mt-10 flex flex-col gap-3 w-full sm:flex-row sm:justify-center sm:w-auto">
                <Link
                  href="/shop?category=posters"
                  className="inline-flex items-center justify-center rounded-2xl bg-[var(--color-primary)] px-10 py-4 text-xs font-black uppercase tracking-[0.25em] text-black shadow-[0_16px_40px_rgba(204,255,0,0.2)] transition-all duration-300 active:scale-95 hover:-translate-y-1"
                >
                  Shop Posters
                </Link>
                <Link
                  href="/shop"
                  className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] px-10 py-4 text-xs font-black uppercase tracking-[0.25em] text-white transition-all duration-300 active:scale-95 hover:bg-white/[0.08]"
                >
                  Browse Catalog
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SEO copy */}
      <section className="bg-[#050606] border-t border-white/[0.02] py-8 text-center">
        <div className="mx-auto max-w-4xl px-5">
          <p className="text-[9px] leading-5 text-white/15 font-medium uppercase tracking-[0.15em]">
            At NexaDesignLab, we bridge the gap between profound passion and premium interior design. Our posters and art prints are crafted for those who appreciate aesthetic impact — bringing personality and scale into your space. Every design is printed fresh on premium photo paper and made to stand out.
          </p>
        </div>
      </section>
    </main>
  );
}
