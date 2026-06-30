import Link from "next/link";

export type CollectionData = {
  title: string;
  slug: string;
  query?: string;
  count: number;
  description: string;
  image_url: string;
};

export default function FeaturedCollections({ collections }: { collections: CollectionData[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
      {collections.map((col) => (
        <Link 
          key={col.title}
          href={col.query ? `/shop?q=${col.query}` : `/shop?category=${col.slug}`}
          className="group relative flex flex-col justify-end overflow-hidden rounded-[2rem] border border-white/[0.08] bg-[#0a0b0c] min-h-[400px] sm:min-h-[480px] shadow-[0_20px_50px_rgba(0,0,0,0.4)] transition-all duration-500 hover:-translate-y-2 hover:border-[var(--color-primary)]/40 hover:shadow-[0_30px_70px_rgba(204,255,0,0.12)]"
        >
          <div className="absolute inset-0 bg-black">
            <img 
              src={col.image_url} 
              alt={col.title} 
              className="h-full w-full object-cover opacity-50 transition-all duration-1000 group-hover:scale-[1.06] group-hover:opacity-75"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/90" />
          </div>

          <div className="relative z-10 p-8 sm:p-10 flex flex-col h-full justify-end">
            <div className="mb-5">
              <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.25em] text-[var(--color-primary)] backdrop-blur-md shadow-sm">
                {col.count > 0 ? `${col.count} Posters` : "Coming Soon"}
              </span>
            </div>
            
            <h3 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-white mb-4 drop-shadow-xl">
              {col.title}
            </h3>
            
            <p className="text-sm sm:text-base leading-relaxed text-white/70 mb-8 max-w-md drop-shadow-md">
              {col.description}
            </p>
            
            <div className="mt-auto inline-flex items-center gap-3">
              <span className="text-[11px] font-black uppercase tracking-[0.25em] text-white transition-colors duration-300 group-hover:text-[var(--color-primary)]">
                Explore Collection
              </span>
              <svg aria-hidden="true" viewBox="0 0 14 14" className="h-4 w-4 text-[var(--color-primary)] transition-transform duration-300 group-hover:translate-x-1" fill="none">
                <path d="M3 7H11M11 7L7.5 3.5M11 7L7.5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
