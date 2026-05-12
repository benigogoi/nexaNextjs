import Link from "next/link";
import AdminProductsTable from "@/components/AdminProductsTable";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

export const revalidate = 0;

export default async function AdminProductsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: products, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <header className="flex flex-col gap-6 border-b border-[#2a2a2a] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#808080] mb-2 block">Inventory Management</span>
          <h1 className="text-4xl font-black uppercase tracking-tighter text-white">Products</h1>
        </div>
        <div>
          <Link href="/admin/products/new" className="flex items-center gap-3 bg-[#ccff00] text-[#121212] px-6 py-3 hover:bg-white transition-colors group">
            <span className="text-xs font-black uppercase tracking-[0.2em]">Deploy Product</span>
            <span className="material-symbols-outlined text-[18px] group-hover:rotate-90 transition-transform">add</span>
          </Link>
        </div>
      </header>

      <div className="bg-[#1a1a1a] border border-[#2a2a2a] p-4 flex gap-4 items-center">
        <div className="flex-1 flex items-center gap-3 px-4 border-r border-[#2a2a2a]">
          <span className="material-symbols-outlined text-[#808080]">search</span>
          <input
            type="text"
            placeholder="Search by SKU or Name..."
            className="w-full bg-transparent border-none text-white focus:ring-0 text-sm placeholder:text-[#606060]"
          />
        </div>
        <button className="text-[10px] font-bold uppercase tracking-widest text-[#a0a0a0] hover:text-white px-4">
          Filters
        </button>
      </div>

      {error ? (
        <div className="border border-[#6f2a2a] bg-[#221515] px-6 py-5 text-sm text-[#ff9b9b]">
          Failed to load products: {error.message}
        </div>
      ) : (
        <AdminProductsTable products={products ?? []} />
      )}
    </div>
  );
}
