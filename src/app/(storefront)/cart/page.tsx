"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCartStore } from "@/store/useCartStore";

export default function CartPage() {
  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const getSubtotal = useCartStore((s) => s.getSubtotal);

  // Avoid hydration mismatch — render nothing cart-specific until client mounts
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const subtotal = mounted ? getSubtotal() : 0;
  // Free shipping above ₹499, else flat ₹49
  const shipping = subtotal > 499 ? 0 : subtotal > 0 ? 49 : 0;
  const total = subtotal + shipping;

  return (
    <main className="min-h-screen bg-[var(--color-surface)] pt-32 pb-24 px-5 sm:px-8">
      <div className="mx-auto max-w-[1440px]">
        
        {/* Breadcrumbs / Back button */}
        <div className="mb-12">
          <Link href="/shop" className="group inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-[var(--color-secondary)] hover:text-[var(--color-primary)] transition-colors">
            <span className="material-symbols-outlined text-[18px] group-hover:-translate-x-1 transition-transform">arrow_back</span>
            Back to shop
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-8 xl:gap-16 items-start">
          
          {/* Left Column: Cart Items */}
          <div className="space-y-12">
            <div>
              <h1 className="text-[clamp(2.5rem,8vw,4.5rem)] font-black uppercase tracking-[-0.05em] leading-[0.85] text-[var(--color-on-surface)]">
                Shopping<br /><span className="text-[var(--color-primary)]">Cart</span>
              </h1>
              {mounted && items.length > 0 && (
                <div className="mt-6 flex items-center gap-4">
                  <div className="h-[2px] w-12 bg-[var(--color-primary-container)]" />
                  <p className="text-[12px] font-black uppercase tracking-[0.25em] text-[var(--color-on-surface)]">
                    {items.reduce((t, i) => t + i.quantity, 0)} item{items.reduce((t, i) => t + i.quantity, 0) !== 1 ? "s" : ""} selected
                  </p>
                </div>
              )}
            </div>

            {/* Empty state */}
            {mounted && items.length === 0 && (
              <div className="bg-[var(--color-surface-container-lowest)] border border-[var(--color-outline-variant)]/30 rounded-[3rem] p-16 sm:p-24 text-center shadow-xl shadow-black/5">
                <div className="w-24 h-24 bg-[var(--color-surface-container-low)] rounded-full flex items-center justify-center mx-auto mb-8">
                  <span className="material-symbols-outlined text-[48px] text-[var(--color-outline-variant)]">shopping_basket</span>
                </div>
                <h2 className="text-3xl font-black uppercase tracking-tight text-[var(--color-on-surface)] mb-4">Your basket is empty</h2>
                <p className="text-base text-[var(--color-secondary)] mb-12 max-w-md mx-auto">Looks like you haven't added any designs to your cart yet. Let's find something perfect for you.</p>
                <Link
                  href="/shop"
                  className="inline-flex items-center gap-3 bg-[var(--color-on-background)] text-[var(--color-primary-container)] px-10 py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-xs hover:-translate-y-1 hover:shadow-2xl hover:shadow-[var(--color-primary-container)]/20 transition-all duration-500"
                >
                  Explore Collection
                  <span className="material-symbols-outlined text-[20px]">explore</span>
                </Link>
              </div>
            )}

            {/* Items list */}
            {mounted && items.length > 0 && (
              <div className="space-y-4">
                {items.map((item) => (
                  <div 
                    key={item.id} 
                    className="group relative flex gap-6 sm:gap-10 p-6 sm:p-8 rounded-[2.5rem] bg-[var(--color-surface-container-lowest)] border border-[var(--color-outline-variant)]/20 hover:border-[var(--color-primary-container)] transition-all duration-500 hover:shadow-2xl hover:shadow-black/[0.03]"
                  >
                    {/* Thumbnail */}
                    <div className="w-28 h-28 sm:w-40 sm:h-40 flex-shrink-0 overflow-hidden rounded-3xl bg-[var(--color-surface-container-low)] relative shadow-inner">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="material-symbols-outlined text-[48px] opacity-10">broken_image</span>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 flex flex-col py-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-auto">
                        <div className="min-w-0">
                          <span className="text-[9px] font-black uppercase tracking-[0.3em] text-[var(--color-primary)] mb-2 block">Premium Product</span>
                          <h3 className="text-xl sm:text-2xl font-black leading-tight tracking-tighter text-[var(--color-on-surface)] uppercase truncate">
                            {item.name}
                          </h3>
                          {item.size && (
                            <span className="text-[10px] font-bold text-[var(--color-secondary)] uppercase tracking-widest mt-1 block">
                              Size: {item.size}
                            </span>
                          )}
                          {item.finish && (
                            <span className="text-[10px] font-bold text-[var(--color-secondary)] uppercase tracking-widest mt-0.5 block">
                              Finish: {item.finish}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--color-outline-variant)] hover:text-red-500 hover:bg-red-50 transition-all duration-300 shrink-0"
                          title="Remove item"
                        >
                          <span className="material-symbols-outlined text-[20px]">close</span>
                        </button>
                      </div>

                      <div className="flex flex-wrap items-end justify-between gap-6 mt-6">
                        {/* Quantity selector */}
                        <div className="inline-flex items-center bg-[var(--color-surface-container-low)] p-1 rounded-2xl border border-[var(--color-outline-variant)]/10">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="w-10 h-10 flex items-center justify-center text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-high)] rounded-xl transition-all font-black text-xl"
                          >
                            −
                          </button>
                          <span className="min-w-[40px] text-center text-sm font-black text-[var(--color-on-surface)]">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="w-10 h-10 flex items-center justify-center text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-high)] rounded-xl transition-all font-black text-xl"
                          >
                            +
                          </button>
                        </div>

                        <div className="text-right">
                          <p className="text-[10px] font-bold text-[var(--color-secondary)] uppercase tracking-widest mb-1">Total Price</p>
                          <p className="text-2xl font-black text-[var(--color-on-surface)] tracking-tighter">
                            ₹{(Number(item.price) * item.quantity).toFixed(0)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Order Summary */}
          {mounted && items.length > 0 && (
            <div className="lg:sticky lg:top-32 space-y-6">
              
              {/* Shipping Progress */}
              <div className="bg-[var(--color-surface-container-lowest)] rounded-[2.5rem] p-8 border border-[var(--color-outline-variant)]/30 shadow-sm overflow-hidden relative">
                <div className="relative z-10">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-on-surface)]">Delivery Progress</h3>
                    <span className="text-[10px] font-black uppercase text-[var(--color-primary)]">
                      {subtotal >= 499 ? "Unlocked" : `₹${499 - subtotal} more for FREE shipping`}
                    </span>
                  </div>
                  <div className="h-2 bg-[var(--color-surface-container-low)] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[var(--color-primary-container)] transition-all duration-1000 ease-out"
                      style={{ width: `${Math.min((subtotal / 499) * 100, 100)}%` }}
                    />
                  </div>
                </div>
                {/* Decorative glow */}
                <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-[var(--color-primary-container)] opacity-5 blur-[60px]" />
              </div>

              {/* Summary Card */}
              <div className="bg-[var(--color-on-background)] text-white rounded-[2.5rem] p-8 shadow-2xl shadow-black/20 relative overflow-hidden max-w-full">
                <h2 className="text-[11px] font-black uppercase tracking-[0.4em] text-white/40 mb-10">Order Summary</h2>
                
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-white/60 uppercase tracking-widest">Bag Subtotal</span>
                    <span className="text-base font-black tracking-tight">₹{subtotal.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-white/60 uppercase tracking-widest">Shipping Fee</span>
                    <span className="text-base font-black tracking-tight">
                      {shipping === 0 ? <span className="text-[var(--color-primary-container)]">FREE</span> : `₹${shipping}`}
                    </span>
                  </div>
                  
                  <div className="h-px bg-white/10 my-8" />
                  
                  <div className="flex justify-between items-end mb-10">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 block mb-2">Grand Total</span>
                      <span className="text-4xl font-black tracking-tighter italic">₹{total.toFixed(0)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] font-bold text-white/30 uppercase tracking-[0.1em] block">Incl. all taxes</span>
                    </div>
                  </div>

                  <Link
                    href="/checkout"
                    className="group w-full bg-[var(--color-primary-container)] text-[var(--color-on-background)] font-black uppercase tracking-[0.2em] text-xs py-6 rounded-2xl flex items-center justify-center gap-4 hover:scale-[1.02] active:scale-[0.98] transition-all duration-500 shadow-xl shadow-[var(--color-primary-container)]/10"
                  >
                    Proceed to Checkout
                    <span className="material-symbols-outlined text-[20px] group-hover:translate-x-1 transition-transform">lock</span>
                  </Link>
                  
                  <Link
                    href="/shop"
                    className="w-full text-center text-[10px] font-bold uppercase tracking-[0.3em] text-white/40 hover:text-[var(--color-primary-container)] transition-colors block py-2"
                  >
                    Continue Selection
                  </Link>
                </div>

                {/* Decorative background shapes */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-32 -mt-32" />
              </div>

              {/* Trust Indicators */}
              <div className="flex items-center justify-center gap-8 py-4">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-[var(--color-surface-container-low)] flex items-center justify-center text-[var(--color-secondary)]">
                    <span className="material-symbols-outlined text-[18px]">verified</span>
                  </div>
                  <span className="text-[8px] font-black uppercase tracking-widest text-[var(--color-secondary)]">Authentic</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-[var(--color-surface-container-low)] flex items-center justify-center text-[var(--color-secondary)]">
                    <span className="material-symbols-outlined text-[18px]">shield</span>
                  </div>
                  <span className="text-[8px] font-black uppercase tracking-widest text-[var(--color-secondary)]">Secure</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-[var(--color-surface-container-low)] flex items-center justify-center text-[var(--color-secondary)]">
                    <span className="material-symbols-outlined text-[18px]">package_2</span>
                  </div>
                  <span className="text-[8px] font-black uppercase tracking-widest text-[var(--color-secondary)]">Safe Packing</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
