"use client";

import Link from "next/link";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

function OrderSuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("id");
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (orderId) {
      supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single()
        .then(({ data, error }) => {
          if (data) setOrder(data);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [orderId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <span className="material-symbols-outlined animate-spin text-[48px] text-[var(--color-primary)]">progress_activity</span>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-32 space-y-4">
        <h1 className="text-3xl font-black">Order Not Found</h1>
        <Link href="/shop" className="text-[var(--color-primary)] hover:underline font-bold">Return to Shop</Link>
      </div>
    );
  }

  return (
    <>
      {/* Confirmation Header */}
      <section className="max-w-2xl w-full text-center space-y-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[var(--color-primary-container)] mb-4">
          <span className="material-symbols-outlined text-[var(--color-on-background)] text-4xl">check_circle</span>
        </div>
        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase text-[var(--color-on-surface)]">
            Order Confirmed
          </h1>
          <p className="text-[var(--color-secondary)] text-base font-medium max-w-md mx-auto">
            Thanks for shopping with NexaPrint, {order.customer_name.split(' ')[0]}! Your order is being processed.
          </p>
        </div>
      </section>

      {/* Order Summary Grid */}
      <section className="max-w-5xl w-full mt-16 grid grid-cols-1 md:grid-cols-12 gap-8">
        <div className="md:col-span-7 bg-[var(--color-surface-container-lowest)] p-8 rounded-2xl border border-[var(--color-outline-variant)]/30 flex flex-col justify-between shadow-sm">
          <div className="space-y-6">
            <div className="flex justify-between items-start border-b border-[var(--color-outline-variant)]/20 pb-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-secondary)] mb-1">Order ID</p>
                <p className="text-lg font-mono font-black tracking-tight text-[var(--color-on-surface)]">#{order.display_id || order.id.split('-')[0]}</p>
              </div>
              <div className="bg-[var(--color-primary-container)] px-3 py-1 rounded-md">
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-on-background)]">{order.status}</p>
              </div>
            </div>
            <div className="pt-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-secondary)] mb-4">Shipping To</p>
              <p className="text-sm font-bold text-[var(--color-on-surface)] leading-relaxed">
                {order.customer_name}<br />
                {order.shipping_address.line1}<br />
                {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.pincode}
              </p>
            </div>
          </div>
        </div>

        <div className="md:col-span-5 space-y-6">
          <div className="bg-[var(--color-surface-container-low)] p-8 rounded-2xl border border-[var(--color-outline-variant)]/30 h-full flex flex-col">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-secondary)] mb-6">Order Summary</p>
            
            <div className="flex-grow space-y-3 max-h-[200px] overflow-y-auto pr-2 mb-6">
              {order.items.map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center border-b border-[var(--color-outline-variant)]/10 pb-2 last:border-0 last:pb-0">
                  <span className="text-sm font-bold text-[var(--color-on-surface)] truncate pr-4">{item.quantity}x {item.name}</span>
                  <span className="text-sm font-black text-[var(--color-on-surface)] shrink-0">₹{(item.price * item.quantity).toFixed(0)}</span>
                </div>
              ))}
            </div>

            <div className="space-y-3 pt-6 border-t border-[var(--color-outline-variant)]/30 mt-auto">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-[var(--color-secondary)]">Subtotal</span>
                <span className="text-xs font-black text-[var(--color-on-surface)]">₹{Number(order.subtotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-[var(--color-secondary)]">Shipping</span>
                <span className="text-xs font-black text-[var(--color-on-surface)]">₹{Number(order.shipping).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-end pt-4 mt-2 border-t border-[var(--color-outline-variant)]/30">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-on-surface)]">Total Amount</span>
                <span className="text-2xl font-black text-[var(--color-on-surface)] tracking-tighter">₹{Number(order.total).toFixed(0)}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Action Area */}
      <section className="mt-12 flex justify-center">
        <Link href="/shop" className="bg-[var(--color-on-surface)] text-[var(--color-surface)] font-black uppercase text-xs tracking-widest py-4 px-10 rounded-xl hover:-translate-y-0.5 transition-transform duration-200">
          Continue Shopping
        </Link>
      </section>
    </>
  );
}

export default function OrderSuccessPage() {
  return (
    <main className="flex min-h-screen flex-col items-center pt-32 pb-24 px-5 sm:px-8">
      <Suspense fallback={<div className="mt-20"><span className="material-symbols-outlined animate-spin text-[48px] text-[var(--color-primary)]">progress_activity</span></div>}>
        <OrderSuccessContent />
      </Suspense>
    </main>
  );
}
