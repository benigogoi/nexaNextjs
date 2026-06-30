import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import ProductDetailClient from "../../products/[id]/ProductDetailClient";

export const revalidate = 0;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: product } = await supabase
    .from("products")
    .select("id, name, category, image_url, seo_title, meta_description, short_hook")
    .eq("url_slug", slug)
    .single();

  if (!product) {
    return {
      title: "Product Not Found | NexaDesignLab",
    };
  }

  const p = product as any;
  const title = p.seo_title || `${p.name} | NexaDesignLab`;
  const desc = p.meta_description || p.short_hook ||
    `Premium ${p.category || "visual art"} designed for collectors by NexaDesignLab.`;

  return {
    title,
    description: desc,
    openGraph: {
      title,
      description: desc,
      images: p.image_url ? [p.image_url] : [],
    },
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: product, error } = await supabase
    .from("products")
    .select("*")
    .eq("url_slug", slug)
    .single();

  if (error || !product) {
    notFound();
  }

  // Fetch full category info to determine type (Poster/Decal/Sticker)
  let categoryRecord = null;
  if (product.category) {
    const { data: catData } = await supabase
      .from("categories")
      .select("*, parent:parent_id(*)")
      .eq("name", product.category)
      .single();
    categoryRecord = catData;
  }

  const p = product as any;

  let bundleItems = p.is_bundle
    ? Array.isArray(p.bundle_items)
      ? p.bundle_items
      : []
    : [];

  // If it's a bundle, fetch the actual product records for the items to check visibility/bundle_only status
  if (p.is_bundle && bundleItems.length > 0) {
    const itemIds = bundleItems.map((item: any) => item.product_id).filter(Boolean);
    const itemNames = bundleItems.filter((item: any) => !item.product_id).map((item: any) => item.name);
    
    let query = supabase
      .from("products")
      .select("id, name, base_price, image_url, bundle_only, category");

    if (itemIds.length > 0 && itemNames.length > 0) {
      query = query.or(`id.in.(${itemIds.join(',')}),name.in.("${itemNames.join('","')}")`);
    } else if (itemIds.length > 0) {
      query = query.in("id", itemIds);
    } else if (itemNames.length > 0) {
      query = query.in("name", itemNames);
    } else {
      query = null as any;
    }

    if (query) {
      const { data: fullItems } = await query;

      if (fullItems) {
        // Merge full product data with quantity from bundle_items
        bundleItems = bundleItems.map((item: any) => {
          const fullItem = fullItems.find((fi: any) => 
            (item.product_id && fi.id === item.product_id) || 
            (!item.product_id && fi.name === item.name)
          );
          
          return {
            ...item,
            ...(fullItem || {}),
            name: fullItem?.name || item.name,
            price: fullItem?.base_price || item.price,
            image_url: fullItem?.image_url || item.image_url,
            bundle_only: fullItem ? fullItem.bundle_only : false
          };
        });
      }
    }
  }

  let related: any[] = [];
  if (!p.is_bundle) {
    if (related.length < 4) {
      const { data: relatedRaw } = await supabase
        .from("products")
        .select("*")
        .eq("status", "Active")
        .eq("category", p.category)
        .neq("id", p.id)
        .limit(4 - related.length);

      const existingIds = new Set(related.map((r: any) => r.id));
      if (relatedRaw) {
        relatedRaw.forEach((r: any) => {
          if (!existingIds.has(r.id) && r.id !== p.id) related.push(r);
        });
      }
    }

    if (related.length < 4) {
      const { data: otherRaw } = await supabase
        .from("products")
        .select("*")
        .eq("status", "Active")
        .neq("id", p.id)
        .limit(4 - related.length);
      
      const existingIds = new Set(related.map((r: any) => r.id));
      if (otherRaw) {
        otherRaw.forEach((r: any) => {
          if (!existingIds.has(r.id) && r.id !== p.id) related.push(r);
        });
      }
    }
    
    related = related.slice(0, 4);
  }

  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": p.name,
    "description": p.meta_description || p.short_hook || p.product_story || "",
    "image": p.image_url ? [p.image_url] : [],
    "sku": p.sku || p.id,
    "offers": {
      "@type": "Offer",
      "price": p.base_price,
      "priceCurrency": "INR",
      "itemCondition": "https://schema.org/NewCondition",
      "availability": p.status === "Active" ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    }
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Shop",
        "item": "https://nexadesignlab.com/shop"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": p.name,
        "item": `https://nexadesignlab.com/posters/${p.url_slug}`
      }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <ProductDetailClient 
        product={product} 
        related={related} 
        bundleItems={bundleItems} 
        categoryRecord={categoryRecord}
      />
    </>
  );
}
