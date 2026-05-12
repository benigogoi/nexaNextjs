'use client';

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAdminDialog } from "@/components/AdminDialogProvider";
import { supabase } from "@/lib/supabaseClient";
import { getProductImagePaths, PRODUCT_IMAGES_BUCKET } from "@/lib/productImages";

type BundleRow = {
  id: string;
  sku: string;
  name: string;
  base_price: number | null;
  image_url: string | null;
  mockup_urls: string[] | null;
  bundle_items: { product_id: string; quantity: number }[] | null;
  status: string | null;
};

interface Props {
  bundles: BundleRow[];
}

export default function AdminBundlesTable({ bundles }: Props) {
  const router = useRouter();
  const { showAlert, showConfirm } = useAdminDialog();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (bundle: BundleRow) => {
    const shouldDelete = await showConfirm(
      `Delete bundle "${bundle.name}"? This will not delete the individual products inside.`,
      "Delete Bundle"
    );
    if (!shouldDelete) return;

    setDeletingId(bundle.id);
    try {
      const { error } = await supabase.from("products").delete().eq("id", bundle.id);
      if (error) throw new Error(error.message);

      const paths = getProductImagePaths([
        bundle.image_url,
        ...(bundle.mockup_urls ?? []),
      ]);
      if (paths.length > 0) {
        await supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove(paths);
      }

      router.refresh();
    } catch (err) {
      await showAlert(err instanceof Error ? err.message : "Delete failed.", "Error");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] overflow-x-auto">
      <table className="w-full text-left border-collapse min-w-[600px]">
        <thead>
          <tr className="border-b border-[#2a2a2a] bg-[#161616]">
            <th className="p-5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#808080]">Bundle</th>
            <th className="p-5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#808080]">SKU</th>
            <th className="p-5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#808080]">Items</th>
            <th className="p-5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#808080]">Price</th>
            <th className="p-5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#808080]">Status</th>
            <th className="p-5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#808080] text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#2a2a2a]">
          {bundles.map((bundle) => (
            <tr key={bundle.id} className="hover:bg-[#222222] transition-colors group">
              <td className="p-5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-black overflow-hidden flex-shrink-0">
                    {bundle.image_url ? (
                      <img
                        src={bundle.image_url}
                        alt={bundle.name}
                        className="w-full h-full object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#333]">
                        <span className="material-symbols-outlined text-[20px]">inventory</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <span className="font-bold text-white text-sm block">{bundle.name}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#ccff00] bg-[#ccff00]/10 px-2 py-0.5 rounded-sm mt-1 inline-block">
                      Bundle
                    </span>
                  </div>
                </div>
              </td>
              <td className="p-5 text-xs font-mono text-[#a0a0a0]">{bundle.sku}</td>
              <td className="p-5 text-sm text-[#a0a0a0]">
                {bundle.bundle_items?.length ?? 0} item{(bundle.bundle_items?.length ?? 0) !== 1 ? "s" : ""}
              </td>
              <td className="p-5 text-sm font-bold text-white">₹{bundle.base_price?.toFixed(2) ?? "0.00"}</td>
              <td className="p-5">
                <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-sm ${bundle.status === "Active" ? "bg-[#ccff00]/10 text-[#ccff00]" : "bg-[#333333] text-[#a0a0a0]"}`}>
                  {bundle.status ?? "Draft"}
                </span>
              </td>
              <td className="p-5">
                <div className="flex items-center justify-end gap-1">
                  <Link
                    href={`/admin/bundles/${bundle.id}`}
                    className="text-[#a0a0a0] hover:text-white p-2 transition-colors"
                    title="Edit"
                  >
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDelete(bundle)}
                    disabled={deletingId === bundle.id}
                    className="text-[#a0a0a0] hover:text-[#ff3333] p-2 transition-colors disabled:opacity-40"
                    title="Delete"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {deletingId === bundle.id ? "hourglass_top" : "delete"}
                    </span>
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
