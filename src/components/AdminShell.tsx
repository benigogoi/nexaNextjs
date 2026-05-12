'use client';

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import nexaLogo from "../../public/nexaLogo.png";

type NavItem = {
  href: string;
  label: string;
  icon: string;
  newTab?: boolean;
};

const primaryNav: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: "dashboard" },
  { href: "/admin/products", label: "Products", icon: "category" },
  { href: "/admin/bundles", label: "Bundles", icon: "inventory" },
  { href: "/admin/categories", label: "Categories", icon: "inventory_2" },
  { href: "/admin/orders", label: "Orders", icon: "receipt_long" },
  { href: "/admin/customers", label: "Customers", icon: "group" },
  { href: "/admin/coupons", label: "Coupons", icon: "local_offer" },
];

const secondaryNav: NavItem[] = [
  { href: "/admin/settings", label: "Settings", icon: "settings" },
  { href: "/", label: "Back to Store", icon: "storefront", newTab: true },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/admin") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  item,
  pathname,
  onNavigate,
  compact = false,
}: {
  item: NavItem;
  pathname: string;
  onNavigate: () => void;
  compact?: boolean;
}) {
  const active = isActivePath(pathname, item.href);

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      target={item.newTab ? "_blank" : undefined}
      rel={item.newTab ? "noreferrer" : undefined}
      className={`flex items-center gap-4 rounded-sm border px-4 py-3 font-bold uppercase tracking-widest transition-colors ${
        compact ? "text-[11px]" : "text-sm"
      } ${
        active
          ? "border-[#ccff00]/40 bg-[#ccff00]/10 text-white"
          : "border-transparent text-[#a0a0a0] hover:border-[#2a2a2a] hover:text-white"
      }`}
    >
      <span className={`material-symbols-outlined transition-colors ${active ? "text-[#ccff00]" : ""} ${compact ? "text-[16px]" : "text-[18px]"}`}>
        {item.icon}
      </span>
      <span>{item.label}</span>
    </Link>
  );
}

export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    document.body.style.overflow = isSidebarOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [isSidebarOpen]);

  const closeSidebar = () => setIsSidebarOpen(false);
  const handleSignOut = async () => {
    setIsSigningOut(true);
    await supabase.auth.signOut();
    closeSidebar();
    router.replace("/login");
    router.refresh();
    setIsSigningOut(false);
  };

  return (
    <div className="flex min-h-screen overflow-x-hidden bg-[#101010] text-[#f0f1f2] font-sans selection:bg-[#ccff00] selection:text-[#161e00]">
      <header className="fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b border-[#2a2a2a] bg-[#121212]/95 px-4 py-3 backdrop-blur lg:hidden">
        <Link href="/admin" className="flex items-center">
          <Image
            src={nexaLogo}
            alt="Nexa admin logo"
            width={144}
            height={46}
            priority
            className="h-auto w-auto max-w-[144px]"
          />
        </Link>
        <button
          type="button"
          onClick={() => setIsSidebarOpen(true)}
          className="flex h-11 w-11 items-center justify-center border border-[#333333] bg-[#1a1a1a] text-white transition-colors hover:border-[#ccff00] hover:text-[#ccff00]"
          aria-label="Open admin navigation"
        >
          <span className="material-symbols-outlined text-[22px]">menu</span>
        </button>
      </header>

      {isSidebarOpen ? (
        <button
          type="button"
          aria-label="Close admin navigation overlay"
          onClick={closeSidebar}
          className="fixed inset-0 z-40 bg-black/70 lg:hidden"
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[86vw] max-w-[320px] flex-col border-r border-[#2a2a2a] bg-[#161616] px-6 py-6 transition-transform duration-300 lg:sticky lg:top-0 lg:z-0 lg:h-screen lg:w-64 lg:max-w-none lg:translate-x-0 lg:py-10 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-10 flex items-center justify-between lg:mb-16 lg:block">
          <Link href="/admin" className="flex items-center justify-center lg:w-full">
            <Image
              src={nexaLogo}
              alt="Nexa admin logo"
              width={176}
              height={56}
              priority
              className="h-auto w-auto max-w-[176px]"
            />
          </Link>
          <button
            type="button"
            onClick={closeSidebar}
            className="flex h-10 w-10 items-center justify-center border border-[#333333] text-[#a0a0a0] transition-colors hover:border-[#ccff00] hover:text-[#ccff00] lg:hidden"
            aria-label="Close admin navigation"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <nav className="flex flex-col gap-3">
          {primaryNav.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} onNavigate={closeSidebar} />
          ))}
        </nav>

        <div className="mt-auto border-t border-[#2a2a2a] pt-6 flex flex-col gap-2">
          {secondaryNav.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} onNavigate={closeSidebar} compact />
          ))}
          <button
            type="button"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="flex items-center gap-4 rounded-sm border border-transparent px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-[#a0a0a0] transition-colors hover:border-[#2a2a2a] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className={`material-symbols-outlined text-[16px] ${isSigningOut ? "animate-spin" : ""}`}>
              {isSigningOut ? "progress_activity" : "logout"}
            </span>
            <span>{isSigningOut ? "Signing Out" : "Sign Out"}</span>
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-x-hidden px-4 pb-20 pt-48 sm:px-6 sm:pt-32 lg:max-w-[1400px] lg:px-12 lg:py-16">
        {children}
      </main>
    </div>
  );
}
