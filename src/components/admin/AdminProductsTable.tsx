'use client';

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getProductImagePaths, PRODUCT_IMAGES_BUCKET } from "@/lib/productImages";

type ProductRow = {
  id: string;
  sku: string;
  name: string;
  category: string | null;
  base_price: number | null;
  image_url: string | null;
  mockup_urls: string[] | null;
  status: string | null;
};

interface AdminProductsTableProps {
  products: ProductRow[];
}

export default function AdminProductsTable({ products }: AdminProductsTableProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (product: ProductRow) => {
    const shouldDelete = window.confirm(`Delete "${product.name}" from inventory?`);

    if (!shouldDelete) {
      return;
    }

    setDeletingId(product.id);

    try {
      const { error: deleteError } = await supabase
        .from("products")
        .delete()
        .eq("id", product.id);

      if (deleteError) {
        throw new Error(`Delete Error: ${deleteError.message}`);
      }

      const imagePaths = getProductImagePaths([
        product.image_url,
        ...(product.mockup_urls ?? []),
      ]);

      if (imagePaths.length > 0) {
        const { error: storageError } = await supabase.storage
          .from(PRODUCT_IMAGES_BUCKET)
          .remove(imagePaths);

        if (storageError) {
          console.warn("Storage cleanup failed after product deletion:", storageError.message);
        }
      }

      router.refresh();
    } catch (error: unknown) {
      console.error("Error deleting product:", error);
      window.alert(error instanceof Error ? error.message : "Something went wrong while deleting the product.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-[#2a2a2a] bg-[#161616]">
            <th className="p-6 text-[10px] font-bold uppercase tracking-[0.2em] text-[#808080]">Item</th>
            <th className="p-6 text-[10px] font-bold uppercase tracking-[0.2em] text-[#808080]">SKU</th>
            <th className="p-6 text-[10px] font-bold uppercase tracking-[0.2em] text-[#808080]">Category</th>
            <th className="p-6 text-[10px] font-bold uppercase tracking-[0.2em] text-[#808080]">Price</th>
            <th className="p-6 text-[10px] font-bold uppercase tracking-[0.2em] text-[#808080]">Status</th>
            <th className="p-6 text-[10px] font-bold uppercase tracking-[0.2em] text-[#808080] text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#2a2a2a]">
          {products.length === 0 ? (
            <tr>
              <td colSpan={6} className="p-12 text-center text-[#808080] text-sm">
                No products in inventory. Deploy a new product to begin.
              </td>
            </tr>
          ) : null}
          {products.map((product) => (
            <tr key={product.id} className="hover:bg-[#222222] transition-colors group">
              <td className="p-6">
                <div className="flex gap-4 items-center">
                  <div className="w-12 h-12 bg-black overflow-hidden flex-shrink-0">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#333]">
                        <span className="material-symbols-outlined text-[20px]">image</span>
                      </div>
                    )}
                  </div>
                  <span className="font-bold text-white text-sm">{product.name}</span>
                </div>
              </td>
              <td className="p-6 text-xs font-mono text-[#a0a0a0]">{product.sku}</td>
              <td className="p-6 text-xs text-[#a0a0a0]">{product.category ?? "Uncategorized"}</td>
              <td className="p-6 text-sm font-bold text-white">â‚¹{product.base_price?.toFixed(2) ?? "0.00"}</td>
              <td className="p-6">
                <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-sm ${product.status === 'Active' ? 'bg-[#ccff00]/10 text-[#ccff00]' : 'bg-[#333333] text-[#a0a0a0]'}`}>
                  {product.status ?? "Draft"}
                </span>
              </td>
              <td className="p-6">
                <div className="flex items-center justify-end gap-1">
                  <Link
                    href={`/admin/products/${product.id}`}
                    className="text-[#a0a0a0] hover:text-white p-2 transition-colors"
                    title="Edit"
                  >
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDelete(product)}
                    disabled={deletingId === product.id}
                    className="text-[#a0a0a0] hover:text-[#ff3333] p-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Delete"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {deletingId === product.id ? "hourglass_top" : "delete"}
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
