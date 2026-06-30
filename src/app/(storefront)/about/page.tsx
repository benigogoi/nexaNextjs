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
              We don&apos;t just create posters. We capture the precision and engineering of the automotive soul. Every layout is a calculated tribute, printed fresh on premium photo paper for every order.
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
                <h3 className="text-2xl font-bold tracking-tight mb-2">Premium Paper</h3>
                <p className="text-sm text-on-secondary-container">Printed on premium glossy or matte photo paper for rich color density and a clean, professional finish.</p>
              </div>
            </div>
            <div className="bg-primary-container p-8 flex flex-col justify-between rounded-sm">
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-on-primary-fixed">02 / Precision</span>
              <div>
                <h3 className="text-2xl font-bold tracking-tight text-on-primary-fixed mb-2">High Resolution</h3>
                <p className="text-sm text-on-primary-fixed-variant">High-resolution layouts calibrated to preserve the exact lines of automotive history.</p>
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
                NexaDesignLab was founded on the belief that automotive art should mirror the engineering standards of the vehicles themselves. We operate at the intersection of premium printmaking and automotive culture.
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
                    Every art piece undergoes a rigorous calibration phase. We analyze the visual weight of the vehicle silhouette to create designs that enhance aerodynamic presence with perfect layout harmony.
                  </p>
                </div>
                <div>
                  <h4 className="font-bold uppercase text-xs tracking-widest mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm" data-icon="biotech">biotech</span>
                    Premium Finish
                  </h4>
                  <p className="text-sm text-on-secondary-container leading-loose">
                    Every print comes off a professional 6-color photo printer on premium photo paper — sharp detail, deep blacks, and color that does the design justice.
                  </p>
                </div>
                <div>
                  <h4 className="font-bold uppercase text-xs tracking-widest mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm" data-icon="shield">shield</span>
                    Quality Guard
                  </h4>
                  <p className="text-sm text-on-secondary-container leading-loose">
                    Every print is inspected by hand before it ships. If your poster arrives damaged or with a print defect, we&apos;ll replace it — no questions asked.
                  </p>
                </div>
                <div>
                  <h4 className="font-bold uppercase text-xs tracking-widest mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm" data-icon="speed">speed</span>
                    Fast Execution
                  </h4>
                  <p className="text-sm text-on-secondary-container leading-loose">
                    Precision doesn&apos;t mean delay. Every order is printed fresh, packed carefully, and handed to the courier within 48 hours.
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
            alt="Close up of a perfectly mounted automotive print"
            src="/installation_loft.png"
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
            <h5 className="font-bold uppercase text-[10px] tracking-widest mb-8 text-on-secondary-container">Paper Profile</h5>
            <div className="space-y-6">
              <div className="flex justify-between items-end border-b border-outline-variant/10 pb-2">
                <span className="text-sm font-medium">Paper Type</span>
                <span className="text-sm font-bold">Premium Photo Paper</span>
              </div>
              <div className="flex justify-between items-end border-b border-outline-variant/10 pb-2">
                <span className="text-sm font-medium">Finish Options</span>
                <span className="text-sm font-bold">Glossy / Matte</span>
              </div>
              <div className="flex justify-between items-end border-b border-outline-variant/10 pb-2">
                <span className="text-sm font-medium">Backing</span>
                <span className="text-sm font-bold">Self-Adhesive</span>
              </div>
            </div>
          </div>
          <div className="p-12 border-r border-outline-variant/20 bg-surface-container-low">
            <h5 className="font-bold uppercase text-[10px] tracking-widest mb-8 text-on-secondary-container">Ink Profile</h5>
            <div className="space-y-6">
              <div className="flex justify-between items-end border-b border-outline-variant/10 pb-2">
                <span className="text-sm font-medium">Ink Technology</span>
                <span className="text-sm font-bold">6-Color Photo Ink</span>
              </div>
              <div className="flex justify-between items-end border-b border-outline-variant/10 pb-2">
                <span className="text-sm font-medium">Print Resolution</span>
                <span className="text-sm font-bold">Up to 5760 DPI</span>
              </div>
              <div className="flex justify-between items-end border-b border-outline-variant/10 pb-2">
                <span className="text-sm font-medium">Color Output</span>
                <span className="text-sm font-bold">Vivid Photo Gamut</span>
              </div>
            </div>
          </div>
          <div className="p-12">
            <h5 className="font-bold uppercase text-[10px] tracking-widest mb-8 text-on-secondary-container">Application</h5>
            <div className="space-y-6">
              <div className="flex justify-between items-end border-b border-outline-variant/10 pb-2">
                <span className="text-sm font-medium">Mounting</span>
                <span className="text-sm font-bold">Peel &amp; Stick</span>
              </div>
              <div className="flex justify-between items-end border-b border-outline-variant/10 pb-2">
                <span className="text-sm font-medium">Tools Needed</span>
                <span className="text-sm font-bold">None</span>
              </div>
              <div className="flex justify-between items-end border-b border-outline-variant/10 pb-2">
                <span className="text-sm font-medium">Sizes</span>
                <span className="text-sm font-bold">A4 / A3 / A3+</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-8 max-w-[1920px] mx-auto text-center mb-64">
        <h2 className="text-5xl font-black tracking-tighter uppercase mb-8">Ready to <span className="text-primary">Upgrade?</span></h2>
        <p className="text-on-secondary-container mb-12 max-w-xl mx-auto uppercase text-xs tracking-widest font-medium">Experience the precision of NexaDesignLab prints on your own walls.</p>
        <Link href="/shop" className="bg-primary-container text-on-primary-fixed px-12 py-5 font-black uppercase text-sm tracking-widest rounded-sm hover:pr-16 transition-all duration-300 inline-block">
          Browse Collection
        </Link>
      </section>
    </main>
  );
}
