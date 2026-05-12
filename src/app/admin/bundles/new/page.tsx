import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { CATEGORIES_TABLE } from "@/lib/categories";
import BundleForm from "../BundleForm";

export const revalidate = 0;

export default async function AdminNewBundlePage() {
  const supabase = await createServerSupabaseClient();
  const { data: categories } = await supabase
    .from(CATEGORIES_TABLE)
    .select("*")
    .order("name", { ascending: true });

  return <BundleForm categories={categories ?? []} />;
}
