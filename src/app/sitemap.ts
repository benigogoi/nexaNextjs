import { MetadataRoute } from 'next';
import { createServerSupabaseClient } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://nexadesignlab.com';
  
  // 1. Static Storefront Routes
  const staticPaths = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 1.0 },
    { url: `${baseUrl}/shop`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 0.9 },
    { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.5 },
    { url: `${baseUrl}/contact`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.5 },
  ];

  // 2. Dynamic Product Routes (Posters & Bundles)
  let productPaths: any[] = [];
  try {
    const supabase = await createServerSupabaseClient();
    const { data: products } = await supabase
      .from('products')
      .select('url_slug, id, created_at')
      .eq('status', 'Active')
      .eq('bundle_only', false);

    if (products) {
      productPaths = products.map((prod) => ({
        url: `${baseUrl}/posters/${prod.url_slug || prod.id}`,
        lastModified: new Date(prod.created_at || Date.now()),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      }));
    }
  } catch (err) {
    console.error('Error generating products sitemap:', err);
  }

  // 3. Dynamic Category/Collection Routes
  let categoryPaths: any[] = [];
  try {
    const supabase = await createServerSupabaseClient();
    const { data: dbCategories } = await supabase.from('categories').select('*');
    const { data: activeProductCats } = await supabase
      .from("products")
      .select("category")
      .eq("status", "Active")
      .eq("bundle_only", false);
    
    if (dbCategories && activeProductCats) {
      const activeCatNames = new Set(activeProductCats.map(p => p.category));
      
      // Exclude decals, stickers and empty categories
      const activeCategories = dbCategories.filter(
        (c: any) => 
          c.is_visible !== false && 
          c.category_type !== 'decal' && 
          c.category_type !== 'sticker' &&
          !c.name.toLowerCase().includes("decal") &&
          !c.name.toLowerCase().includes("sticker") &&
          (c.parent_id === null || activeCatNames.has(c.name))
      );

      categoryPaths = activeCategories.map((cat) => {
        const slug = cat.slug || cat.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        
        // Main category vs subcategory query param structure
        const href = cat.parent_id 
          ? `${baseUrl}/shop?category=posters&series=${slug}`
          : `${baseUrl}/shop?category=${slug}`;

        return {
          url: href,
          lastModified: new Date(cat.created_at || Date.now()),
          changeFrequency: 'weekly' as const,
          priority: 0.7,
        };
      });
    }
  } catch (err) {
    console.error('Error generating categories sitemap:', err);
  }

  return [...staticPaths, ...productPaths, ...categoryPaths];
}
