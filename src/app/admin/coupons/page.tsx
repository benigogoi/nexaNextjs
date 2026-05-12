import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

export const revalidate = 0;

export default async function AdminCouponsPage() {
  const supabase = await createServerSupabaseClient();
  
  const { data: coupons, error } = await supabase
    .from("coupons")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <header className="flex flex-col gap-6 border-b border-[#2a2a2a] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#808080] mb-2 block">Promotions</span>
          <h1 className="text-4xl font-black uppercase tracking-tighter text-white">Coupons</h1>
        </div>
        <div>
          <Link href="/admin/coupons/new" className="flex items-center gap-3 bg-[#ccff00] text-[#121212] px-6 py-3 hover:bg-white transition-colors group">
            <span className="text-xs font-black uppercase tracking-[0.2em]">Create Coupon</span>
            <span className="material-symbols-outlined text-[18px] group-hover:rotate-90 transition-transform">add</span>
          </Link>
        </div>
      </header>

      {error ? (
        <div className="border border-[#6f2a2a] bg-[#221515] px-6 py-5 text-sm text-[#ff9b9b]">
          Failed to load coupons. Please verify the coupons table schema has been added via the Supabase dashboard.
        </div>
      ) : (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#2a2a2a] bg-[#161616]">
                <th className="p-6 text-[10px] font-bold uppercase tracking-[0.2em] text-[#808080]">Code</th>
                <th className="p-6 text-[10px] font-bold uppercase tracking-[0.2em] text-[#808080]">Discount</th>
                <th className="p-6 text-[10px] font-bold uppercase tracking-[0.2em] text-[#808080]">Min Order</th>
                <th className="p-6 text-[10px] font-bold uppercase tracking-[0.2em] text-[#808080]">Status</th>
                <th className="p-6 text-[10px] font-bold uppercase tracking-[0.2em] text-[#808080] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2a2a]">
              {(!coupons || coupons.length === 0) ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-[#808080] text-sm">
                    No coupons found. Create a new voucher code above.
                  </td>
                </tr>
              ) : coupons.map((coupon) => (
                <tr key={coupon.id} className="hover:bg-[#222222] transition-colors group">
                  <td className="p-6 font-mono font-black text-[#ccff00] text-sm tracking-wider uppercase">{coupon.code}</td>
                  <td className="p-6 text-sm font-bold text-white">
                    {coupon.discount_type === 'percentage' ? `${coupon.discount_value}%` : `₹${coupon.discount_value}`}
                  </td>
                  <td className="p-6 text-xs text-[#a0a0a0]">₹{Number(coupon.min_order_value || 0).toFixed(0)}</td>
                  <td className="p-6">
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-sm ${coupon.is_active ? 'bg-[#ccff00]/10 text-[#ccff00]' : 'bg-[#333333] text-[#a0a0a0]'}`}>
                      {coupon.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="p-6 text-right">
                    <Link
                      href={`/admin/coupons/${coupon.id}`}
                      className="text-[#a0a0a0] hover:text-white p-2 transition-colors inline-flex items-center"
                      title="Edit"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
