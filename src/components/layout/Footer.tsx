import Link from "next/link";
import Image from "next/image";
import nexaLogo from "../../../public/nexaLogo.png";

const LINKS = {
  shop: [
    { label: "All Products", href: "/shop" },
    { label: "Decals", href: "/shop?category=decals" },
    { label: "Posters", href: "/shop?category=posters" },
  ],
  company: [
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
  ],
  account: [
    { label: "My Profile", href: "/profile" },
    { label: "My Cart", href: "/cart" },
    { label: "Order History", href: "/profile" },
  ],
};

export default function Footer() {
  return (
    <footer className="bg-[#0f1010] border-t border-white/[0.06] mt-0">
      {/* Main footer content */}
      <div className="mx-auto max-w-7xl px-5 sm:px-8 py-16">
        <div className="grid grid-cols-2 gap-10 lg:grid-cols-[2fr_1fr_1fr_1fr]">
          {/* Brand column */}
          <div className="col-span-2 lg:col-span-1">
            <Image
              src={nexaLogo}
              alt="NexaDesignLab"
              className="h-10 w-auto mb-5 brightness-0 invert"
            />
            <p className="text-sm leading-7 text-white/45 max-w-xs">
              Precision-cut decals and premium framed prints for those who refuse
              to compromise on their visual environment.
            </p>
            {/* Social */}
            <div className="mt-6 flex items-center gap-4">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-white/40 transition-all hover:border-[#CCFF00]/40 hover:text-[#CCFF00]"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" strokeWidth="1.7"/>
                  <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.7"/>
                  <circle cx="17.5" cy="6.5" r="1" fill="currentColor"/>
                </svg>
              </a>
              <a
                href="https://wa.me/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-white/40 transition-all hover:border-[#CCFF00]/40 hover:text-[#CCFF00]"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Shop links */}
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.35em] text-[#CCFF00] mb-5">
              Shop
            </p>
            <ul className="space-y-3">
              {LINKS.shop.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/45 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company links */}
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.35em] text-[#CCFF00] mb-5">
              Company
            </p>
            <ul className="space-y-3">
              {LINKS.company.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/45 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Account links */}
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.35em] text-[#CCFF00] mb-5">
              Account
            </p>
            <ul className="space-y-3">
              {LINKS.account.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/45 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/[0.06]">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[11px] text-white/30 uppercase tracking-[0.2em]">
            © {new Date().getFullYear()} NexaDesignLab Precision Engineering
          </p>
          <div className="flex items-center gap-6">
            <Link href="/about" className="text-[11px] text-white/30 hover:text-white/60 uppercase tracking-[0.18em] transition-colors">
              Privacy
            </Link>
            <Link href="/about" className="text-[11px] text-white/30 hover:text-white/60 uppercase tracking-[0.18em] transition-colors">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
