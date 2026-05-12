"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function NewCouponPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [minOrderValue, setMinOrderValue] = useState("0");
  const [isActive, setIsActive] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !discountValue) {
      setError("Please provide both Code and Discount amount.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { error: insertError } = await supabase
        .from("coupons")
        .insert([
          {
            code: code.trim().toUpperCase(),
            discount_type: discountType,
            discount_value: parseFloat(discountValue),
            min_order_value: parseFloat(minOrderValue),
            is_active: isActive
          }
        ]);

      if (insertError) throw new Error(insertError.message);

      router.push("/admin/coupons");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700 max-w-2xl">
      <header className="relative flex flex-col gap-4 border-b border-[#2a2a2a] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <Link
          href="/admin/coupons"
          className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#808080] transition-colors hover:text-[#ccff00] sm:absolute sm:-top-10 sm:left-0"
        >
          <span className="material-symbols-outlined text-[14px]">arrow_back</span>
          Back to Coupons
        </Link>
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#808080] mb-2 block">Promotions</span>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-white sm:text-4xl">Create Coupon</h1>
        </div>
      </header>

      {error && (
        <div className="p-4 bg-[#221515] border border-[#6f2a2a] text-sm text-[#ff9b9b] font-bold uppercase tracking-tight">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-[#1a1a1a] border border-[#2a2a2a] p-6 sm:p-8 space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#808080]">Coupon Code *</label>
          <input
            type="text"
            required
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. SAVE20"
            className="w-full bg-transparent border-t-0 border-x-0 border-b border-[#333333] focus:border-[#ccff00] focus:ring-0 px-0 py-3 text-white transition-colors font-mono uppercase tracking-widest"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#808080]">Discount Type</label>
            <select
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value)}
              className="w-full bg-[#1a1a1a] border-t-0 border-x-0 border-b border-[#333333] focus:border-[#ccff00] focus:ring-0 px-0 py-3 text-white transition-colors cursor-pointer"
            >
              <option value="percentage">Percentage (%)</option>
              <option value="fixed">Fixed Amount (₹)</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#808080]">Discount Value *</label>
            <input
              type="number"
              required
              min="0"
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              placeholder="20 or 100"
              className="w-full bg-transparent border-t-0 border-x-0 border-b border-[#333333] focus:border-[#ccff00] focus:ring-0 px-0 py-3 text-white font-mono transition-colors"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#808080]">Minimum Order Value (₹)</label>
          <input
            type="number"
            min="0"
            value={minOrderValue}
            onChange={(e) => setMinOrderValue(e.target.value)}
            placeholder="0"
            className="w-full bg-transparent border-t-0 border-x-0 border-b border-[#333333] focus:border-[#ccff00] focus:ring-0 px-0 py-3 text-white font-mono transition-colors"
          />
        </div>

        <div className="flex items-center gap-3 pt-4">
          <input
            type="checkbox"
            id="isActive"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="rounded border-[#333333] bg-transparent text-[#ccff00] focus:ring-[#ccff00]"
          />
          <label htmlFor="isActive" className="text-xs font-bold uppercase tracking-widest text-white cursor-pointer selection:bg-transparent">
            Coupon is Active
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-6 px-8 py-4 text-xs font-black uppercase tracking-widest bg-[#ccff00] text-[#121212] hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-3"
        >
          {loading ? "Creating..." : "Create Coupon"}
          {!loading && <span className="material-symbols-outlined text-[16px]">save</span>}
        </button>
      </form>
    </div>
  );
}
