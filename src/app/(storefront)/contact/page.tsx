import Link from "next/link";
import Image from "next/image";

export default function ContactPage() {
  return (
    <main className="pt-40 min-h-screen md:pt-32">
      {/* Hero Section / Header */}
      <section className="px-8 max-w-[1920px] mx-auto mb-24">
        <div className="max-w-4xl">
          <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-primary mb-6 block">Direct Channels</span>
          <h1 className="text-[clamp(3rem,8vw,5.5rem)] font-black tracking-tighter leading-[0.9] text-slate-900 mb-8">
            LET&apos;S START THE<br />CONVERSATION.
          </h1>
          <p className="text-lg text-[var(--color-secondary)] max-w-xl leading-relaxed">
            Precision engineering requires clear communication. Whether you&apos;re inquiring about a custom project or technical specifications, our laboratory is open.
          </p>
        </div>
      </section>

      {/* Content Grid */}
      <section className="px-8 max-w-[1920px] mx-auto grid grid-cols-1 md:grid-cols-12 gap-16 lg:gap-32 pb-32">
        {/* Contact Form (The Lab Console) */}
        <div className="md:col-span-7 bg-[var(--color-surface-container-lowest)] p-8 md:p-12 shadow-[0px_24px_48px_rgba(25,28,29,0.02)] border border-[var(--color-outline-variant)]/10">
          <form className="space-y-12">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-secondary)]" htmlFor="name">Project Lead Name</label>
              <input className="w-full bg-transparent border-t-0 border-x-0 border-b border-[var(--color-outline-variant)] focus:border-primary focus:ring-0 px-0 py-4 transition-colors placeholder:text-[var(--color-surface-dim)]" id="name" name="name" placeholder="Full Name" required type="text" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-secondary)]" htmlFor="email">Digital Address</label>
              <input className="w-full bg-transparent border-t-0 border-x-0 border-b border-[var(--color-outline-variant)] focus:border-primary focus:ring-0 px-0 py-4 transition-colors placeholder:text-[var(--color-surface-dim)]" id="email" name="email" placeholder="email@domain.com" required type="email" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-secondary)]" htmlFor="message">Project Requirements / Inquiry</label>
              <textarea className="w-full bg-transparent border-t-0 border-x-0 border-b border-[var(--color-outline-variant)] focus:border-primary focus:ring-0 px-0 py-4 transition-colors placeholder:text-[var(--color-surface-dim)] resize-none" id="message" name="message" placeholder="Briefly describe your vision or technical needs..." required rows={4}></textarea>
            </div>
            <div className="pt-6">
              <button className="group relative inline-flex items-center gap-4 bg-primary-container text-[var(--color-on-primary-fixed)] px-10 py-5 font-bold text-sm tracking-tighter uppercase rounded-sm overflow-hidden transition-all active:scale-[0.98]" type="button">
                <span className="relative z-10">Initialize Transmission</span>
                <span className="material-symbols-outlined transition-transform group-hover:translate-x-1" data-icon="arrow_forward">arrow_forward</span>
              </button>
            </div>
          </form>
        </div>

        {/* Side Highlights (Channels) */}
        <div className="md:col-span-5 space-y-16">
          {/* Highlight: WhatsApp */}
          <div className="group cursor-pointer">
            <div className="flex items-center gap-6 mb-4">
              <div className="w-12 h-12 flex items-center justify-center bg-[var(--color-surface-container-high)] rounded-sm group-hover:bg-primary-container transition-colors">
                <span className="material-symbols-outlined text-[var(--color-on-surface)]" data-icon="chat">chat</span>
              </div>
              <h3 className="text-sm font-black uppercase tracking-widest">Rapid Response</h3>
            </div>
            <p className="text-[var(--color-secondary)] text-sm leading-relaxed mb-6">
              For immediate technical support or quick consultation regarding decal measurements and fitment.
            </p>
            <Link className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.15em] border-b-2 border-primary-container pb-1" href="#">
              Connect via WhatsApp
            </Link>
          </div>

          {/* Highlight: Instagram */}
          <div className="group cursor-pointer">
            <div className="flex items-center gap-6 mb-4">
              <div className="w-12 h-12 flex items-center justify-center bg-[var(--color-surface-container-high)] rounded-sm group-hover:bg-primary-container transition-colors">
                <span className="material-symbols-outlined text-[var(--color-on-surface)]" data-icon="photo_camera">photo_camera</span>
              </div>
              <h3 className="text-sm font-black uppercase tracking-widest">Visual Archive</h3>
            </div>
            <p className="text-[var(--color-secondary)] text-sm leading-relaxed mb-6">
              Explore our latest lab results, community builds, and high-performance automotive photography.
            </p>
            <Link className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.15em] border-b-2 border-primary-container pb-1" href="#">
              Follow @NexaDesignLab
            </Link>
          </div>

          {/* Visual Anchor */}
          <div className="relative w-full aspect-square overflow-hidden rounded-sm grayscale group">
            <img alt="Automotive design lab" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA9qa5XWtIWkm5hCiHWR6js5-DRlyXTrZY6eA5qCA8oqKLbcCQ10NVHbn5fyeZ4LxgxoEUSHv0CcPfs3p1l_iZzNyeV-F6yGxFtiO7K0Xdiplr7pQ-usrWDAag4gOKwVpUXglRPylwzv5354U1ZBrXWTXN6QPV3L7h24zIvfyFNn731EokY5KXZ2xY4Vy7SBUXOzPmRdCZH0bIMmwr4hn2XYpkgiaNCVt3wSNTRftfh9qKXf6Q4dXXkZQWqBEPeDeKqtiwhVIVMsAk" />
            <div className="absolute inset-0 bg-[var(--color-primary)]/10 mix-blend-multiply"></div>
            <div className="absolute bottom-6 left-6 right-6">
              <div className="text-[10px] font-bold text-white/80 uppercase tracking-widest">Est. 2024</div>
              <div className="text-white font-black text-xl tracking-tighter">ENGINEERED IN SILICON VALLEY</div>
            </div>
          </div>
        </div>
      </section>

      {/* Location Section / Tonal Shift */}
      <section className="bg-[var(--color-surface-container-low)] py-32 px-8">
        <div className="max-w-[1920px] mx-auto flex flex-col md:flex-row items-end justify-between gap-12">
          <div className="max-w-md">
            <h2 className="text-3xl font-black tracking-tighter text-[var(--color-on-surface)] mb-6 uppercase">Physical Hub</h2>
            <p className="text-[var(--color-secondary)] text-sm leading-relaxed">
              Precision Engineering Square<br />
              Bay 09, Automotive District<br />
              San Francisco, CA 94103
            </p>
          </div>
          <div className="w-full md:w-1/2 aspect-[21/9] bg-[var(--color-surface-container-high)] relative overflow-hidden grayscale">
            <img alt="Map" className="w-full h-full object-cover opacity-50" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAcGjXuctBS0oj2bXXT31RtLqrnF4300e4uswrUs12YpbmA0Te3ZnBi9ltTe4ULdO9tpKKkvhiyWQ00G1Z3lyGmxotU1poHOex3d2YrNjOaRa8zaeV-wy8j_ivjZAW_JezE4Y9ermRLrYt8VzpfbrA2Nhu68HZhoe8uylbf9TgK4U7cEohZ6mM0hvujPZBNw_wTQCuJkzdAvYpte5E_j3O4taDPjjxuuz_34qjYf6Hd2vJQ9pQwJT512Qgl9rBNT8xvqLN3cOql3sY" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-4 h-4 bg-primary-container rounded-full animate-pulse shadow-[0_0_20px_rgba(204,255,0,0.8)]"></div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
