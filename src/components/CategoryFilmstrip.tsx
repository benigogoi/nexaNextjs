"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

export type FilmstripCard = {
  id: string;
  name: string;
  slug: string;
  image_url?: string | null;
  parentName: string;
};

export type FilmstripGroup = {
  id: string;
  name: string;
  slug: string;
  image_url?: string | null;
  cards: FilmstripCard[];
};

const CARD_GRADIENTS = [
  ["#111827", "#0d1f3c", "#1a2e52"],
  ["#2d0c0c", "#3a1010", "#521818"],
  ["#0c1f18", "#102b20", "#163d2c"],
  ["#241a04", "#332408", "#4a360c"],
  ["#18102e", "#221540", "#2e1a54"],
  ["#0c1c24", "#122838", "#18364a"],
];

type GroupMeta = {
  eyebrow: string;
  description: string;
  accentClass: string;
  accentTextClass: string;
  badgeClass: string;
  glowStyle: string;
};

function getGroupMeta(name: string): GroupMeta {
  const normalized = name.trim().toLowerCase();

  if (normalized === "decals") {
    return {
      eyebrow: "Vehicle Graphics",
      description: "Precision-cut vinyl series built for body panels, glass, and spare-mount statements.",
      accentClass: "bg-[var(--color-primary-container)]",
      accentTextClass: "text-[var(--color-primary-container)]",
      badgeClass: "border-[rgba(204,255,0,0.18)] bg-[rgba(204,255,0,0.08)] text-[var(--color-primary-container)]",
      glowStyle: "radial-gradient(circle_at_top_left, rgba(204,255,0,0.2), transparent 48%)",
    };
  }

  if (normalized === "posters") {
    return {
      eyebrow: "Wall Displays",
      description: "Framed visual series for interiors that want gallery-scale presence without losing restraint.",
      accentClass: "bg-white/60",
      accentTextClass: "text-white/85",
      badgeClass: "border-white/12 bg-white/[0.05] text-white/80",
      glowStyle: "radial-gradient(circle_at_top_left, rgba(255,255,255,0.15), transparent 46%)",
    };
  }

  return {
    eyebrow: "Collection",
    description: "A focused series grouping from the current storefront library.",
    accentClass: "bg-white/45",
    accentTextClass: "text-white/75",
    badgeClass: "border-white/12 bg-white/[0.05] text-white/70",
    glowStyle: "radial-gradient(circle_at_top_left, rgba(255,255,255,0.15), transparent 46%)",
  };
}

function ArrowIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg width="16" height="16" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path
        d={direction === "left" ? "M9 2L4 7L9 12" : "M5 2L10 7L5 12"}
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SeriesPanel({
  group,
  groupIndex,
}: {
  group: FilmstripGroup;
  groupIndex: number;
}) {
  const meta = getGroupMeta(group.name);
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [hasOverflow, setHasOverflow] = useState(false);
  const [progress, setProgress] = useState(0);

  const updateScrollState = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;

    const maxScroll = el.scrollWidth - el.clientWidth;
    setHasOverflow(maxScroll > 0);
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft < maxScroll - 8);
    setProgress(maxScroll > 0 ? el.scrollLeft / maxScroll : 0);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    const observer = new ResizeObserver(() => {
      updateScrollState();
    });
    observer.observe(el);

    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });

    return () => {
      observer.disconnect();
      el.removeEventListener("scroll", updateScrollState);
    };
  }, [updateScrollState, group.cards.length]);

  const scrollBy = (dir: "left" | "right") => {
    const el = trackRef.current;
    if (!el) return;

    const amount = el.clientWidth * 0.72;
    el.scrollBy({ left: dir === "right" ? amount : -amount, behavior: "smooth" });
  };

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-white/[0.08] bg-[#0a0b0c] p-5 sm:p-6 shadow-[0_30px_80px_rgba(0,0,0,0.5)]">
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: meta.glowStyle }} />
      <div
        className="absolute inset-0 opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "30px 30px",
        }}
      />

      <div className="relative z-10">
        <div className="flex flex-col gap-6 md:gap-8">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <p className={`text-[10px] font-black uppercase tracking-[0.35em] ${meta.accentTextClass}`}>
                {meta.eyebrow}
              </p>
              <div className="mt-4 flex items-start gap-4">
                <div className={`mt-1 h-14 w-1 rounded-full ${meta.accentClass}`} />
                <div>
                  <h3 className="text-[clamp(2rem,4vw,3.25rem)] font-black uppercase tracking-[-0.05em] text-white leading-[0.92]">
                    {group.name}
                  </h3>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-white/58">
                    {meta.description}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-start justify-between gap-4 xl:flex-col xl:items-end xl:text-right">
              <span className={`inline-flex rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-[0.22em] ${meta.badgeClass}`}>
                {group.cards.length} series
              </span>
              <Link
                href={`/shop?category=${group.slug}`}
                className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-white/58 transition-colors duration-200 hover:text-white"
              >
                Browse {group.name}
                <span className={meta.accentTextClass}>
                  <ArrowIcon direction="right" />
                </span>
              </Link>
            </div>
          </div>

          <div className="relative">
            <div
              ref={trackRef}
              className="flex gap-4 overflow-x-auto snap-x snap-mandatory pr-10 pb-5"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {group.cards.map((card, cardIndex) => {
                const [bg1, bg2, bg3] =
                  CARD_GRADIENTS[(groupIndex * 3 + cardIndex) % CARD_GRADIENTS.length]!;

                return (
                  <Link
                    key={card.id}
                    href={`/shop?category=${card.slug}`}
                    className="group/card relative snap-start shrink-0 w-[224px] sm:w-[248px] h-[248px] sm:h-[286px] overflow-hidden rounded-[1.6rem] border border-white/[0.08] shadow-[0_18px_45px_rgba(0,0,0,0.38)] transition-all duration-500 hover:-translate-y-1 hover:border-white/18 hover:shadow-[0_24px_60px_rgba(0,0,0,0.48)]"
                    style={{ background: `linear-gradient(160deg, ${bg1} 0%, ${bg2} 55%, ${bg3} 100%)` }}
                  >
                    {card.image_url && (
                      <img
                        src={card.image_url}
                        alt={card.name}
                        className="absolute inset-0 h-full w-full object-cover opacity-60 transition-all duration-700 group-hover/card:scale-[1.06] group-hover/card:opacity-85"
                      />
                    )}

                    <div
                      className="absolute inset-0 opacity-[0.08]"
                      style={{
                        backgroundImage:
                          "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
                        backgroundSize: "24px 24px",
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent" />

                    <div className="absolute left-0 top-0 bottom-0 w-[3px] origin-bottom scale-y-0 rounded-full bg-[var(--color-primary-container)] transition-transform duration-500 group-hover/card:scale-y-100" />

                    <div className="absolute left-5 right-5 top-5 z-10 flex items-start justify-between">
                      <span className="font-mono text-[10px] font-bold tracking-[0.25em] text-white/20">
                        {String(cardIndex + 1).padStart(2, "0")}
                      </span>
                      <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.2em] text-white/46 backdrop-blur-sm">
                        Series
                      </span>
                    </div>

                    <div className="pointer-events-none absolute -bottom-5 -right-2 text-[120px] font-black leading-none tracking-tighter text-white/[0.06]">
                      {String(cardIndex + 1).padStart(2, "0")}
                    </div>

                    <div className="absolute inset-x-0 bottom-0 z-10 p-5">
                      <p className={`mb-3 text-[8px] font-black uppercase tracking-[0.3em] ${meta.accentTextClass}`}>
                        {group.name}
                      </p>
                      <h4 className="text-xl font-black uppercase leading-tight tracking-tight text-white drop-shadow-lg">
                        {card.name}
                      </h4>
                      <div className="mt-4 flex items-center gap-3">
                        <div className={`h-px w-7 ${meta.accentClass}`} />
                        <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-white/34 transition-colors duration-300 group-hover/card:text-white/75">
                          View Series
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            <div
              className="pointer-events-none absolute left-0 top-0 bottom-5 z-0 w-16 bg-gradient-to-r from-[#0a0a0a] to-transparent transition-opacity duration-300"
              style={{ opacity: canScrollLeft ? 1 : 0 }}
            />
            <div
              className="pointer-events-none absolute right-0 top-0 bottom-5 z-0 w-16 bg-gradient-to-l from-[#0a0a0a] to-transparent transition-opacity duration-300"
              style={{ opacity: canScrollRight ? 1 : 0 }}
            />

            <div className="relative z-10 mt-2 flex items-center gap-5">
              <div className="flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className={`h-[2px] rounded-full ${meta.accentClass}`}
                  style={{ width: `${Math.max(12, Math.min(100, progress * 100))}%` }}
                />
              </div>

              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => scrollBy("left")}
                  disabled={!canScrollLeft}
                  aria-label={`Scroll ${group.name} left`}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/[0.08] text-white/70 shadow-[0_8px_24px_rgba(0,0,0,0.28)] transition-all duration-200 hover:border-[var(--color-primary-container)]/60 hover:bg-white/[0.12] hover:text-white disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.04] disabled:text-white/30 disabled:opacity-45"
                >
                  <ArrowIcon direction="left" />
                </button>
                <button
                  onClick={() => scrollBy("right")}
                  disabled={!canScrollRight}
                  aria-label={`Scroll ${group.name} right`}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/[0.08] text-white/70 shadow-[0_8px_24px_rgba(0,0,0,0.28)] transition-all duration-200 hover:border-[var(--color-primary-container)]/60 hover:bg-white/[0.12] hover:text-white disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.04] disabled:text-white/30 disabled:opacity-45"
                >
                  <ArrowIcon direction="right" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function CategoryFilmstrip({ groups }: { groups: FilmstripGroup[] }) {
  return (
    <div className="grid gap-6 xl:grid-cols-2 xl:gap-8">
      {groups.map((group, index) => (
        <SeriesPanel key={group.id} group={group} groupIndex={index} />
      ))}
    </div>
  );
}
