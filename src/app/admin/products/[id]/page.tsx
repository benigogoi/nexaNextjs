import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { CATEGORIES_TABLE } from "@/lib/categories";
import ProductForm, { ProductDefaults } from "../ProductForm";

export const revalidate = 0;

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminEditProductPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: product, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !product) {
    notFound();
  }

  const { data: categories } = await supabase
    .from(CATEGORIES_TABLE)
    .select("*")
    .order("name", { ascending: true });

  const defaultValues: ProductDefaults = {
    id: product.id,
    sku: product.sku,
    name: product.name,
    category: product.category ?? null,
    base_price: product.base_price ?? null,
    image_url: product.image_url ?? null,
    mockup_urls: product.mockup_urls ?? null,
    variants: product.variants ?? null,
    status: product.status ?? null,
    short_hook: product.short_hook ?? null,
    product_story: product.product_story ?? null,
    highlights: product.highlights ?? null,
    seo_title: product.seo_title ?? null,
    meta_description: product.meta_description ?? null,
    url_slug: product.url_slug ?? null,
    focus_keyword: product.focus_keyword ?? null,
    image_alt_text: product.image_alt_text ?? null,
    media_roles: product.media_roles ?? null,
    feature_on_home: product.feature_on_home ?? null,
    bundle_only: product.bundle_only ?? null,
    collection_narrative: product.collection_narrative ?? null,
  };

  return <ProductForm categories={categories ?? []} defaultValues={defaultValues} />;
}
