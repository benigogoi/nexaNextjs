"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminDialog } from "@/components/AdminDialogProvider";
import { CATEGORIES_TABLE, CategoryRecord, slugifyCategoryName } from "@/lib/categories";
import { supabase } from "@/lib/supabaseClient";

const MAX_GALLERY_IMAGES = 8;

export default function AdminNewProductPage() {
  const router = useRouter();
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const { showAlert } = useAdminDialog();
  
  const [loading, setLoading] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);

  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatParent, setNewCatParent] = useState("");
  const [addingCategoryData, setAddingCategoryData] = useState(false);

  const [decalBaseSize, setDecalBaseSize] = useState("");
  const [decalVariants, setDecalVariants] = useState<{size: string, price: string}[]>([]);

  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    price: "", // A4 Frameless (Base Price)
    framedPrice: "", // A4 Framed
    a3Price: "",
    a3FramedPrice: "",
    a3PlusPrice: "",
    a3PlusFramedPrice: "",
    category: "",
  });

  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [mediaRoles, setMediaRoles] = useState<{[key: string]: string}>({});
  const [structuredContent, setStructuredContent] = useState({
    short_hook: "",
    product_story: "",
    highlights: [""],
    seo: {
      seo_title: "",
      meta_description: "",
      url_slug: "",
      focus_keyword: "",
      image_alt_text: "",
    },
      merchandising: {
        related_products: [] as string[],
        bundle_pairing: [] as string[],
        feature_on_home: false,
        bundle_only: false,
        collection_narrative: "",
      },
  });

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const { data, error } = await supabase
          .from(CATEGORIES_TABLE)
          .select("*")
          .order("name", { ascending: true });

        if (error) {
          throw new Error(error.message);
        }

        const loadedCategories = (data ?? []) as CategoryRecord[];
        
        // Ensure parent categories come first or organize logic
        // Ensure a subcategory is selected by default, not a parent category
        const firstSubCategory = loadedCategories.find(c => c.parent_id);
        setCategories(loadedCategories);
        setFormData((prev) => ({
          ...prev,
          category: prev.category || (firstSubCategory ? firstSubCategory.name : ""),
        }));
      } catch (error: unknown) {
        console.error("Error loading categories:", error);
        setCategoriesError(error instanceof Error ? error.message : "Failed to load categories.");
      } finally {
        setCategoriesLoading(false);
      }
    };

    const loadProducts = async () => {
      const { data } = await supabase.from("products").select("id, name, sku, is_bundle").eq("status", "Active");
      setAllProducts(data || []);
    };

    void loadCategories();
    void loadProducts();
  }, []);

  const topLevelCategories = categories.filter(c => !c.parent_id);
  const getSubcategories = (parentId: string) => categories.filter(c => c.parent_id === parentId);

  const handleQuickAddCategory = async () => {
    const trimmed = newCatName.trim();
    if (!trimmed || !newCatParent) {
      await showAlert("Please enter a category name and select a main parent category.", "Missing Info");
      return;
    }

    const slug = slugifyCategoryName(trimmed);
    if (!slug) {
      await showAlert("Invalid category name.", "Invalid Name");
      return;
    }

    setAddingCategoryData(true);

    try {
      const { error } = await supabase
        .from(CATEGORIES_TABLE)
        .insert([{ name: trimmed, slug, parent_id: newCatParent }]);

      if (error) throw new Error(error.message);

      // fetch updated categories immediately
      const { data } = await supabase.from(CATEGORIES_TABLE).select("*").order("name", { ascending: true });
      const loaded = (data ?? []) as CategoryRecord[];
      
      setCategories(loaded);
      setFormData(prev => ({ ...prev, category: trimmed }));
      setIsAddingCategory(false);
      setNewCatName("");
      setNewCatParent("");
      
    } catch (error: unknown) {
      console.error("Error creating category:", error);
      await showAlert(error instanceof Error ? error.message : "Failed to create category.", "Create Failed");
    } finally {
      setAddingCategoryData(false);
    }
  };

  const isDecalCategory = (() => {
    const selectedCat = categories.find(c => c.name === formData.category);
    if (!selectedCat) return false;
    
    // 1. Strict DB Type Check
    if (selectedCat.category_type === 'decal' || selectedCat.category_type === 'sticker') return true;
    
    const parent = categories.find(c => c.id === selectedCat.parent_id);
    if (parent && (parent.category_type === 'decal' || parent.category_type === 'sticker')) return true;

    // 2. Fallback String Check (for transition)
    const catName = selectedCat.name.toLowerCase();
    const parentName = parent?.name.toLowerCase() || "";
    const prodName = formData.name.toLowerCase();

    if (catName.includes("decal") || catName.includes("sticker")) return true;
    if (parentName.includes("decal") || parentName.includes("sticker")) return true;
    if (prodName.includes("decal") || prodName.includes("sticker")) return true;
    
    return false;
  })();

  const isPosterCategory = (() => {
    // If identified as decal, it's not a poster
    if (isDecalCategory) return false;

    const selectedCat = categories.find(c => c.name === formData.category);
    if (!selectedCat) return false;
    
    // 1. Strict DB Type Check
    if (selectedCat.category_type === 'poster') return true;
    
    const parent = categories.find(c => c.id === selectedCat.parent_id);
    if (parent && parent.category_type === 'poster') return true;

    // 2. Fallback String Check
    const catName = selectedCat.name.toLowerCase();
    const parentName = parent?.name.toLowerCase() || "";
    if (catName.includes("poster") || catName.includes("series")) return true;
    if (parentName.includes("poster") || parentName.includes("series")) return true;
    
    return false;
  })();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const updateDecalVariant = (index: number, field: 'size' | 'price', value: string) => {
    const updated = [...decalVariants];
    updated[index][field] = value;
    setDecalVariants(updated);
  };

  const removeDecalVariant = (index: number) => {
    setDecalVariants(prev => prev.filter((_, i) => i !== index));
  };

  const handleGalleryChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (galleryFiles.length + files.length > MAX_GALLERY_IMAGES) {
      await showAlert(`You can only upload a maximum of ${MAX_GALLERY_IMAGES} gallery images.`, "Gallery Limit");
      return;
    }

    setGalleryFiles(prev => [...prev, ...files]);
    setGalleryPreviews(prev => [...prev, ...files.map((file) => URL.createObjectURL(file))]);
    
    if (galleryInputRef.current) galleryInputRef.current.value = "";
  };

  const removeGalleryImage = (index: number) => {
    setGalleryFiles((prev) => prev.filter((_, i) => i !== index));
    setGalleryPreviews((prev) => {
      const previewToRemove = prev[index];
      if (previewToRemove) {
        URL.revokeObjectURL(previewToRemove);
      }

      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    handleFormSubmit(e, 'Active');
  };

  const handleFormSubmit = async (e: React.FormEvent, status: 'Active' | 'Draft') => {
    e.preventDefault();
    if (!formData.name || !formData.sku || !formData.price || !formData.category || galleryFiles.length === 0) {
      await showAlert("Please fill all required fields and upload at least one product image.", "Missing Information");
      return;
    }

    const selectedCat = categories.find(c => c.name === formData.category);
    if (!selectedCat || !selectedCat.parent_id) {
      await showAlert("Please select a valid subcategory for this product. You cannot assign products directly to a Main Category.", "Invalid Category");
      return;
    }

    setLoading(true);

    try {
      const uploadStamp = Date.now();
      const uploadedUrls = await Promise.all(
        galleryFiles.map(async (file, index) => {
          const ext = file.name.split(".").pop();
          const imageName = `${formData.sku}-gallery-${index}-${uploadStamp}.${ext}`;
        
          const { error } = await supabase.storage
            .from("product-images")
            .upload(imageName, file, { cacheControl: "3600", upsert: false });

          if (error) throw new Error(`Image Upload Error (${file.name}): ${error.message}`);

          const { data: { publicUrl } } = supabase.storage
            .from("product-images")
            .getPublicUrl(imageName);
          
          return publicUrl;
        })
      );

      const [primaryPublicUrl, ...mockupUrls] = uploadedUrls;

      let variantsJson: any[] = [];
      if (isPosterCategory) {
        variantsJson = [
          { 
            size: "A4", 
            frameless_price: parseFloat(formData.price || "0"), 
            framed_price: formData.framedPrice ? parseFloat(formData.framedPrice) : null,
            active: true
          },
          { 
            size: "A3 (12x18)", 
            frameless_price: formData.a3Price ? parseFloat(formData.a3Price) : null, 
            framed_price: formData.a3FramedPrice ? parseFloat(formData.a3FramedPrice) : null,
            active: true
          },
          { 
            size: "A3+ (13x19)", 
            frameless_price: formData.a3PlusPrice ? parseFloat(formData.a3PlusPrice) : null, 
            framed_price: formData.a3PlusFramedPrice ? parseFloat(formData.a3PlusFramedPrice) : null,
            active: true
          }
        ].filter(v => v.frameless_price !== null);
      } else if (isDecalCategory) {
        variantsJson = [
          {
            size: decalBaseSize || "4 inch",
            price: parseFloat(formData.price || "0"),
            active: true
          },
          ...decalVariants.filter(v => v.size && v.price).map(v => ({
            size: v.size,
            price: parseFloat(v.price),
            active: true
          }))
        ];
      } else {
        // Fallback for generic products
        variantsJson = [
          {
            size: "Standard",
            price: parseFloat(formData.price || "0"),
            active: true
          }
        ];
      }

      // Resolve image roles
      const finalMediaRoles: {[key: string]: string} = {};
      uploadedUrls.forEach((url, index) => {
        const originalName = galleryFiles[index]?.name || String(index);
        finalMediaRoles[url] = mediaRoles[originalName] || (index === 0 ? "cover image" : "gallery image");
      });

      // Resolve parent category and type for architectural integrity
      const selectedCat = categories.find(c => c.name === formData.category);
      const parentCat = selectedCat ? categories.find(c => c.id === selectedCat.parent_id) : null;
      const parentCategoryName = parentCat ? parentCat.name : null;
      const finalType = selectedCat?.category_type || parentCat?.category_type || (isPosterCategory ? 'poster' : isDecalCategory ? 'decal' : 'other');

      const { error: dbError } = await supabase
        .from('products')
        .insert([
          {
            sku: formData.sku,
            name: formData.name,
            category: formData.category,
            parent_category: parentCategoryName,
            category_type: finalType,
            base_price: parseFloat(formData.price),
            image_url: primaryPublicUrl,
            mockup_urls: mockupUrls,
            variants: variantsJson,
            status: status,
            // Flat content columns
            short_hook: structuredContent.short_hook || null,
            product_story: structuredContent.product_story || null,
            highlights: structuredContent.highlights.filter(h => h.trim()).length > 0
              ? structuredContent.highlights.filter(h => h.trim())
              : null,
            // Flat SEO columns
            seo_title: structuredContent.seo.seo_title || null,
            meta_description: structuredContent.seo.meta_description || null,
            url_slug: structuredContent.seo.url_slug || null,
            focus_keyword: structuredContent.seo.focus_keyword || null,
            image_alt_text: structuredContent.seo.image_alt_text || null,
            // Media roles
            media_roles: Object.keys(finalMediaRoles).length > 0 ? finalMediaRoles : null,
            bundle_only: structuredContent.merchandising.bundle_only,
          }
        ]);

      if (dbError) throw new Error(`Database Error: ${dbError.message}`);

      router.push('/admin/products');
      router.refresh();
      
    } catch (error: unknown) {
      console.error("Error committing to database:", error);
      await showAlert(error instanceof Error ? error.message : "Something went wrong while saving the product.", "Save Failed");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-700 max-w-4xl">
      <header className="relative flex flex-col gap-4 border-b border-[#2a2a2a] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <Link href="/admin/products" className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#808080] transition-colors hover:text-[#ccff00] sm:absolute sm:-top-10 sm:left-0">
          <span className="material-symbols-outlined text-[14px]">arrow_back</span>
          Back to Inventory
        </Link>
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#808080] mb-2 block">SKU Deployment</span>
          <h1 className="text-4xl font-black uppercase tracking-tighter text-white">New Product</h1>
        </div>
      </header>

      <form className="space-y-12" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Main Info */}
          <div className="space-y-8 md:col-span-2 bg-[#1a1a1a] border border-[#2a2a2a] p-8">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-white border-b border-[#2a2a2a] pb-4 mb-6">Product Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#808080]">Product Name *</label>
                <input 
                  type="text" 
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full bg-transparent border-t-0 border-x-0 border-b border-[#333333] focus:border-[#ccff00] focus:ring-0 px-0 py-3 text-white transition-colors" 
                  placeholder="e.g. Apex Velocity Stripe" 
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#808080]">Product SKU *</label>
                  <button 
                    type="button" 
                    onClick={() => {
                      const namePrefix = formData.name.replace(/\s+/g, '').slice(0, 3).toUpperCase() || "PRD";
                      const catPrefix = formData.category.replace(/\s+/g, '').slice(0, 2).toUpperCase() || "XX";
                      const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
                      setFormData(prev => ({ ...prev, sku: `NX-${catPrefix}-${namePrefix}-${rand}` }));
                    }}
                    className="text-[9px] font-bold uppercase tracking-widest text-[#ccff00] hover:text-white transition-colors"
                  >
                    Auto-Generate
                  </button>
                </div>
                <input 
                  type="text" 
                  name="sku"
                  value={formData.sku}
                  onChange={handleInputChange}
                  required
                  className="w-full bg-transparent border-t-0 border-x-0 border-b border-[#333333] focus:border-[#ccff00] focus:ring-0 px-0 py-3 text-white transition-colors font-mono uppercase" 
                  placeholder="e.g. NX-PF-001" 
                />
              </div>

              {/* Structured Content Fields */}
              <div className="space-y-2 md:col-span-2 pt-4 border-t border-[#2a2a2a]">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#ccff00]">Short Hook *</label>
                <input 
                  type="text"
                  value={structuredContent.short_hook}
                  onChange={(e) => setStructuredContent(prev => ({ ...prev, short_hook: e.target.value }))}
                  placeholder="Appears right below the product title on the storefront"
                  className="w-full bg-transparent border-t-0 border-x-0 border-b border-[#333333] focus:border-[#ccff00] focus:ring-0 px-0 py-3 text-white transition-colors"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#ccff00]">Product Story (Long Narrative) *</label>
                <textarea 
                  value={structuredContent.product_story}
                  onChange={(e) => setStructuredContent(prev => ({ ...prev, product_story: e.target.value }))}
                  rows={5} 
                  className="w-full bg-transparent border-t-0 border-x-0 border-b border-[#333333] focus:border-[#ccff00] focus:ring-0 px-0 py-3 text-white transition-colors resize-none" 
                  placeholder="Tell the deep story behind this collectible piece..."
                ></textarea>
              </div>

              {/* Repeatable Highlights */}
              <div className="space-y-4 md:col-span-2 pt-4 border-t border-[#2a2a2a]">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#ccff00]">Key Highlights</label>
                  <button 
                    type="button"
                    onClick={() => setStructuredContent(prev => ({ ...prev, highlights: [...prev.highlights, ""] }))}
                    className="text-[9px] font-bold uppercase tracking-widest text-[#ccff00] hover:text-white flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[12px]">add</span> Add Highlight
                  </button>
                </div>
                
                <div className="space-y-2">
                  {structuredContent.highlights.map((highlight, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <input 
                        type="text"
                        value={highlight}
                        onChange={(e) => {
                          const newHighlights = [...structuredContent.highlights];
                          newHighlights[index] = e.target.value;
                          setStructuredContent(prev => ({ ...prev, highlights: newHighlights }));
                        }}
                        placeholder={`Highlight bullet point #${index + 1}`}
                        className="w-full bg-transparent border-t-0 border-x-0 border-b border-[#333333] focus:border-[#ccff00] focus:ring-0 px-0 py-2 text-white text-sm transition-colors"
                      />
                      {structuredContent.highlights.length > 1 && (
                        <button 
                          type="button"
                          onClick={() => setStructuredContent(prev => ({ ...prev, highlights: prev.highlights.filter((_, i) => i !== index) }))}
                          className="text-[#808080] hover:text-[#ff3333] transition-colors"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>



              {/* Dedicated SEO Module */}
              <div className="space-y-6 md:col-span-2 pt-6 border-t border-[#2a2a2a]">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#ccff00] block">SEO Module</label>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#808080]">SEO Title</label>
                    <input 
                      type="text"
                      value={structuredContent.seo.seo_title}
                      onChange={(e) => setStructuredContent(prev => ({
                        ...prev, 
                        seo: { ...prev.seo, seo_title: e.target.value }
                      }))}
                      placeholder="e.g. Apex Velocity Stripe | Premium Art Print"
                      className="w-full bg-[#121212] border border-[#333333] focus:border-[#ccff00] px-3 py-2 text-white text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#808080]">Focus Keyword</label>
                    <input 
                      type="text"
                      value={structuredContent.seo.focus_keyword}
                      onChange={(e) => setStructuredContent(prev => ({
                        ...prev, 
                        seo: { ...prev.seo, focus_keyword: e.target.value }
                      }))}
                      placeholder="e.g. automotive poster"
                      className="w-full bg-[#121212] border border-[#333333] focus:border-[#ccff00] px-3 py-2 text-white text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#808080]">URL Slug Override</label>
                    <input 
                      type="text"
                      value={structuredContent.seo.url_slug}
                      onChange={(e) => setStructuredContent(prev => ({
                        ...prev, 
                        seo: { ...prev.seo, url_slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }
                      }))}
                      placeholder="e.g. apex-velocity-stripe"
                      className="w-full bg-[#121212] border border-[#333333] focus:border-[#ccff00] px-3 py-2 text-white font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#808080]">Image Alt Text</label>
                    <input 
                      type="text"
                      value={structuredContent.seo.image_alt_text}
                      onChange={(e) => setStructuredContent(prev => ({
                        ...prev, 
                        seo: { ...prev.seo, image_alt_text: e.target.value }
                      }))}
                      placeholder="Describe image for screen readers and SEO..."
                      className="w-full bg-[#121212] border border-[#333333] focus:border-[#ccff00] px-3 py-2 text-white text-sm"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#808080]">Meta Description</label>
                    <textarea 
                      value={structuredContent.seo.meta_description}
                      onChange={(e) => setStructuredContent(prev => ({
                        ...prev, 
                        seo: { ...prev.seo, meta_description: e.target.value }
                      }))}
                      rows={2}
                      placeholder="Enter an engaging snippet for search engine results..."
                      className="w-full bg-[#121212] border border-[#333333] focus:border-[#ccff00] px-3 py-2 text-white text-sm resize-none"
                    ></textarea>
                  </div>
                </div>

                {/* Google Snippet Preview */}
                <div className="p-4 bg-[#0d0d0d] border border-[#222222] mt-4">
                  <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-[#808080] mb-2 block">Google Search Snippet Preview</span>
                  <div className="text-[#1a0dab] text-lg font-normal hover:underline cursor-pointer truncate">
                    {structuredContent.seo.seo_title || formData.name || "Product Name | Nexa Design Lab"}
                  </div>
                  <div className="text-[#006621] text-xs font-normal mt-0.5 truncate">
                    https://nexadesignlab.com/products/{structuredContent.seo.url_slug || formData.sku.toLowerCase() || "product-id"}
                  </div>
                  <div className="text-[#545454] text-xs font-normal mt-1 line-clamp-2 leading-relaxed">
                    {structuredContent.seo.meta_description || "Premium visual art designed for collectors by Nexa Design Lab. Discover museum-grade archival prints."}
                  </div>
                </div>
              </div>


              
              <div className="space-y-4 md:col-span-2 pt-4 border-t border-[#2a2a2a]">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#808080] block">System Category *</label>
                  <button 
                    type="button" 
                    onClick={() => setIsAddingCategory(!isAddingCategory)}
                    className="text-[10px] font-bold uppercase tracking-widest text-[#ccff00] hover:text-white transition-colors flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[14px]">{isAddingCategory ? "close" : "add"}</span>
                    {isAddingCategory ? "Cancel" : "Quick Add Subcategory"}
                  </button>
                </div>
                
                {isAddingCategory && (
                  <div className="bg-[#151515] border border-[#ccff00]/30 p-4 space-y-4 mb-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ccff00] border-b border-[#2a2a2a] pb-2">New Collection</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <select 
                          value={newCatParent} 
                          onChange={(e) => setNewCatParent(e.target.value)}
                          className="w-full bg-[#1a1a1a] border border-[#333333] focus:border-[#ccff00] focus:ring-0 text-white p-2 text-sm"
                        >
                          <option value="" disabled hidden>Select Main Category...</option>
                          {topLevelCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <input 
                          type="text" 
                          value={newCatName} 
                          onChange={(e) => setNewCatName(e.target.value)} 
                          placeholder="e.g. Vintage Series"
                          className="w-full bg-[#1a1a1a] border border-[#333333] focus:border-[#ccff00] focus:ring-0 text-white p-2 text-sm"
                        />
                      </div>
                    </div>
                    <button 
                      type="button" 
                      onClick={handleQuickAddCategory}
                      disabled={addingCategoryData}
                      className="w-full bg-[#ccff00] text-[#121212] font-bold text-[10px] uppercase tracking-widest py-2 hover:bg-white transition-colors disabled:opacity-50"
                    >
                      {addingCategoryData ? "Adding..." : "Save Subcategory"}
                    </button>
                  </div>
                )}
                
                <select 
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  required
                  disabled={categoriesLoading || categories.length === 0}
                  className="w-full bg-[#121212] border border-[#333333] text-white focus:border-[#ccff00] focus:ring-0 p-3 text-sm"
                >
                  {categoriesLoading ? <option>Loading categories...</option> : null}
                  {!categoriesLoading && categories.length === 0 ? <option value="">No categories found</option> : null}
                  {topLevelCategories.map((category) => (
                    <optgroup key={category.id} label={category.name}>
                      <option value={category.name} disabled>{category.name} (Main Type - Select Subcategory Below)</option>
                      {getSubcategories(category.id).map((sub) => (
                        <option key={sub.id} value={sub.name}>
                          --- {sub.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                {categoriesError ? (
                  <div className="text-[10px] text-[#ff9b9b]">
                    Failed to load categories: {categoriesError}. Create them in{" "}
                    <Link href="/admin/categories" className="text-[#ccff00] hover:text-white transition-colors">
                      Categories
                    </Link>.
                  </div>
                ) : null}
                {!categoriesLoading && categories.length === 0 && !categoriesError ? (
                  <div className="text-[10px] text-[#808080]">
                    No categories available yet. Add one from{" "}
                    <Link href="/admin/categories" className="text-[#ccff00] hover:text-white transition-colors">
                      Categories
                    </Link>{" "}
                    before creating a product.
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* Visibility & Merchandising */}
          <div className="space-y-8 md:col-span-2 bg-[#1a1a1a] border border-[#2a2a2a] p-8">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-white border-b border-[#2a2a2a] pb-4 mb-6">Visibility & Merchandising</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-[#121212] border border-[#333333] hover:border-[#ccff00]/50 transition-colors group cursor-pointer"
                     onClick={() => setStructuredContent(prev => ({
                       ...prev,
                       merchandising: { ...prev.merchandising, bundle_only: !prev.merchandising.bundle_only }
                     }))}>
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white">Sold Only as Bundle</div>
                    <div className="text-[9px] text-[#808080] uppercase tracking-wider">Hide from individual storefront listings</div>
                  </div>
                  <div className={`w-10 h-5 rounded-full relative transition-colors ${structuredContent.merchandising.bundle_only ? 'bg-[#ccff00]' : 'bg-[#333333]'}`}>
                    <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${structuredContent.merchandising.bundle_only ? 'left-6' : 'left-1'}`}></div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-[#121212] border border-[#333333] hover:border-[#ccff00]/50 transition-colors group cursor-pointer"
                     onClick={() => setStructuredContent(prev => ({
                       ...prev,
                       merchandising: { ...prev.merchandising, feature_on_home: !prev.merchandising.feature_on_home }
                     }))}>
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white">Feature on Home</div>
                    <div className="text-[9px] text-[#808080] uppercase tracking-wider">Promote in the main cinematic gallery</div>
                  </div>
                  <div className={`w-10 h-5 rounded-full relative transition-colors ${structuredContent.merchandising.feature_on_home ? 'bg-[#ccff00]' : 'bg-[#333333]'}`}>
                    <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${structuredContent.merchandising.feature_on_home ? 'left-6' : 'left-1'}`}></div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#808080]">Collection Narrative</label>
                <textarea 
                  value={structuredContent.merchandising.collection_narrative}
                  onChange={(e) => setStructuredContent(prev => ({
                    ...prev,
                    merchandising: { ...prev.merchandising, collection_narrative: e.target.value }
                  }))}
                  rows={4}
                  className="w-full bg-transparent border-t-0 border-x-0 border-b border-[#333333] focus:border-[#ccff00] focus:ring-0 px-0 py-3 text-white transition-colors resize-none text-sm" 
                  placeholder="How does this product fit into its wider collection? (Optional)"
                ></textarea>
              </div>
            </div>
          </div>

          <div className="space-y-8 bg-[#1a1a1a] border border-[#2a2a2a] p-8">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-white border-b border-[#2a2a2a] pb-4 mb-6">Pricing & Variants</h2>
            
            <div className="space-y-6">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#808080]">
                    {isPosterCategory ? "Base Price (A4 Frameless) *" : isDecalCategory ? "Base Price (Smallest Size) *" : "Base Price (INR) *"}
                  </label>
                  <div className="relative">
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 text-[#808080] font-mono">₹</span>
                    <input 
                      type="number" 
                      name="price"
                      value={formData.price}
                      onChange={handleInputChange}
                      required
                      step="0.01" 
                      min="0"
                      className="w-full bg-transparent border-t-0 border-x-0 border-b border-[#333333] focus:border-[#ccff00] focus:ring-0 pl-6 px-0 py-3 text-white transition-colors font-mono" 
                      placeholder="0.00" 
                    />
                  </div>
                </div>

                {isDecalCategory && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-4 duration-500 pb-2">
                    <div className="p-4 border border-[#ccff00]/30 bg-[#ccff00]/5 flex items-start gap-4">
                      <span className="material-symbols-outlined text-[#ccff00] mt-1 text-[20px]">straighten</span>
                      <div className="flex-1 space-y-4">
                        <div>
                          <h3 className="text-sm font-bold text-white uppercase tracking-tight">Decal Sizing Variants</h3>
                          <p className="text-[10px] text-[#a0a0a0] leading-relaxed mt-1 tracking-wide">
                            Define dynamic sizes for this decal. The base size will map directly to the Base Price you set above.
                          </p>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 pt-2 border-t border-[#ccff00]/20 mt-2">
                          <div className="space-y-2">
                            <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#808080]">Base Size</label>
                            <input 
                              type="text" 
                              value={decalBaseSize}
                              onChange={(e) => setDecalBaseSize(e.target.value)}
                              className="w-full bg-[#121212] border border-[#333333] focus:border-[#ccff00] px-3 py-2 text-white font-mono text-sm" 
                              placeholder="e.g. 4 inch" 
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#808080]">Base Price</label>
                            <input 
                              type="number" 
                              value={formData.price}
                              disabled
                              className="w-full bg-[#121212] border border-[#333333] text-[#808080] px-3 py-2 font-mono text-sm cursor-not-allowed" 
                              placeholder="Set Base Price above" 
                            />
                          </div>
                        </div>

                        {decalVariants.map((variant, index) => (
                          <div key={index} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-x-4 gap-y-4 items-end relative">
                            <div className="space-y-2">
                              <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#808080]">Additional Size</label>
                              <input 
                                type="text" 
                                value={variant.size}
                                onChange={(e) => updateDecalVariant(index, 'size', e.target.value)}
                                className="w-full bg-[#121212] border border-[#333333] focus:border-[#ccff00] px-3 py-2 text-white font-mono text-sm" 
                                placeholder="e.g. 6 inch" 
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#808080]">Price (INR)</label>
                              <div className="relative">
                                <span className="absolute left-0 top-1/2 -translate-y-1/2 text-[#808080] font-mono px-3">₹</span>
                                <input 
                                  type="number" 
                                  value={variant.price}
                                  onChange={(e) => updateDecalVariant(index, 'price', e.target.value)}
                                  step="0.01" min="0"
                                  className="w-full bg-[#121212] border border-[#333333] focus:border-[#ccff00] pl-8 px-3 py-2 text-white font-mono text-sm" 
                                  placeholder="0.00" 
                                />
                              </div>
                            </div>
                            <button 
                              type="button" 
                              onClick={() => removeDecalVariant(index)}
                              className="bg-[#2a2a2a] hover:bg-[#ff3333] hover:text-white text-[#a0a0a0] w-10 h-10 flex items-center justify-center transition-colors"
                            >
                              <span className="material-symbols-outlined text-[16px]">delete</span>
                            </button>
                          </div>
                        ))}

                        <button 
                          type="button" 
                          onClick={() => setDecalVariants([...decalVariants, {size: "", price: ""}])}
                          className="w-full py-3 border border-dashed border-[#ccff00]/40 text-[#ccff00] text-[10px] font-bold uppercase tracking-widest hover:bg-[#ccff00]/10 transition-colors flex items-center justify-center gap-2"
                        >
                          <span className="material-symbols-outlined text-[14px]">add</span>
                          Add Another Size Variant
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {isPosterCategory && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-4 duration-500 pb-2">
                    <div className="p-4 border border-[#ccff00]/30 bg-[#ccff00]/5 flex items-start gap-4">
                      <span className="material-symbols-outlined text-[#ccff00] mt-1 text-[20px]">wallpaper</span>
                      <div className="flex-1 space-y-4">
                        <div>
                          <h3 className="text-sm font-bold text-white uppercase tracking-tight">Poster Size Matrix</h3>
                          <p className="text-[10px] text-[#a0a0a0] leading-relaxed mt-1 tracking-wide">
                            Configure physical variants. The Framed options will remain hidden on the storefront until your local framing supply is active.
                          </p>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                          {/* A4 */}
                          <div className="space-y-2 col-span-1 sm:col-span-2 pt-2 border-t border-[#ccff00]/20">
                            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#ccff00]">A4 Size Pricing</label>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#808080]">A4 Frameless (Maps to Base Price)</label>
                            <input 
                              type="number" 
                              value={formData.price}
                              disabled
                              className="w-full bg-[#121212] border border-[#333333] text-[#808080] px-3 py-2 font-mono text-sm cursor-not-allowed" 
                              placeholder="Set Base Price above" 
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#808080]">A4 Framed Option</label>
                            <div className="relative">
                              <span className="absolute left-0 top-1/2 -translate-y-1/2 text-[#808080] font-mono px-3">₹</span>
                              <input 
                                type="number" 
                                name="framedPrice"
                                value={formData.framedPrice}
                                onChange={handleInputChange}
                                step="0.01" min="0"
                                className="w-full bg-[#121212] border border-[#333333] focus:border-[#ccff00] focus:ring-0 pl-8 px-3 py-2 text-white transition-colors font-mono text-sm" 
                                placeholder="0.00" 
                              />
                            </div>
                          </div>

                          {/* A3 */}
                          <div className="space-y-2 col-span-1 sm:col-span-2 pt-4 border-t border-[#ccff00]/20 mt-2">
                            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#ccff00]">A3 Size Pricing (12x18)</label>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#808080]">A3 Frameless</label>
                            <div className="relative">
                              <span className="absolute left-0 top-1/2 -translate-y-1/2 text-[#808080] font-mono px-3">₹</span>
                              <input 
                                type="number" 
                                name="a3Price"
                                value={formData.a3Price}
                                onChange={handleInputChange}
                                step="0.01" min="0"
                                className="w-full bg-[#121212] border border-[#333333] focus:border-[#ccff00] focus:ring-0 pl-8 px-3 py-2 text-white transition-colors font-mono text-sm" 
                                placeholder="0.00" 
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#808080]">A3 Framed Option</label>
                            <div className="relative">
                              <span className="absolute left-0 top-1/2 -translate-y-1/2 text-[#808080] font-mono px-3">₹</span>
                              <input 
                                type="number" 
                                name="a3FramedPrice"
                                value={formData.a3FramedPrice}
                                onChange={handleInputChange}
                                step="0.01" min="0"
                                className="w-full bg-[#121212] border border-[#333333] focus:border-[#ccff00] focus:ring-0 pl-8 px-3 py-2 text-white transition-colors font-mono text-sm" 
                                placeholder="0.00" 
                              />
                            </div>
                          </div>

                          {/* A3+ */}
                          <div className="space-y-2 col-span-1 sm:col-span-2 pt-4 border-t border-[#ccff00]/20 mt-2">
                            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#ccff00]">A3+ Size Pricing (13x19)</label>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#808080]">A3+ Frameless</label>
                            <div className="relative">
                              <span className="absolute left-0 top-1/2 -translate-y-1/2 text-[#808080] font-mono px-3">₹</span>
                              <input 
                                type="number" 
                                name="a3PlusPrice"
                                value={formData.a3PlusPrice}
                                onChange={handleInputChange}
                                step="0.01" min="0"
                                className="w-full bg-[#121212] border border-[#333333] focus:border-[#ccff00] focus:ring-0 pl-8 px-3 py-2 text-white transition-colors font-mono text-sm" 
                                placeholder="0.00" 
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#808080]">A3+ Framed Option</label>
                            <div className="relative">
                              <span className="absolute left-0 top-1/2 -translate-y-1/2 text-[#808080] font-mono px-3">₹</span>
                              <input 
                                type="number" 
                                name="a3PlusFramedPrice"
                                value={formData.a3PlusFramedPrice}
                                onChange={handleInputChange}
                                step="0.01" min="0"
                                className="w-full bg-[#121212] border border-[#333333] focus:border-[#ccff00] focus:ring-0 pl-8 px-3 py-2 text-white transition-colors font-mono text-sm" 
                                placeholder="0.00" 
                              />
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-8 bg-[#1a1a1a] border border-[#2a2a2a] p-8">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-white border-b border-[#2a2a2a] pb-4 mb-6">Product Images</h2>
            
            <input 
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              ref={galleryInputRef}
              onChange={handleGalleryChange}
            />

            <div 
              onClick={() => galleryInputRef.current?.click()}
              className="w-full aspect-video border border-dashed border-[#333333] flex flex-col items-center justify-center gap-4 text-[#808080] hover:border-[#ccff00] hover:text-[#ccff00] transition-all cursor-pointer bg-[#121212] relative overflow-hidden group"
            >
              {galleryPreviews[0] ? (
                <>
                  <img src={galleryPreviews[0]} alt="Cover preview" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="material-symbols-outlined text-[32px] text-white">edit</span>
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white mt-2">Update Gallery Images</span>
                  </div>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[32px]">public</span>
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Product Gallery *</span>
                </>
              )}
            </div>
            {galleryFiles.length > 0 && (
              <div className="text-[10px] text-[#808080] font-mono mt-1 space-y-1">
                <div>Cover image: {galleryFiles[0]?.name}</div>
                <div>{galleryFiles.length} image{galleryFiles.length === 1 ? "" : "s"} selected. The first image becomes the product cover.</div>
              </div>
            )}
            
            <div className="border-t border-[#2a2a2a] pt-6 mt-6">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#808080] block mb-4 flex justify-between">
                <span>Gallery Order</span>
                <span className="font-mono">{galleryFiles.length} / {MAX_GALLERY_IMAGES}</span>
              </span>

              <div className="grid grid-cols-4 gap-2">
                {galleryPreviews.map((src, i) => (
                  <div key={i} className="aspect-square bg-[#121212] border border-[#333333] relative group overflow-hidden">
                    <img src={src} alt={`Gallery image ${i + 1}`} className="w-full h-full object-cover opacity-80 group-hover:opacity-60 transition-opacity" />
                    {i === 0 && (
                      <span className="absolute left-1 top-1 bg-[#ccff00] px-2 py-1 text-[8px] font-black uppercase tracking-[0.2em] text-[#121212]">
                        Cover
                      </span>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-1 opacity-100 group-hover:opacity-100 transition-opacity">
                      <select
                        value={mediaRoles[galleryFiles[i]?.name || String(i)] || (i === 0 ? "cover image" : "gallery image")}
                        onChange={(e) => {
                          const name = galleryFiles[i]?.name || String(i);
                          setMediaRoles(prev => ({ ...prev, [name]: e.target.value }));
                        }}
                        className="w-full bg-[#1a1a1a] border border-[#333333] text-[#a0a0a0] text-[8px] font-bold uppercase tracking-wider p-1 focus:ring-0 focus:border-[#ccff00]"
                      >
                        <option value="cover image">Cover Image</option>
                        <option value="gallery image">Gallery Image</option>
                        <option value="room mockup">Room Mockup</option>
                        <option value="detail close-up">Detail Close-up</option>
                      </select>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => removeGalleryImage(i)}
                      className="absolute top-1 right-1 w-6 h-6 bg-[#ff3333]/90 text-white flex items-center justify-center translate-x-2 -translate-y-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0 transition-all shadow-xl"
                    >
                      <span className="material-symbols-outlined text-[14px]">close</span>
                    </button>
                  </div>
                ))}
                
                {galleryFiles.length < MAX_GALLERY_IMAGES && (
                  <div 
                    onClick={() => galleryInputRef.current?.click()}
                    className="aspect-square border border-dashed border-[#333333] flex flex-col items-center justify-center text-[#606060] hover:text-[#ccff00] hover:border-[#ccff00] transition-colors cursor-pointer bg-[#121212]"
                  >
                    <span className="material-symbols-outlined text-[20px]">add_photo_alternate</span>
                  </div>
                )}
              </div>
              <div className="text-[9px] uppercase tracking-wider text-[#606060] mt-3">Upload up to {MAX_GALLERY_IMAGES} product images. The first image is used as the main card cover and the remaining images are saved to the gallery.</div>
            </div>
            
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex justify-end gap-4 border-t border-[#2a2a2a] pt-8">
          <Link href="/admin/products" className="px-8 py-4 text-xs font-bold uppercase tracking-widest text-white border border-[#333333] hover:bg-[#222222] transition-colors text-center flex items-center">
            Abort
          </Link>
          <button 
            type="button"
            onClick={(e) => handleFormSubmit(e, 'Draft')}
            disabled={loading || categoriesLoading || categories.length === 0}
            className="px-8 py-4 text-xs font-bold uppercase tracking-widest bg-[#222222] border border-[#333333] text-white hover:bg-[#333333] transition-colors flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Draft
            <span className="material-symbols-outlined text-[16px]">edit_document</span>
          </button>
          <button 
            type="submit" 
            disabled={loading || categoriesLoading || categories.length === 0}
            className="px-8 py-4 text-xs font-black uppercase tracking-widest bg-[#ccff00] text-[#121212] hover:bg-white transition-colors flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Transmitting Data...' : 'Commit & Publish'}
            {!loading && <span className="material-symbols-outlined text-[16px]">rocket_launch</span>}
            {loading && <span className="material-symbols-outlined text-[16px] animate-spin">refresh</span>}
          </button>
        </div>
      </form>
    </div>
  );
}
