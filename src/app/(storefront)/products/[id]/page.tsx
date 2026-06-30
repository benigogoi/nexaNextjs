import { permanentRedirect, notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProductRedirectPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: product } = await supabase
    .from("products")
    .select("url_slug, id")
    .eq("id", id)
    .single();

  if (!product) {
    notFound();
  }

  // Redirect to slug if exists, otherwise fallback to ID
  const slug = product.url_slug || product.id;
  permanentRedirect(`/posters/${slug}`);
}
