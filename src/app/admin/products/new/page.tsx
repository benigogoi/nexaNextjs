import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { CATEGORIES_TABLE } from "@/lib/categories";
import ProductForm from "../ProductForm";

export const revalidate = 0;

export default async function AdminNewProductPage() {
  const supabase = await createServerSupabaseClient();
  const { data: categories } = await supabase
    .from(CATEGORIES_TABLE)
    .select("*")
    .order("name", { ascending: true });

  return <ProductForm categories={categories ?? []} />;
}
