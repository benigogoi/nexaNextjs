import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import AdminBundlesTable from "./AdminBundlesTable";

export const revalidate = 0;

export default async function AdminBundlesPage() {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("is_bundle", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[AdminBundles] Fetch error:", error);
  }

  const bundles = data || [];

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <header className="flex flex-col gap-5 border-b border-[#2a2a2a] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#808080] mb-2 block">
            Inventory
          </span>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-white sm:text-4xl">
            Bundles
          </h1>
        </div>
        <Link
          href="/admin/bundles/new"
          className="inline-flex items-center gap-3 bg-[#ccff00] px-6 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-[#121212] transition-colors hover:bg-white self-start sm:self-auto"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          New Bundle
        </Link>
      </header>

      {bundles.length === 0 ? (
        <div className="flex flex-col items-center justify-center border border-dashed border-[#2a2a2a] bg-[#1a1a1a] py-24 text-center">
          <span className="material-symbols-outlined mb-4 text-[48px] text-[#333333]">
            inventory
          </span>
          <p className="mb-2 text-lg font-bold text-white">No bundles yet</p>
          <p className="mb-8 max-w-sm text-sm text-[#808080]">
            Group your products into curated bundles and offer them at a special price.
          </p>
          <Link
            href="/admin/bundles/new"
            className="inline-flex items-center gap-2 bg-[#ccff00] px-6 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-[#121212] transition-colors hover:bg-white"
          >
            <span className="material-symbols-outlined text-[14px]">add</span>
            Create First Bundle
          </Link>
        </div>
      ) : (
        <AdminBundlesTable bundles={bundles} />
      )}
    </div>
  );
}
