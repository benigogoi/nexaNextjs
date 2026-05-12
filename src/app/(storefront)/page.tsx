import Link from "next/link";

import CategoryFilmstrip from "@/components/CategoryFilmstrip";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

export const revalidate = 0;

export const metadata = {
  title: "Premium Wall Posters & Collectible Art Prints | NexaPrint",
  description: "Elevate your space with museum-grade framed posters and archival quality collectible art prints. Premium automotive posters and rear windshield decals across India.",
  keywords: "premium wall posters, collectible art prints, framed posters India, automotive posters, rear windshield decals",
  openGraph: {
    title: "Premium Wall Posters & Collectible Art Prints | NexaPrint",
    description: "Museum-grade framed posters and archival quality collectible art prints.",
    type: "website",
    url: "https://nexaprint.in",
  }
};

export default async function Home() {
  const supabase = await createServerSupabaseClient();

  const { data: dbCategories } = await supabase.from("categories").select("*").order("name");
  const visibleCategories = dbCategories?.filter((category) => category.is_visible !== false) || [];
  const mainCats = visibleCategories.filter((category) => !category.parent_id);

  const { data: dbProducts } = await supabase
    .from("products")
    .select("*")
    .eq("status", "Active")
    .eq("bundle_only", false)
    .order("created_at", { ascending: false });
    
  const allProducts = dbProducts || [];
  
  // Filter products for Posters and Decals using the new "critical" schema
  const posters = allProducts.filter((p) => 
    p.category_type === 'poster' || 
    (p.parent_category?.toLowerCase().includes("poster")) ||
    (!p.category_type && !p.parent_category && (p.category?.toLowerCase().includes("poster") || p.category?.toLowerCase().includes("series")))
  ).filter(p => p.category_type !== 'decal' && p.category_type !== 'sticker');
  
  const decals = allProducts.filter((p) => 
    p.category_type === 'decal' || 
    p.category_type === 'sticker' ||
    p.parent_category?.toLowerCase().includes("decal") ||
    p.parent_category?.toLowerCase().includes("sticker") ||
    (!p.category_type && !p.parent_category && (p.category?.toLowerCase().includes("decal") || p.category?.toLowerCase().includes("sticker")))
  );

  const bestsellers = posters.slice(0, 4);
  const latestProducts = posters.slice(0, 4); 
  const featuredDecals = decals.slice(0, 4);

  const allSubCats = visibleCategories.filter((category) => category.parent_id);
  
  // Sort categories to put Posters first
  const sortedMainCats = [...mainCats].sort((a, b) => {
    if (a.name.toLowerCase().includes("poster")) return -1;
    if (b.name.toLowerCase().includes("poster")) return 1;
    return 0;
  });

  const groupedSeries = sortedMainCats
    .map((main) => ({
      ...main,
      cards: allSubCats
        .filter((sub) => sub.parent_id === main.id)
        .map((sub) => ({ ...sub, parentName: main.name })),
    }))
    .filter((group) => group.cards.length > 0);

  return (
    <main className="pt-28 md:pt-24 bg-[var(--color-surface)] text-[var(--color-on-surface)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "NexaPrint",
            "url": "https://nexaprint.in",
            "logo": "https://nexaprint.in/logo.png",
            "description": "Premium wall posters and collectible art prints for automotive enthusiasts.",
            "sameAs": [
              "https://instagram.com/nexaprint"
            ]
          })
        }}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            "itemListElement": bestsellers.map((prod, index) => ({
              "@type": "ListItem",
              "position": index + 1,
              "url": `https://nexaprint.in/products/${prod.id}`,
              "name": prod.name,
              "image": prod.image_url,
            }))
          })
        }}
      />

      {/* 1. HERO SECTION (Split-Category) */}
      <section className="relative overflow-hidden px-5 pt-16 pb-16 sm:px-8 md:pt-20 md:pb-24 flex items-center mt-[-20px]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(204,255,0,0.06),transparent_55%)]" />
        <div className="relative z-10 mx-auto grid max-w-7xl w-full gap-10 lg:grid-cols-12 lg:items-center xl:gap-16">
          <div className="lg:col-span-6 xl:col-span-5">
            <div className="mb-4 flex flex-wrap items-center gap-3 text-[9px] font-black uppercase tracking-[0.4em] text-[var(--color-primary)]">
              <span className="rounded-full border border-[var(--color-outline-variant)]/20 bg-[var(--color-surface-container-highest)]/30 px-3 py-1 text-[var(--color-on-surface)] shadow-sm backdrop-blur-md">
                Est. 2024
              </span>
              <span className="text-[var(--color-secondary)] opacity-70">Archival Series</span>
            </div>
            
            <h1 className="max-w-2xl text-[clamp(2.5rem,5.5vw,4rem)] font-black leading-[0.95] tracking-[-0.05em] text-[var(--color-on-surface)]">
              Precision Art 
              <br />
              <span className="text-[var(--color-primary)]">
                For The Driven.
              </span>
            </h1>
            
            <p className="mt-5 max-w-lg text-sm leading-7 text-[var(--color-secondary)] sm:text-base opacity-80">
              Museum-grade framed prints and precision-cut windshield decals. Engineering the visual legacy of automotive culture into your personal space.
            </p>
            
            <div className="mt-8 flex flex-col flex-wrap gap-4 sm:flex-row">
              <Link href="/shop?category=posters" className="inline-flex min-w-[210px] w-full items-center justify-center rounded-xl bg-[var(--color-on-background)] px-8 py-4 text-center text-xs font-black uppercase tracking-[0.25em] text-[var(--color-primary-container)] shadow-[0_15px_35px_rgba(0,0,0,0.2)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(204,255,0,0.15)] sm:w-auto">
                Shop Posters
              </Link>
              <Link href="/shop?category=decals" className="inline-flex min-w-[210px] w-full items-center justify-center rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface)]/50 px-8 py-4 text-center text-xs font-black uppercase tracking-[0.25em] text-[var(--color-on-surface)] backdrop-blur-sm transition-all duration-300 hover:bg-[var(--color-surface-container-highest)] hover:-translate-y-1 sm:w-auto">
                Explore Decals
              </Link>
            </div>
          </div>

          <div className="mt-8 lg:col-span-6 xl:col-span-7">
            <div className="relative flex flex-col sm:flex-row items-center justify-center lg:justify-end gap-4 sm:gap-6">
              {/* Center/Left: Poster */}
              <div className="group relative w-full max-w-[260px] overflow-hidden rounded-[1.25rem] border border-white/10 bg-black shadow-[0_30px_60px_rgba(0,0,0,0.4)] transition-all duration-700 hover:shadow-[0_40px_80px_rgba(204,255,0,0.1)] z-10 transform hover:-translate-y-1">
                <img 
                  src="/hero_poster_collectible.png" 
                  alt="Premium Collectible Art Print" 
                  className="w-full object-cover aspect-[3/4] transition-transform duration-[2s] group-hover:scale-[1.03]"
                  loading="eager"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
                <div className="absolute bottom-4 left-4 right-4">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.2em] text-white backdrop-blur-md border border-white/10">
                    Wall Art
                  </span>
                  <h3 className="mt-2 text-base font-black text-white tracking-tight uppercase">Archival Pieces</h3>
                </div>
              </div>
              
              {/* Right/Background: Decal */}
              <div className="group relative w-full max-w-[290px] overflow-hidden rounded-[1.25rem] border border-white/10 bg-[#0e0f10] shadow-[0_25px_50px_rgba(0,0,0,0.5)] transition-all duration-700 hover:shadow-[0_35px_70px_rgba(204,255,0,0.1)] z-20 transform hover:-translate-y-1 sm:-ml-10 sm:mt-10 lg:-ml-14 lg:mt-14">
                <img 
                  src="/hero_decal_new.png" 
                  alt="Rear Windshield Decal" 
                  className="w-full object-cover aspect-[4/3] transition-transform duration-700 group-hover:scale-[1.04]"
                  loading="eager"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
                <div className="absolute bottom-4 left-4 right-4">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.2em] text-white backdrop-blur-md border border-white/10">
                    Automotive
                  </span>
                  <h3 className="mt-2 text-lg font-black text-white tracking-tight uppercase">Windshield Decals</h3>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF STRIP */}
      <section className="border-y border-white/[0.05] bg-[#050505] py-4 overflow-hidden">
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes marquee {
            0% { transform: translateX(0%); }
            100% { transform: translateX(-50%); }
          }
          .animate-marquee-custom {
            animation: marquee 30s linear infinite;
          }
        `}} />
        <div className="flex whitespace-nowrap animate-marquee-custom">
          <div className="flex items-center space-x-16 text-[10px] font-bold uppercase tracking-[0.3em] text-white/40 mx-8">
            <span>5000+ Collectors</span>
            <span className="h-1 w-1 rounded-full bg-[var(--color-primary)]" />
            <span>Precision Crafted</span>
            <span className="h-1 w-1 rounded-full bg-[var(--color-primary)]" />
            <span>Ships Across India</span>
            <span className="h-1 w-1 rounded-full bg-[var(--color-primary)]" />
            <span>Collector Favorites</span>
          </div>
          <div className="flex items-center space-x-16 text-[10px] font-bold uppercase tracking-[0.3em] text-white/40 mx-8" aria-hidden="true">
            <span>5000+ Collectors</span>
            <span className="h-1 w-1 rounded-full bg-[var(--color-primary)]" />
            <span>Precision Crafted</span>
            <span className="h-1 w-1 rounded-full bg-[var(--color-primary)]" />
            <span>Ships Across India</span>
            <span className="h-1 w-1 rounded-full bg-[var(--color-primary)]" />
            <span>Collector Favorites</span>
          </div>
        </div>
      </section>

      {/* 2. BESTSELLERS SECTION */}
      <section className="relative overflow-hidden border-t border-white/[0.03] bg-[#050505] py-20 sm:py-24">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(204,255,0,0.06),transparent)]" />
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="mb-10 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.4em] text-[var(--color-primary)]">
                The Standard
              </p>
              <h2 className="mt-3 text-4xl font-black uppercase leading-[0.95] tracking-tighter text-white sm:text-5xl">
                Bestselling <span className="text-[#222]">Series</span>
              </h2>
            </div>
            <Link href="/shop?category=posters" className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 hover:text-[var(--color-primary)] transition-all flex items-center gap-2 group">
              Browse All Series 
              <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {bestsellers.length > 0 ? (
              bestsellers.map((prod, index) => (
                <Link
                  href={`/products/${prod.id}`}
                  key={prod.id}
                  className="group relative flex flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[#111] shadow-[0_12px_40px_rgba(0,0,0,0.2)] transition-all duration-500 hover:-translate-y-2 hover:border-[var(--color-primary)]/20 hover:shadow-[0_32px_64px_rgba(0,0,0,0.4)]"
                >
                  <div className="relative aspect-[4/5] overflow-hidden bg-black">
                    {prod.image_url ? (
                      <img 
                        src={prod.image_url} 
                        alt={prod.name} 
                        className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[#333]">
                        <span className="text-[10px] font-black uppercase tracking-widest">No Image</span>
                      </div>
                    )}
                    
                    {/* Badge */}
                    <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between p-4">
                      <span className="rounded-full bg-[var(--color-primary)] px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.15em] text-[var(--color-on-primary-fixed)] shadow-sm backdrop-blur-md">
                        Bestseller
                      </span>
                    </div>

                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />
                  </div>

                  <div className="flex flex-col flex-1 gap-4 p-5 sm:p-6 bg-[#111]">
                    <div className="flex flex-col gap-1.5">
                      <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[var(--color-primary)]">
                        {prod.category || "Poster"}
                      </p>
                      <h3 className="text-sm sm:text-lg font-black leading-tight tracking-tight text-white transition-colors group-hover:text-[var(--color-primary)]">
                        {prod.name}
                      </h3>
                    </div>

                    <div className="mt-auto flex items-center justify-between pt-4 border-t border-white/5">
                      <span className="font-mono text-sm sm:text-xl font-black text-[var(--color-primary)]">
                        ₹{prod.base_price?.toFixed(0)}
                      </span>
                      <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-white/40">
                        <span className="hidden sm:inline">Details</span>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" className="text-[var(--color-primary)] transition-transform duration-300 group-hover:translate-x-1">
                          <path d="M3 7H11M11 7L7.5 3.5M11 7L7.5 10.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="col-span-full text-center py-12 text-white/40">
                No bestsellers found.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 3. COLLECTIONS / SERIES */}
      <section id="spectrum" className="relative overflow-hidden border-t border-white/[0.03] bg-[var(--color-surface)] py-20 sm:py-24">
        <div className="mx-auto mb-12 flex max-w-7xl items-end justify-between gap-8 px-5 sm:px-8">
          <div className="flex items-end gap-6">
            <div className="hidden h-16 w-1 shrink-0 rounded-full bg-[var(--color-primary)] sm:block opacity-60" />
            <div>
              <p className="mb-2 text-[9px] font-black uppercase tracking-[0.4em] text-[var(--color-primary)]">
                The Collection List
              </p>
              <h2 className="text-4xl font-black uppercase leading-[0.95] tracking-tighter text-[var(--color-on-surface)] sm:text-5xl">
                Find Your
                <br />
                <span className="text-[var(--color-secondary)]">Discipline</span>
              </h2>
            </div>
          </div>

          <div className="hidden shrink-0 flex-col items-end gap-3 md:flex">
            <span className="text-[10px] font-mono tracking-widest text-[var(--color-secondary)]">
              {groupedSeries.length} collections available
            </span>
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 border border-[var(--color-outline-variant)] px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--color-on-surface)] transition-all duration-300 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
            >
              Browse All
              <svg aria-hidden="true" viewBox="0 0 14 14" className="h-3.5 w-3.5 text-[var(--color-primary)]" fill="none">
                <path d="M3 7H11M11 7L7.5 3.5M11 7L7.5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <CategoryFilmstrip groups={groupedSeries} />
        </div>
      </section>

      {/* 4. PREMIUM TRUST SECTION */}
      <section className="relative overflow-hidden border-t border-white/[0.03] bg-[#0a0a0a] py-20 sm:py-28 text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(204,255,0,0.04),transparent_45%)]" />
        <div className="relative z-10 mx-auto max-w-5xl px-5 text-center sm:px-8">
          <p className="text-[9px] font-black uppercase tracking-[0.4em] text-[var(--color-primary)]">
            Engineering Standards
          </p>
          <h2 className="mt-4 text-3xl font-black uppercase tracking-tighter sm:text-5xl">
            Built for the <span className="text-[#222]">Purist</span>
          </h2>
          
          <div className="mt-16 grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col items-center text-center">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-[var(--color-primary)]">
                <span className="material-symbols-outlined text-[32px]">palette</span>
              </div>
              <h3 className="text-lg font-bold uppercase tracking-wide">Museum-Grade</h3>
              <p className="mt-3 text-sm leading-6 text-white/60">
                Heavy archival matte paper preserves deep color resolution.
              </p>
            </div>
            
            <div className="flex flex-col items-center text-center">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-[var(--color-primary)]">
                <span className="material-symbols-outlined text-[32px]">layers</span>
              </div>
              <h3 className="text-lg font-bold uppercase tracking-wide">Precision-Cut</h3>
              <p className="mt-3 text-sm leading-6 text-white/60">
                Weatherproof vehicle decals tailored for extreme settings.
              </p>
            </div>
            
            <div className="flex flex-col items-center text-center">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-[var(--color-primary)]">
                <span className="material-symbols-outlined text-[32px]">workspace_premium</span>
              </div>
              <h3 className="text-lg font-bold uppercase tracking-wide">Collector Tier</h3>
              <p className="mt-3 text-sm leading-6 text-white/60">
                Enthusiast details aligned accurately for edge spec builds.
              </p>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-[var(--color-primary)]">
                <span className="material-symbols-outlined text-[32px]">local_shipping</span>
              </div>
              <h3 className="text-lg font-bold uppercase tracking-wide">India Shipping</h3>
              <p className="mt-3 text-sm leading-6 text-white/60">
                Secure courier packages mapped successfully across regions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. COLLECTOR INSTALLATIONS */}
      <section className="relative overflow-hidden border-t border-white/[0.03] bg-[#050505] py-20 sm:py-28 text-white">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="mb-12 text-center">
            <p className="text-[9px] font-black uppercase tracking-[0.4em] text-[var(--color-primary)]">
              Field Reports
            </p>
            <h2 className="mt-4 text-4xl font-black uppercase tracking-tighter sm:text-5xl">
              Collector <span className="text-[#222]">Installations</span>
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <div className="group relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#111] aspect-[4/3] shadow-2xl">
              <img 
                src="/installation_loft.png" 
                alt="Collector Loft Installation" 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]" 
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
              <div className="absolute bottom-6 left-6">
                <span className="text-xs font-bold tracking-wider text-white/90">Industrial Loft, Mumbai</span>
              </div>
            </div>
            
            <div className="group relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#111] aspect-[4/3] shadow-2xl">
              <img 
                src="/installation_office.png" 
                alt="Home Office Installation" 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]" 
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
              <div className="absolute bottom-6 left-6">
                <span className="text-xs font-bold tracking-wider text-white/90">Minimalist Studio, Bangalore</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. NEW ARRIVALS */}
      <section className="relative overflow-hidden border-t border-white/[0.03] bg-[var(--color-surface)] px-5 py-20 sm:px-8 sm:py-28">
        <div className="relative z-10 mx-auto max-w-7xl">
          <div className="mb-12 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.4em] text-[var(--color-primary)]">
                The Feed
              </p>
              <h2 className="mt-3 text-4xl font-black uppercase leading-[0.95] tracking-tighter text-[var(--color-on-surface)] sm:text-5xl">
                New <span className="text-[var(--color-secondary)]">Releases</span>
              </h2>
            </div>
            <Link href="/shop" className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--color-secondary)]/40 hover:text-[var(--color-primary)] transition-all flex items-center gap-2 group">
              Access Full Catalog 
              <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {latestProducts.length > 0 ? (
              latestProducts.map((prod, index) => (
                <Link
                  href={`/products/${prod.id}`}
                  key={prod.id}
                  className="group relative flex flex-col overflow-hidden rounded-[2rem] border border-[var(--color-outline-variant)]/30 bg-[var(--color-surface-container-lowest)] shadow-[0_12px_40px_rgba(0,0,0,0.04)] transition-all duration-500 hover:-translate-y-2 hover:border-[var(--color-primary)]/20 hover:shadow-[0_32px_64px_rgba(0,0,0,0.08)]"
                >
                  <div className="relative aspect-[4/5] overflow-hidden bg-[var(--color-surface-container-low)]">
                    {prod.image_url ? (
                      <img 
                        src={prod.image_url} 
                        alt={prod.name} 
                        className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[#555]">
                        <span className="text-[10px] font-black uppercase tracking-widest">No Image</span>
                      </div>
                    )}
                    
                    {/* Badge */}
                    <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between p-4">
                      <span className="rounded-full bg-white/90 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.15em] text-black shadow-sm backdrop-blur-md">
                        New Arrival
                      </span>
                    </div>

                    <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent opacity-60" />
                  </div>

                  <div className="flex flex-col flex-1 gap-4 p-5 sm:p-6">
                    <div className="flex flex-col gap-1.5">
                      <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[var(--color-primary)]">
                        {prod.category || "Poster"}
                      </p>
                      <h3 className="text-sm sm:text-lg font-black leading-tight tracking-tight text-[var(--color-on-surface)] transition-colors group-hover:text-[var(--color-primary)]">
                        {prod.name}
                      </h3>
                    </div>

                    <div className="mt-auto flex items-center justify-between pt-4 border-t border-[var(--color-outline-variant)]/20">
                      <span className="font-mono text-sm sm:text-xl font-black text-[var(--color-on-surface)]">
                        ₹{prod.base_price?.toFixed(0)}
                      </span>
                      <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-[var(--color-secondary)]">
                        <span className="hidden sm:inline">Details</span>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" className="text-[var(--color-primary)] transition-transform duration-300 group-hover:translate-x-1">
                          <path d="M3 7H11M11 7L7.5 3.5M11 7L7.5 10.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="col-span-full text-center py-12 text-[var(--color-secondary)]">
                Syncing inventory...
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 7. DECALS AS SECONDARY CATEGORY */}
      <section className="relative overflow-hidden border-t border-white/[0.03] bg-[#0a0a0a] py-20 sm:py-28 text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_80%_50%,rgba(204,255,0,0.05),transparent)]" />
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="mb-12 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.4em] text-[var(--color-primary)]">
                Exterior Elements
              </p>
              <h2 className="mt-3 text-4xl font-black uppercase leading-[0.95] tracking-tighter text-white sm:text-5xl">
                Vehicle <span className="text-[#222]">Decals</span>
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-white/40 sm:text-base opacity-80">
                Weatherproof performance vinyl. Precision statements engineered for high-contrast windshield and chassis application.
              </p>
            </div>
            <Link href="/shop?category=decals" className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 hover:text-[var(--color-primary)] transition-all flex items-center gap-2 group">
              View All Decals
              <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {featuredDecals.length > 0 ? (
              featuredDecals.map((prod, index) => (
                <Link
                  href={`/products/${prod.id}`}
                  key={prod.id}
                  className="group relative flex flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[#111] shadow-[0_12px_40px_rgba(0,0,0,0.2)] transition-all duration-500 hover:-translate-y-2 hover:border-[var(--color-primary)]/20 hover:shadow-[0_32px_64px_rgba(0,0,0,0.4)]"
                >
                  <div className="relative aspect-[4/5] overflow-hidden bg-black">
                    {prod.image_url ? (
                      <img 
                        src={prod.image_url} 
                        alt={prod.name} 
                        className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[#333]">
                        <span className="text-[10px] font-black uppercase tracking-widest">No Image</span>
                      </div>
                    )}
                    
                    {/* Badge */}
                    <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between p-4">
                      <span className="rounded-full bg-[var(--color-primary-container)] px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.15em] text-[var(--color-on-primary-fixed)] shadow-sm backdrop-blur-md">
                        Decal
                      </span>
                    </div>

                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />
                  </div>

                  <div className="flex flex-col flex-1 gap-4 p-5 sm:p-6 bg-[#111]">
                    <div className="flex flex-col gap-1.5">
                      <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[var(--color-primary)]">
                        {prod.category || "Decal"}
                      </p>
                      <h3 className="text-sm sm:text-lg font-black leading-tight tracking-tight text-white transition-colors group-hover:text-[var(--color-primary)]">
                        {prod.name}
                      </h3>
                    </div>

                    <div className="mt-auto flex items-center justify-between pt-4 border-t border-white/5">
                      <span className="font-mono text-sm sm:text-xl font-black text-[var(--color-primary)]">
                        ₹{prod.base_price?.toFixed(0)}
                      </span>
                      <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-white/40">
                        <span className="hidden sm:inline">Details</span>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" className="text-[var(--color-primary)] transition-transform duration-300 group-hover:translate-x-1">
                          <path d="M3 7H11M11 7L7.5 3.5M11 7L7.5 10.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="col-span-full grid grid-cols-1 sm:grid-cols-3 gap-6 mt-4">
                <div className="group relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#0e0f10] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.3)]">
                  <div className="relative aspect-video overflow-hidden rounded-[1.5rem] bg-[#050505] flex items-center justify-center border border-white/[0.03]">
                    <div className="text-center p-4">
                      <span className="text-[28px] font-black text-white/15 tracking-[0.2em] uppercase">TRACK SERIES</span>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
                  </div>
                  <div className="mt-6 flex flex-col h-full justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-white tracking-wide">Track Silhouettes</h3>
                      <p className="mt-2 text-xs text-white/50 leading-relaxed">Precision-cut outlines of iconic global circuits for your rear glass.</p>
                    </div>
                    <Link href="/shop?category=decals" className="mt-6 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-primary)] hover:text-white transition-colors">
                      Explore Series &rarr;
                    </Link>
                  </div>
                </div>
                
                <div className="group relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#0e0f10] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.3)]">
                  <div className="relative aspect-video overflow-hidden rounded-[1.5rem] bg-[#050505] flex items-center justify-center border border-white/[0.03]">
                    <div className="text-center p-4">
                      <span className="text-[20px] font-black text-white/15 tracking-[0.3em] uppercase">BANNER</span>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
                  </div>
                  <div className="mt-6 flex flex-col h-full justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-white tracking-wide">Sunstrip Typography</h3>
                      <p className="mt-2 text-xs text-white/50 leading-relaxed">High-impact text statements designed for windshield alignment.</p>
                    </div>
                    <Link href="/shop?category=decals" className="mt-6 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-primary)] hover:text-white transition-colors">
                      Explore Banners &rarr;
                    </Link>
                  </div>
                </div>
                
                <div className="group relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#0e0f10] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.3)]">
                  <div className="relative aspect-video overflow-hidden rounded-[1.5rem] bg-[#050505] flex items-center justify-center border border-white/[0.03]">
                    <div className="text-center p-4 flex flex-wrap gap-2 justify-center opacity-20">
                      <div className="h-8 w-8 rounded-full border-2 border-white" />
                      <div className="h-8 w-8 border-2 border-white rotate-45" />
                      <div className="h-8 w-8 border-2 border-white" />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
                  </div>
                  <div className="mt-6 flex flex-col h-full justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-white tracking-wide">Enthusiast Icons</h3>
                      <p className="mt-2 text-xs text-white/50 leading-relaxed">Minimalist visual accents for body panels and quarter glass.</p>
                    </div>
                    <Link href="/shop?category=decals" className="mt-6 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-primary)] hover:text-white transition-colors">
                      Explore Icons &rarr;
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 8. BUNDLE / AOV SECTION */}
      <section className="relative overflow-hidden border-t border-white/[0.03] bg-[var(--color-surface)] py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="relative overflow-hidden rounded-[2.5rem] border border-[var(--color-outline-variant)]/30 bg-[var(--color-surface-container-lowest)] p-8 shadow-[0_30px_70px_rgba(0,0,0,0.04)] sm:p-12 lg:p-20">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(204,255,0,0.05),transparent_45%)]" />
            
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-10 items-center">
              <div className="md:col-span-6 max-w-xl">
                <span className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary-container)]/15 px-3 py-1 text-[9px] font-black uppercase tracking-[0.3em] text-[var(--color-primary)] mb-5 border border-[var(--color-primary)]/10">
                  Tier Pairings
                </span>
                <h2 className="text-4xl font-black uppercase leading-[0.95] tracking-tighter text-[var(--color-on-surface)] sm:text-5xl">
                  Complete 
                  <br />
                  The Set
                </h2>
                <p className="mt-5 text-sm leading-7 text-[var(--color-secondary)] sm:text-base opacity-80">
                  Engineered synergies. Pair museum-grade prints with chassis-matched companion decals for a unified automotive aesthetic.
                </p>
                <div className="mt-8">
                  <Link href="/shop?category=bundles" className="inline-flex items-center justify-center rounded-full bg-[var(--color-on-background)] px-8 py-4 text-sm font-black uppercase tracking-[0.22em] text-[var(--color-primary-container)] shadow-[0_12px_30px_rgba(0,0,0,0.1)] transition-transform duration-200 hover:-translate-y-0.5">
                    Shop Bundles
                  </Link>
                </div>
              </div>
              
              <div className="md:col-span-6 flex items-center justify-center relative">
                <div className="relative w-full max-w-[320px] aspect-[3/4] rounded-[1.5rem] overflow-hidden border border-[var(--color-outline-variant)] bg-black shadow-xl">
                  <img src="/hero_poster_collectible.png" alt="Premium Poster" className="w-full h-full object-cover opacity-90" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                </div>
                
                <div className="absolute -bottom-4 -right-4 w-[200px] aspect-video rounded-[1rem] overflow-hidden border border-white/20 bg-[#0a0a0a] shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-300">
                  <div className="absolute inset-0 bg-[#111] flex items-center justify-center">
                    <span className="text-[12px] font-black text-white/20 tracking-[0.2em] uppercase">TRACK OUTLINE</span>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <div className="absolute bottom-2 left-3">
                    <span className="text-[8px] font-bold uppercase tracking-wider text-[var(--color-primary)]">Windshield Companion</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 9. FINAL CTA */}
      <section className="relative overflow-hidden border-t border-white/[0.05] bg-[#050505] px-5 py-20 sm:px-8 sm:py-24 text-white">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="group relative overflow-hidden rounded-[3rem] border border-white/[0.08] bg-[#0a0a0a] px-6 py-16 shadow-[0_40px_100px_rgba(0,0,0,0.4)] sm:px-12 sm:py-20 lg:px-20 lg:py-24">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(204,255,0,0.08),transparent_45%)]" />
            <div className="pointer-events-none absolute inset-0 bg-[#000]/20 mix-blend-overlay" />
            
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="mb-8 flex items-center gap-4">
                <div className="h-px w-8 bg-[var(--color-primary)] opacity-40" />
                <p className="text-[9px] font-black uppercase tracking-[0.4em] text-[var(--color-primary)]">
                  Claim Your Space
                </p>
                <div className="h-px w-8 bg-[var(--color-primary)] opacity-40" />
              </div>
              
              <h2 className="text-[clamp(2.5rem,7vw,5.5rem)] font-black uppercase leading-[0.85] tracking-[-0.06em]">
                Ready to 
                <br />
                <span className="text-white/20 transition-colors duration-700 group-hover:text-white/40">Collect?</span>
              </h2>
              
              <p className="mt-6 max-w-xl text-base leading-7 text-white/50 sm:text-lg opacity-80">
                Join the collective of automotive enthusiasts who value precision design. Secure your premium art prints today.
              </p>
              
              <div className="mt-12 flex flex-col gap-4 sm:flex-row sm:justify-center w-full sm:w-auto">
                <Link
                  href="/shop?category=posters"
                  className="inline-flex items-center justify-center rounded-xl bg-[var(--color-primary-container)] px-10 py-4.5 text-center text-xs font-black uppercase tracking-[0.25em] text-[var(--color-on-primary-fixed)] shadow-[0_20px_40px_rgba(204,255,0,0.15)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_25px_50px_rgba(204,255,0,0.25)]"
                >
                  Shop Posters
                </Link>
                <Link
                  href="/shop?category=decals"
                  className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-10 py-4.5 text-center text-xs font-black uppercase tracking-[0.25em] text-white backdrop-blur-sm transition-all duration-300 hover:bg-white/[0.08] hover:-translate-y-1"
                >
                  Shop Decals
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SEO Supporting Keyword Copy */}
      <section className="bg-[#050606] border-t border-white/[0.02] py-8 text-center">
        <div className="mx-auto max-w-4xl px-5">
          <p className="text-[9px] leading-5 text-white/15 font-medium uppercase tracking-[0.15em]">
            At NexaDesignLab, we bridge the gap between automotive passion and premium interior design. Our posters and collectible prints are crafted for those who appreciate both performance and aesthetics—bringing the spirit of machines into your space. Whether it’s framed wall art or high-durability decals, everything we create is built to stand out and last.
          </p>
        </div>
      </section>
    </main>
  );
}
