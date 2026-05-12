'use client';

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAdminDialog } from "@/components/AdminDialogProvider";
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
  variants: any[] | null;
  status: string | null;
  is_bundle?: boolean;
  bundle_only?: boolean;
  bundle_items?: { product_id: string; quantity: number }[] | null;
  hero_headline?: string | null;
  subheadline?: string | null;
  default_size?: string | null;
  value_points?: string[] | null;
  urgency_tag?: string | null;
  highlight_badge?: string | null;
};

interface AdminProductsTableProps {
  products: ProductRow[];
}

export default function AdminProductsTable({ products }: AdminProductsTableProps) {
  const router = useRouter();
  const { showAlert, showConfirm } = useAdminDialog();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingVariantId, setTogglingVariantId] = useState<string | null>(null);

  const handleToggleVariant = async (product: ProductRow, variantIndex: number) => {
    if (!product.variants) return;
    
    setTogglingVariantId(`${product.id}-${variantIndex}`);
    
    const newVariants = [...product.variants];
    const currentlyActive = newVariants[variantIndex].active !== false;
    newVariants[variantIndex].active = !currentlyActive;

    try {
      const { error } = await supabase
        .from("products")
        .update({ variants: newVariants })
        .eq("id", product.id);

      if (error) throw new Error(error.message);
      router.refresh();
    } catch (error) {
      console.error(error);
      await showAlert("Failed to toggle variant visibility.", "Toggle Failed");
    } finally {
      setTogglingVariantId(null);
    }
  };

  const handleDelete = async (product: ProductRow) => {
    const shouldDelete = await showConfirm(`Delete "${product.name}" from inventory?`, "Delete Product");

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
      await showAlert(error instanceof Error ? error.message : "Something went wrong while deleting the product.", "Delete Failed");
    } finally {
      setDeletingId(null);
    }
  };

  const handleDuplicate = async (product: ProductRow) => {
    const shouldDuplicate = await showConfirm(`Duplicate product "${product.name}"?`, "Duplicate Product");
    if (!shouldDuplicate) return;

    try {
      const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const newSku = `${product.sku}-COPY-${rand}`;
      
      const { error } = await supabase
        .from("products")
        .insert([
          {
            name: `${product.name} (Copy)`,
            sku: newSku,
            category: product.category,
            base_price: product.base_price,
            image_url: product.image_url,
            mockup_urls: product.mockup_urls,
            variants: product.variants,
            status: 'Draft',
            is_bundle: product.is_bundle,
            bundle_only: product.bundle_only,
            bundle_items: product.bundle_items,
            hero_headline: product.hero_headline,
            subheadline: product.subheadline,
            default_size: product.default_size,
            value_points: product.value_points,
            urgency_tag: product.urgency_tag,
            highlight_badge: product.highlight_badge
          }
        ]);

      if (error) throw new Error(error.message);
      await showAlert(`Successfully duplicated as "${product.name} (Copy)" with SKU: ${newSku}`, "Product Duplicated");
      router.refresh();
    } catch (error: unknown) {
      console.error("Error duplicating product:", error);
      await showAlert(error instanceof Error ? error.message : "Duplication failed.", "Error");
    }
  };

  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-[#2a2a2a] bg-[#161616]">
            <th className="p-6 text-[10px] font-bold uppercase tracking-[0.2em] text-[#808080]">Item</th>
            <th className="p-6 text-[10px] font-bold uppercase tracking-[0.2em] text-[#808080]">SKU</th>
            <th className="p-6 text-[10px] font-bold uppercase tracking-[0.2em] text-[#808080]">Category & Variants</th>
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
                  <div>
                    <span className="font-bold text-white text-sm block">{product.name}</span>
                    {product.is_bundle && (
                      <span className="text-[9px] font-bold uppercase tracking-wider text-[#ccff00] bg-[#ccff00]/10 px-2 py-0.5 rounded-sm mt-1 inline-flex items-center gap-1">
                        <span className="material-symbols-outlined text-[11px]">inventory</span>
                        Bundle
                      </span>
                    )}
                    {product.bundle_only && (
                      <span className="text-[9px] font-bold uppercase tracking-wider text-[#808080] bg-[#808080]/10 px-2 py-0.5 rounded-sm mt-1 ml-1 inline-flex items-center gap-1 border border-[#808080]/20">
                        <span className="material-symbols-outlined text-[11px]">visibility_off</span>
                        Bundle Only
                      </span>
                    )}
                  </div>
                </div>
              </td>
              <td className="p-6 text-xs font-mono text-[#a0a0a0]">{product.sku}</td>
              <td className="p-6">
                <div className="text-xs text-[#a0a0a0] mb-2">{product.category ?? "Uncategorized"}</div>
                {product.is_bundle ? (
                  <span className="text-[10px] font-bold text-[#808080]">
                    {product.bundle_items?.length ?? 0} item{(product.bundle_items?.length ?? 0) !== 1 ? "s" : ""} included
                  </span>
                ) : (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {product.variants?.map((v, idx) => {
                      const isActive = v.active !== false;
                      const isToggling = togglingVariantId === `${product.id}-${idx}`;
                      return (
                        <button
                          key={idx}
                          onClick={() => handleToggleVariant(product, idx)}
                          disabled={isToggling}
                          className={`flex items-center gap-1.5 px-2 py-1 rounded transition-colors text-[9px] font-bold uppercase tracking-wider border ${
                            isActive 
                              ? 'border-[#ccff00]/50 bg-[#ccff00]/10 text-[#ccff00] hover:bg-[#ccff00]/20' 
                              : 'border-[#333333] bg-[#1a1a1a] text-[#606060] hover:bg-[#222222]'
                          } ${isToggling ? 'opacity-50 cursor-not-allowed' : ''}`}
                          title={`Toggle ${v.size} visibility`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-[#ccff00]' : 'bg-[#404040]'}`}></span>
                          {v.size}
                        </button>
                      );
                    })}
                  </div>
                )}
              </td>
              <td className="p-6 text-sm font-bold text-white">₹{product.base_price?.toFixed(2) ?? "0.00"}</td>
              <td className="p-6">
                <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-sm ${product.status === 'Active' ? 'bg-[#ccff00]/10 text-[#ccff00]' : 'bg-[#333333] text-[#a0a0a0]'}`}>
                  {product.status ?? "Draft"}
                </span>
              </td>
              <td className="p-6">
                <div className="flex items-center justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => handleDuplicate(product)}
                    className="text-[#a0a0a0] hover:text-[#ccff00] p-2 transition-colors"
                    title="Duplicate Product"
                  >
                    <span className="material-symbols-outlined text-[18px]">content_copy</span>
                  </button>
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
