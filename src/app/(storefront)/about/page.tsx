import Image from "next/image";
import Link from "next/link";

export default function AboutPage() {
  return (
    <main className="pt-40 md:pt-32">
      {/* Hero Section: Editorial Vision */}
      <section className="px-8 max-w-[1920px] mx-auto mb-32">
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-12 md:col-span-7">
            <h1 className="text-[clamp(3rem,8vw,6rem)] font-black tracking-tighter leading-[0.9] text-on-background mb-8">
              ENGINEERED <br />
              <span className="text-primary">AESTHETICS.</span>
            </h1>
          </div>
          <div className="col-span-12 md:col-span-5 flex flex-col justify-end pb-4">
            <p className="text-on-secondary-container text-lg font-medium leading-relaxed max-w-md">
              We don&apos;t just create decals. We design precision interfaces for the automotive soul. Every line is a calculated decision, every material is a performance grade.
            </p>
          </div>
        </div>
      </section>

      {/* Asymmetric Workshop Grid */}
      <section className="px-8 max-w-[1920px] mx-auto mb-48">
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 md:col-span-8 aspect-[16/9] overflow-hidden rounded-sm bg-surface-container-low">
            <img
              className="w-full h-full object-cover transition-transform duration-700 hover:scale-[1.02]"
              alt="high-tech automotive workshop with clean white floors"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAd0BLTE2CP3yB-Ack3jwinptOogVV2yw0SdVGW-n04kYD8GXHOtzS3Vf3b3jIiB5cajMlnBdhG2njo-y_ba7-Cyeg00QB4ESJEktF99ng0rqXpEVuhcJ0seGvDtGoiqFnHZxoDkBhDPD_H4CkAbLOTZbngyONtLCIp9xbRBIYrG7aKEZCGv3N638vN_1XhS8Z21L9JIAiwHr4T47N9HbYIk7A4FZ87ypVdyQQAnKtAaWutob-FGvUA3Ob6v0_3TUVdbwQquw6VdWA"
            />
          </div>
          <div className="col-span-12 md:col-span-4 grid grid-rows-2 gap-4">
            <div className="bg-surface-container-lowest p-8 flex flex-col justify-between rounded-sm">
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">01 / Material</span>
              <div>
                <h3 className="text-2xl font-bold tracking-tight mb-2">Aerospace Grade</h3>
                <p className="text-sm text-on-secondary-container">Tested in extreme thermal conditions to ensure zero edge-lift and color integrity.</p>
              </div>
            </div>
            <div className="bg-primary-container p-8 flex flex-col justify-between rounded-sm">
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-on-primary-fixed">02 / Precision</span>
              <div>
                <h3 className="text-2xl font-bold tracking-tight text-on-primary-fixed mb-2">Micron Accuracy</h3>
                <p className="text-sm text-on-primary-fixed-variant">Laser-cut patterns designed to align perfectly with factory body lines.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Brand Vision Content Section */}
      <section className="bg-surface-container-low py-32 mb-48">
        <div className="px-8 max-w-[1920px] mx-auto">
          <div className="grid grid-cols-12 gap-8 items-center">
            <div className="col-span-12 md:col-span-4 mb-12 md:mb-0">
              <h2 className="text-4xl font-black uppercase tracking-tighter mb-6">THE LAB <br />PHILOSOPHY.</h2>
              <div className="w-16 h-1 bg-primary mb-8"></div>
              <p className="text-on-secondary-container leading-relaxed">
                NexaDesignLab was founded on the belief that automotive personalization should mirror the engineering standards of the vehicles themselves. We operate at the intersection of graphic design and industrial manufacturing.
              </p>
            </div>
            <div className="col-span-12 md:col-start-6 md:col-span-7">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
                <div>
                  <h4 className="font-bold uppercase text-xs tracking-widest mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm" data-icon="architecture">architecture</span>
                    Design Intent
                  </h4>
                  <p className="text-sm text-on-secondary-container leading-loose">
                    Every decal kit undergoes a rigorous testing phase. We analyze the visual weight of the vehicle to create designs that enhance aerodynamic presence without cluttering the silhouette.
                  </p>
                </div>
                <div>
                  <h4 className="font-bold uppercase text-xs tracking-widest mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm" data-icon="biotech">biotech</span>
                    Scientific Finish
                  </h4>
                  <p className="text-sm text-on-secondary-container leading-loose">
                    Our finishes range from ultra-matte non-reflective coatings to high-gloss depth layers that mimic factory paint clearcoats for a seamless look.
                  </p>
                </div>
                <div>
                  <h4 className="font-bold uppercase text-xs tracking-widest mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm" data-icon="shield">shield</span>
                    Quality Guard
                  </h4>
                  <p className="text-sm text-on-secondary-container leading-loose">
                    UV protection is baked into the DNA of our vinyl. We guarantee 7+ years of color stability against harsh sun exposure and chemical washes.
                  </p>
                </div>
                <div>
                  <h4 className="font-bold uppercase text-xs tracking-widest mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm" data-icon="speed">speed</span>
                    Fast Execution
                  </h4>
                  <p className="text-sm text-on-secondary-container leading-loose">
                    Precision doesn&apos;t mean delay. Our automated cutting lab ensures that your custom specifications are rendered and shipped within 48 hours.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Full-Width Statement Image */}
      <section className="px-8 max-w-[1920px] mx-auto mb-48">
        <div className="relative h-[716px] w-full overflow-hidden rounded-sm group">
          <img
            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
            alt="Close up of a luxury car fender showing a perfectly applied geometric decal"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDlP65DAK7M9oJIR2n0eSusrQlnL07q2YYLMI4S4VwazKzAXWb2LzViivDS0dCyCus0V73-DXmr6zTVtQ8YPFGQl3Mp8NCL6yGid-SRKCTMJ8NHdy8D-pTyCzT_gZfSPRQ136-tQABYC3G0cinUU2Pc9WjteSB4eC9bzAwlc66m6tJ0zTlfDp5HgXA_b3kGXYzsgQn6d0hLD7UoFIg7MwnqXxmsuFlJmjbKuchccT1UykL9OqeFrKaGVLVKlZT5ACvadQj6RiuUcGY"
          />
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
            <div className="text-center">
              <span className="text-white text-[11px] font-bold uppercase tracking-[0.4em] mb-4 block">Crafted in the Lab</span>
              <h2 className="text-white text-5xl md:text-7xl font-black tracking-tighter uppercase italic">NO COMPROMISE.</h2>
            </div>
          </div>
        </div>
      </section>

      {/* Technical Specifications Table */}
      <section className="px-8 max-w-[1920px] mx-auto mb-48">
        <div className="mb-16">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary mb-2">Technical Standards</h3>
          <h2 className="text-4xl font-bold tracking-tight">THE SPEC SHEET.</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border-y border-outline-variant/20">
          <div className="p-12 border-r border-outline-variant/20">
            <h5 className="font-bold uppercase text-[10px] tracking-widest mb-8 text-on-secondary-container">Adhesion Profile</h5>
            <div className="space-y-6">
              <div className="flex justify-between items-end border-b border-outline-variant/10 pb-2">
                <span className="text-sm font-medium">Initial Tack</span>
                <span className="text-sm font-bold">14 N/25mm</span>
              </div>
              <div className="flex justify-between items-end border-b border-outline-variant/10 pb-2">
                <span className="text-sm font-medium">Final Bond</span>
                <span className="text-sm font-bold">18 N/25mm</span>
              </div>
              <div className="flex justify-between items-end border-b border-outline-variant/10 pb-2">
                <span className="text-sm font-medium">Air Release</span>
                <span className="text-sm font-bold">Micro-Channel™</span>
              </div>
            </div>
          </div>
          <div className="p-12 border-r border-outline-variant/20 bg-surface-container-low">
            <h5 className="font-bold uppercase text-[10px] tracking-widest mb-8 text-on-secondary-container">Durability Index</h5>
            <div className="space-y-6">
              <div className="flex justify-between items-end border-b border-outline-variant/10 pb-2">
                <span className="text-sm font-medium">Heat Resistance</span>
                <span className="text-sm font-bold">110°C / 230°F</span>
              </div>
              <div className="flex justify-between items-end border-b border-outline-variant/10 pb-2">
                <span className="text-sm font-medium">Solvent Guard</span>
                <span className="text-sm font-bold">Grade A</span>
              </div>
              <div className="flex justify-between items-end border-b border-outline-variant/10 pb-2">
                <span className="text-sm font-medium">Flexibility</span>
                <span className="text-sm font-bold">150% Elongation</span>
              </div>
            </div>
          </div>
          <div className="p-12">
            <h5 className="font-bold uppercase text-[10px] tracking-widest mb-8 text-on-secondary-container">Aesthetic Variance</h5>
            <div className="space-y-6">
              <div className="flex justify-between items-end border-b border-outline-variant/10 pb-2">
                <span className="text-sm font-medium">Opacity</span>
                <span className="text-sm font-bold">&gt; 99.8%</span>
              </div>
              <div className="flex justify-between items-end border-b border-outline-variant/10 pb-2">
                <span className="text-sm font-medium">Gloss Level</span>
                <span className="text-sm font-bold">95+ GU</span>
              </div>
              <div className="flex justify-between items-end border-b border-outline-variant/10 pb-2">
                <span className="text-sm font-medium">Texture depth</span>
                <span className="text-sm font-bold">85 Microns</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-8 max-w-[1920px] mx-auto text-center mb-64">
        <h2 className="text-5xl font-black tracking-tighter uppercase mb-8">Ready to <span className="text-primary">Upgrade?</span></h2>
        <p className="text-on-secondary-container mb-12 max-w-xl mx-auto uppercase text-xs tracking-widest font-medium">Experience the precision of NexaDesignLab decals on your own machine.</p>
        <Link href="/shop" className="bg-primary-container text-on-primary-fixed px-12 py-5 font-black uppercase text-sm tracking-widest rounded-sm hover:pr-16 transition-all duration-300 inline-block">
          Browse Collection
        </Link>
      </section>
    </main>
  );
}
