"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCartStore } from "@/store/useCartStore";
import { useAuthStore } from "@/store/useAuthStore";
import nexaLogo from "../../../public/nexaLogo.png";
import AuthModal from "../auth/AuthModal";

export default function Navbar() {
  const items = useCartStore((state) => state.items);
  const totalItems = items.reduce((total, item) => total + item.quantity, 0);
  const { user, initialize } = useAuthStore();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);

    // If we detect the user came back from an aborted OAuth flow, force a clean reload
    if (typeof window !== 'undefined' && sessionStorage.getItem('oauth_in_progress') === 'true') {
      sessionStorage.removeItem('oauth_in_progress');
      window.location.reload();
      return;
    }

    // Also catch bfcache restore using pageshow API
    const handlePageShow = (e: PageTransitionEvent) => {
      if (sessionStorage.getItem('oauth_in_progress') === 'true') {
        sessionStorage.removeItem('oauth_in_progress');
        window.location.reload();
        
        // Fallback if browser blocks reload: force React to unmount and remount
        setMounted(false);
        setTimeout(() => setMounted(true), 100);
      }
    };
    
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, []);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <>
    <nav className="fixed top-0 left-0 w-full z-50 bg-white/95 backdrop-blur-md border-b border-[var(--color-outline-variant)]/10">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 sm:px-10">
        
        {/* Logo */}
        <Link href="/" className="flex items-center hover:opacity-80 transition-opacity" aria-label="NexaDesignLab home" onClick={() => setShowMobileMenu(false)}>
          <Image
            src={nexaLogo}
            alt="NexaDesignLab logo"
            priority
            className="h-10 w-auto sm:h-12"
          />
        </Link>

        {/* Navigation Links (Desktop) */}
        <div className="hidden md:flex items-center gap-10">
          <Link href="/shop" className="rounded-full px-4 py-2 text-[12px] font-black uppercase tracking-[0.24em] text-[var(--color-on-surface)] transition-colors hover:bg-[var(--color-surface-container-low)] hover:text-[var(--color-primary)]">
            Shop
          </Link>
          <Link href="/#spectrum" className="rounded-full px-4 py-2 text-[12px] font-black uppercase tracking-[0.24em] text-[var(--color-on-surface)] transition-colors hover:bg-[var(--color-surface-container-low)] hover:text-[var(--color-primary)]">
            Collections
          </Link>
          <Link href="/shop?category=posters" className="rounded-full px-4 py-2 text-[12px] font-black uppercase tracking-[0.24em] text-[var(--color-on-surface)] transition-colors hover:bg-[var(--color-surface-container-low)] hover:text-[var(--color-primary)]">
            Posters
          </Link>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-6">
          {mounted && user ? (
            <Link href="/profile" className="group flex items-center" onClick={() => setShowMobileMenu(false)}>
              <div className="w-10 h-10 rounded-full bg-[var(--color-on-background)] text-[var(--color-primary-container)] flex items-center justify-center font-black text-xs uppercase shadow-sm group-hover:scale-110 transition-all duration-500">
                {user.email?.[0] || "U"}
              </div>
            </Link>
          ) : (
            <button 
              onClick={() => { setShowAuthModal(true); setShowMobileMenu(false); }}
              className="text-[var(--color-on-surface)] hover:text-[var(--color-primary)] transition-all duration-300 flex items-center group"
              aria-label="Open account sign in"
            >
              <span className="material-symbols-outlined text-[24px] group-hover:scale-110 transition-transform">account_circle</span>
            </button>
          )}

          <div className="w-px h-5 bg-[var(--color-outline-variant)]/20" />

          <Link href="/cart" className="flex items-center gap-2 rounded-full px-2 py-1 text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-low)] hover:text-[var(--color-primary)] transition-all relative group" onClick={() => setShowMobileMenu(false)} aria-label={`Cart with ${mounted ? totalItems : 0} items`}>
            <span className="material-symbols-outlined text-[24px] group-hover:scale-110 transition-transform">shopping_bag</span>
            <span className="hidden lg:inline text-[11px] font-black uppercase tracking-[0.22em]">
              Cart
            </span>
            {mounted && totalItems > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-[var(--color-primary-container)] text-[var(--color-on-background)] text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-white shadow-sm">
                {totalItems}
              </span>
            )}
          </Link>

          <div className="w-px h-5 bg-[var(--color-outline-variant)]/20 md:hidden" />

          {/* Mobile hamburger button */}
          <button 
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="md:hidden flex items-center justify-center text-[var(--color-on-surface)] hover:text-[var(--color-primary)] transition-colors focus:outline-none"
            aria-label="Toggle navigation menu"
          >
            <span className="material-symbols-outlined text-[28px]">
              {showMobileMenu ? "close" : "menu"}
            </span>
          </button>
        </div>
      </div>
    </nav>

    {/* Mobile Menu Drawer */}
    {showMobileMenu && (
      <div className="fixed inset-x-0 top-[80px] bottom-0 z-40 bg-white/98 backdrop-blur-lg border-t border-[var(--color-outline-variant)]/10 animate-in fade-in slide-in-from-top-5 duration-300 md:hidden overflow-y-auto">
        <div className="flex flex-col p-8 space-y-8">
          <Link 
            href="/shop" 
            onClick={() => setShowMobileMenu(false)}
            className="text-lg font-black uppercase tracking-[0.25em] border-b border-[var(--color-outline-variant)]/20 pb-4 text-[var(--color-on-surface)] hover:text-[var(--color-primary)] transition-colors"
          >
            Shop All
          </Link>
          
          <div className="flex flex-col space-y-6 pl-2">
            <Link 
              href="/shop?category=posters&series=automotive-series" 
              onClick={() => setShowMobileMenu(false)}
              className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--color-secondary)] hover:text-[var(--color-primary)] transition-colors flex items-center gap-3"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary-container)]" />
              Automotive Posters
            </Link>
            <Link 
              href="/shop?category=posters&series=regional-series" 
              onClick={() => setShowMobileMenu(false)}
              className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--color-secondary)] hover:text-[var(--color-primary)] transition-colors flex items-center gap-3"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary-container)]" />
              Northeast India Posters
            </Link>
            <Link 
              href="/shop?category=posters&series=mindset-series" 
              onClick={() => setShowMobileMenu(false)}
              className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--color-secondary)] hover:text-[var(--color-primary)] transition-colors flex items-center gap-3"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary-container)]" />
              Motivational Posters
            </Link>
            <Link 
              href="/shop?category=posters&q=zubeen" 
              onClick={() => setShowMobileMenu(false)}
              className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--color-secondary)] hover:text-[var(--color-primary)] transition-colors flex items-center gap-3"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary-container)]" />
              Zubeen Garg Posters
            </Link>
          </div>
        </div>
      </div>
    )}

      {showAuthModal && (
        <AuthModal 
          isOpen={true} 
          onClose={() => setShowAuthModal(false)} 
          redirectTo="/profile"
        />
      )}
    </>
  );
}
