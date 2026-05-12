import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import BundleForm, { BundleLineItem } from "../BundleForm";

export const revalidate = 0;

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminEditBundlePage({ params }: Props) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: bundle, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .eq("is_bundle", true)
    .single();

  if (error || !bundle) {
    notFound();
  }

  const bundleItems: BundleLineItem[] = Array.isArray(bundle.bundle_items)
    ? bundle.bundle_items.map((item: any) => ({
        product_id: item.product_id,
        name: item.name ?? "",
        price: item.price ?? 0,
        image_url: item.image_url ?? null,
        quantity: item.quantity ?? 1,
      }))
    : [];

  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .order("name", { ascending: true });

  return (
    <BundleForm
      categories={categories ?? []}
      defaultValues={{
        id: bundle.id,
        name: bundle.name,
        sku: bundle.sku,
        category: bundle.category ?? "Bundle",
        base_price: bundle.base_price ?? 0,
        image_url: bundle.image_url ?? null,
        mockup_urls: bundle.mockup_urls ?? [],
        bundle_items: bundleItems,
        status: bundle.status ?? "Active",
        hero_headline: bundle.hero_headline,
        subheadline: bundle.subheadline,
        default_size: bundle.default_size,
        value_points: bundle.value_points,
        urgency_tag: bundle.urgency_tag,
        highlight_badge: bundle.highlight_badge,
      }}
    />
  );
}
