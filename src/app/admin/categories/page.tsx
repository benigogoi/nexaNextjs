import Link from "next/link";
import AdminCategoriesManager from "@/components/AdminCategoriesManager";
import { CATEGORIES_TABLE, CategoryRecord } from "@/lib/categories";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

export const revalidate = 0;

type ProductCategoryRow = {
  category: string | null;
};

export default async function AdminCategoriesPage() {
  const supabase = await createServerSupabaseClient();

  const [{ data: categories, error: categoriesError }, { data: products, error: productsError }] = await Promise.all([
    supabase
      .from(CATEGORIES_TABLE)
      .select("*")
      .order("name", { ascending: true }),
    supabase
      .from("products")
      .select("category"),
  ]);

  const counts = ((products ?? []) as ProductCategoryRow[]).reduce<Record<string, number>>((acc, product) => {
    if (!product.category) {
      return acc;
    }

    acc[product.category] = (acc[product.category] ?? 0) + 1;
    return acc;
  }, {});

  const categoriesWithCounts = ((categories ?? []) as CategoryRecord[]).map((category) => ({
    ...category,
    productCount: counts[category.name] ?? 0,
  }));

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <header className="flex justify-between items-end border-b border-[#2a2a2a] pb-6">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#808080] mb-2 block">Taxonomy Control</span>
          <h1 className="text-4xl font-black uppercase tracking-tighter text-white">Categories</h1>
        </div>
        <div>
          <Link href="/admin/products/new" className="flex items-center gap-3 border border-[#333333] text-white px-6 py-3 hover:bg-[#222222] transition-colors group">
            <span className="text-xs font-black uppercase tracking-[0.2em]">Back To Products</span>
            <span className="material-symbols-outlined text-[18px]">arrow_outward</span>
          </Link>
        </div>
      </header>

      {categoriesError ? (
        <div className="border border-[#6f2a2a] bg-[#221515] px-6 py-5 text-sm text-[#ff9b9b]">
          Failed to load categories: {categoriesError.message}
        </div>
      ) : null}

      {productsError ? (
        <div className="border border-[#6f4f2a] bg-[#221c15] px-6 py-5 text-sm text-[#ffc98f]">
          Categories loaded, but product usage counts could not be calculated: {productsError.message}
        </div>
      ) : null}

      {!categoriesError ? <AdminCategoriesManager categories={categoriesWithCounts} /> : null}
    </div>
  );
}
