"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAdminDialog } from "@/components/AdminDialogProvider";
import { CATEGORIES_TABLE, CategoryRecord } from "@/lib/categories";
import { supabase } from "@/lib/supabaseClient";
import { extractStoragePathFromPublicUrl, getProductImagePaths, PRODUCT_IMAGES_BUCKET } from "@/lib/productImages";

const MAX_GALLERY_IMAGES = 8;

type ProductRecord = {
  id: string;
  sku: string;
  name: string;
  category: string | null;
  base_price: number;
  image_url: string | null;
  mockup_urls: string[] | null;
  status: string | null;
};

// Each slot in the gallery can be either an existing (DB) image or a newly staged file
type GallerySlot =
  | { kind: "existing"; url: string }
  | { kind: "new"; file: File; previewUrl: string };

export default function AdminEditProductPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const addMoreInputRef = useRef<HTMLInputElement>(null);
  const { showAlert } = useAdminDialog();

  const [loadingProduct, setLoadingProduct] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryRecord[]>([]);

  // The working gallery — ordered list of slots
  const [gallery, setGallery] = useState<GallerySlot[]>([]);
  // Track which existing URLs have been marked for deletion (to remove from bucket on save)
  const [deletedExistingUrls, setDeletedExistingUrls] = useState<string[]>([]);

  // Drag-and-drop state
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    price: "",
    framedPrice: "",
    a3Price: "",
    a3FramedPrice: "",
    a3PlusPrice: "",
    a3PlusFramedPrice: "",
    category: "",
  });

  const [decalBaseSize, setDecalBaseSize] = useState("");
  const [decalVariants, setDecalVariants] = useState<{size: string, price: string}[]>([]);

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
    const loadProduct = async () => {
      try {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("id", params.id)
          .single<ProductRecord>();

        if (error) {
          throw new Error(error.message);
        }



        let framedPrice = "";
        let a3Price = "";
        let a3FramedPrice = "";
        let a3PlusPrice = "";
        let a3PlusFramedPrice = "";

        if (Array.isArray((data as any).variants)) {
          const a4Variant = (data as any).variants.find((v: any) => v.size === "A4");
          const a3Variant = (data as any).variants.find((v: any) => v.size === "A3 (12x18)");
          const a3PlusVariant = (data as any).variants.find((v: any) => v.size === "A3+ (13x19)");

          if (a4Variant) framedPrice = String(a4Variant.framed_price || "");
          if (a3Variant) {
            a3Price = String(a3Variant.frameless_price || "");
            a3FramedPrice = String(a3Variant.framed_price || "");
          }
          if (a3PlusVariant) {
            a3PlusPrice = String(a3PlusVariant.frameless_price || "");
            a3PlusFramedPrice = String(a3PlusVariant.framed_price || "");
          }

          // Handle Decals (Custom structure)
          const decalVars = (data as any).variants.filter((v: any) => 
            !["A4", "A3 (12x18)", "A3+ (13x19)"].includes(v.size)
          );
          if (decalVars.length > 0) {
            setDecalBaseSize(decalVars[0].size || "");
            setDecalVariants(decalVars.slice(1).map((v: any) => ({
              size: v.size || "",
              price: String(v.price || "")
            })));
          }
        }

        setFormData({
          name: data.name ?? "",
          sku: data.sku ?? "",
          price: String(data.base_price ?? ""),
          framedPrice,
          a3Price,
          a3FramedPrice,
          a3PlusPrice,
          a3PlusFramedPrice,
          category: data.category ?? "",
        });

        // Load from flat columns (new format)
        const d = data as any;
        setStructuredContent({
          short_hook: d.short_hook || "",
          product_story: d.product_story || "",
          highlights: (d.highlights && d.highlights.length > 0) ? d.highlights : [""],
          seo: {
            seo_title: d.seo_title || "",
            meta_description: d.meta_description || "",
            url_slug: d.url_slug || "",
            focus_keyword: d.focus_keyword || "",
            image_alt_text: d.image_alt_text || "",
          },
          merchandising: {
            related_products: [],
            bundle_pairing: [],
            feature_on_home: d.feature_on_home || false,
            bundle_only: d.bundle_only || false,
            collection_narrative: d.collection_narrative || "",
          },
        });
        if (d.media_roles) {
          setMediaRoles(d.media_roles);
        }

        const urls = [data.image_url, ...(data.mockup_urls ?? [])].filter(
          (url): url is string => Boolean(url)
        );
        setGallery(urls.map((url) => ({ kind: "existing", url })));
      } catch (error: unknown) {
        console.error("Error loading product:", error);
        setFetchError(error instanceof Error ? error.message : "Failed to load this product.");
      } finally {
        setLoadingProduct(false);
      }
    };

    void loadProduct();
  }, [params.id]);

  useEffect(() => {
    const loadProducts = async () => {
      const { data } = await supabase.from("products").select("id, name, sku, is_bundle").eq("status", "Active");
      setAllProducts(data || []);
    };
    void loadProducts();

    const loadCategories = async () => {
      try {
        const { data, error } = await supabase
          .from(CATEGORIES_TABLE)
          .select("*")
          .order("name", { ascending: true });

        if (error) {
          throw new Error(error.message);
        }

        setCategories((data ?? []) as CategoryRecord[]);
      } catch (error: unknown) {
        console.error("Error loading categories:", error);
        setCategoriesError(error instanceof Error ? error.message : "Failed to load categories.");
      } finally {
        setCategoriesLoading(false);
      }
    };

    void loadCategories();
  }, []);

  const isDecalCategory = (() => {
    const selectedCat = categories.find(c => c.name === formData.category);
    if (!selectedCat) return false;
    
    // 1. Strict DB Type Check
    if (selectedCat.category_type === 'decal' || selectedCat.category_type === 'sticker') return true;
    
    const parent = categories.find(c => c.id === selectedCat.parent_id);
    if (parent && (parent.category_type === 'decal' || parent.category_type === 'sticker')) return true;

    // 2. Fallback String Check
    const catName = selectedCat.name.toLowerCase();
    const parentName = parent?.name.toLowerCase() || "";
    const prodName = formData.name.toLowerCase();

    if (catName.includes("decal") || catName.includes("sticker")) return true;
    if (parentName.includes("decal") || parentName.includes("sticker")) return true;
    if (prodName.includes("decal") || prodName.includes("sticker")) return true;
    
    return false;
  })();

  const isPosterCategory = (() => {
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

  const updateDecalVariant = (index: number, field: 'size' | 'price', value: string) => {
    const updated = [...decalVariants];
    updated[index][field] = value;
    setDecalVariants(updated);
  };

  const removeDecalVariant = (index: number) => {
    setDecalVariants(prev => prev.filter((_, i) => i !== index));
  };

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      gallery.forEach((slot) => {
        if (slot.kind === "new") URL.revokeObjectURL(slot.previewUrl);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const available = MAX_GALLERY_IMAGES - gallery.length;
    if (available <= 0) {
      await showAlert(`Gallery is full (max ${MAX_GALLERY_IMAGES} images).`, "Gallery Limit");
      return;
    }

    const toAdd = files.slice(0, available);
    const newSlots: GallerySlot[] = toAdd.map((file) => ({
      kind: "new",
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setGallery((prev) => [...prev, ...newSlots]);

    if (addMoreInputRef.current) {
      addMoreInputRef.current.value = "";
    }
  };

  const removeImage = (index: number) => {
    const slot = gallery[index];
    if (!slot) return;

    if (slot.kind === "existing") {
      // Queue for bucket deletion on save
      setDeletedExistingUrls((prev) => [...prev, slot.url]);
    } else {
      URL.revokeObjectURL(slot.previewUrl);
    }

    setGallery((prev) => prev.filter((_, i) => i !== index));
  };

  const setAsCover = (index: number) => {
    if (index === 0) return; // Already cover
    setGallery((prev) => {
      const next = [...prev];
      const [picked] = next.splice(index, 1);
      next.unshift(picked!);
      return next;
    });
  };

  // Drag-and-drop handlers
  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === dropIndex) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }

    setGallery((prev) => {
      const next = [...prev];
      const [dragged] = next.splice(dragIndex, 1);
      next.splice(dropIndex, 0, dragged!);
      return next;
    });

    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    handleFormSubmit(e, 'Active');
  };

  const handleFormSubmit = async (e: React.FormEvent, statusToSave: 'Active' | 'Draft') => {
    e.preventDefault();

    if (!formData.name || !formData.sku || !formData.price || !formData.category || gallery.length === 0) {
      await showAlert("Please fill all required fields and keep at least one product image.", "Missing Information");
      return;
    }

    setSaving(true);

    try {
      const uploadStamp = Date.now();

      // Upload any new-file slots
      const resolvedGallery = await Promise.all(
        gallery.map(async (slot, index) => {
          if (slot.kind === "existing") return slot.url;

          const ext = slot.file.name.split(".").pop();
          const imageName = `${formData.sku}-gallery-${index}-${uploadStamp}.${ext}`;

          const { error } = await supabase.storage
            .from(PRODUCT_IMAGES_BUCKET)
            .upload(imageName, slot.file, { cacheControl: "3600", upsert: false });

          if (error) {
            throw new Error(`Image Upload Error (${slot.file.name}): ${error.message}`);
          }

          const {
            data: { publicUrl },
          } = supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(imageName);

          return publicUrl;
        })
      );

      const [imageUrl, ...mockupUrls] = resolvedGallery;

      // Resolve image roles
      const finalMediaRoles: {[key: string]: string} = {};
      resolvedGallery.forEach((url, index) => {
        const slot = gallery[index];
        const identifier = slot.kind === "existing" ? slot.url : slot.file.name;
        finalMediaRoles[url] = mediaRoles[identifier] || (index === 0 ? "cover image" : "gallery image");
      });

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

      // Resolve parent category and type for architectural integrity
      const selectedCat = categories.find(c => c.name === formData.category);
      const parentCat = selectedCat ? categories.find(c => c.id === selectedCat.parent_id) : null;
      const parentCategoryName = parentCat ? parentCat.name : null;
      const finalType = selectedCat?.category_type || parentCat?.category_type || (isPosterCategory ? 'poster' : isDecalCategory ? 'decal' : 'other');

      const { error: updateError } = await supabase
        .from("products")
        .update({
          sku: formData.sku,
          name: formData.name,
          category: formData.category,
          parent_category: parentCategoryName,
          category_type: finalType,
          base_price: parseFloat(formData.price),
          image_url: imageUrl ?? null,
          mockup_urls: mockupUrls,
          variants: variantsJson,
          status: statusToSave,
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
          feature_on_home: structuredContent.merchandising.feature_on_home,
          bundle_only: structuredContent.merchandising.bundle_only,
          collection_narrative: structuredContent.merchandising.collection_narrative || null,
        })
        .eq("id", params.id);

      if (updateError) {
        throw new Error(`Update Error: ${updateError.message}`);
      }

      // Delete removed images from the storage bucket
      if (deletedExistingUrls.length > 0) {
        const pathsToDelete = getProductImagePaths(deletedExistingUrls);
        if (pathsToDelete.length > 0) {
          const { error: storageError } = await supabase.storage
            .from(PRODUCT_IMAGES_BUCKET)
            .remove(pathsToDelete);

          if (storageError) {
            console.warn("Storage cleanup failed for deleted images:", storageError.message);
          }
        }
      }

      router.push("/admin/products");
      router.refresh();
    } catch (error: unknown) {
      console.error("Error updating product:", error);
      await showAlert(
        error instanceof Error ? error.message : "Something went wrong while updating the product.",
        "Update Failed"
      );
      setSaving(false);
    }
  };

  if (loadingProduct) {
    return (
      <div className="max-w-4xl space-y-6">
        <p className="text-sm uppercase tracking-[0.2em] text-[#808080]">Loading product data...</p>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="max-w-4xl space-y-6">
        <Link
          href="/admin/products"
          className="text-[10px] font-bold uppercase tracking-widest text-[#808080] hover:text-[#ccff00] transition-colors"
        >
          Back to Inventory
        </Link>
        <div className="border border-[#6f2a2a] bg-[#221515] px-6 py-5 text-sm text-[#ff9b9b]">
          Failed to load product: {fetchError}
        </div>
      </div>
    );
  }

  const categoryOptions = categories.some((c) => c.name === formData.category)
    ? categories
    : formData.category
      ? [{ id: "current", name: formData.category, slug: "current-category" } as CategoryRecord, ...categories]
      : categories;

  const topLevelCategories = categoryOptions.filter((c) => !c.parent_id);
  const getSubcategories = (parentId: string) => categoryOptions.filter((c) => c.parent_id === parentId);

  const coverSrc = gallery[0]
    ? gallery[0].kind === "existing"
      ? gallery[0].url
      : gallery[0].previewUrl
    : null;

  return (
    <div className="space-y-12 animate-in fade-in duration-700 max-w-4xl">
      <header className="relative flex flex-col gap-4 border-b border-[#2a2a2a] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <Link
          href="/admin/products"
          className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#808080] transition-colors hover:text-[#ccff00] sm:absolute sm:-top-10 sm:left-0"
        >
          <span className="material-symbols-outlined text-[14px]">arrow_back</span>
          Back to Inventory
        </Link>
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#808080] mb-2 block">SKU Maintenance</span>
          <h1 className="text-4xl font-black uppercase tracking-tighter text-white">Edit Product</h1>
        </div>
      </header>

      <form className="space-y-12" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Core Identification */}
          <div className="space-y-8 md:col-span-2 bg-[#1a1a1a] border border-[#2a2a2a] p-8">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-white border-b border-[#2a2a2a] pb-4 mb-6">Core Identification</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#808080]">Product Designation (Name) *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full bg-transparent border-t-0 border-x-0 border-b border-[#333333] focus:border-[#ccff00] focus:ring-0 px-0 py-3 text-white transition-colors"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#808080]">Stock Keeping Unit (SKU) *</label>
                <input
                  type="text"
                  name="sku"
                  value={formData.sku}
                  onChange={handleInputChange}
                  required
                  className="w-full bg-transparent border-t-0 border-x-0 border-b border-[#333333] focus:border-[#ccff00] focus:ring-0 px-0 py-3 text-white transition-colors font-mono uppercase"
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

          {/* Commerce & Categorization */}
          <div className="space-y-8 bg-[#1a1a1a] border border-[#2a2a2a] p-8">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-white border-b border-[#2a2a2a] pb-4 mb-6">Commerce &amp; Categorization</h2>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#808080]">Base Price (INR) *</label>
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
                  />
                </div>
              </div>

              <div className="space-y-2 animate-in fade-in slide-in-from-top-4 duration-500 pb-2 md:col-span-2">
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
              )}
            </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#808080] block mb-2">System Category</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  required
                  disabled={categoriesLoading || categoryOptions.length === 0}
                  className="w-full bg-[#121212] border border-[#333333] text-white focus:border-[#ccff00] focus:ring-0 p-3 text-sm"
                >
                  {categoriesLoading ? <option>Loading categories...</option> : null}
                  {!categoriesLoading && categoryOptions.length === 0 ? <option value="">No categories found</option> : null}
                  {topLevelCategories.map((category) => (
                    <optgroup key={category.id} label={category.name}>
                      <option value={category.name}>{category.name} (Top Level)</option>
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
                    Failed to load categories: {categoriesError}. Manage them in{" "}
                    <Link href="/admin/categories" className="text-[#ccff00] hover:text-white transition-colors">
                      Categories
                    </Link>
                    .
                  </div>
                ) : null}
                {!categoriesLoading && categoryOptions.length === 0 && !categoriesError ? (
                  <div className="text-[10px] text-[#808080]">
                    No categories available yet. Add one from{" "}
                    <Link href="/admin/categories" className="text-[#ccff00] hover:text-white transition-colors">
                      Categories
                    </Link>{" "}
                    before changing this product category.
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* Visual Assets */}
          <div className="space-y-8 bg-[#1a1a1a] border border-[#2a2a2a] p-8">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-white border-b border-[#2a2a2a] pb-4 mb-6">Visual Assets</h2>

            {/* Cover image preview */}
            <div className="w-full aspect-video border border-dashed border-[#333333] bg-[#121212] relative overflow-hidden">
              {coverSrc ? (
                <img src={coverSrc} alt="Cover preview" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-[#808080]">
                  <span className="material-symbols-outlined text-[32px]">public</span>
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em]">No Images Yet</span>
                </div>
              )}
              {coverSrc && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2">
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#ccff00]">Cover Image</span>
                </div>
              )}
            </div>

            {/* Gallery grid */}
            <div className="border-t border-[#2a2a2a] pt-6">
              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#808080]">Gallery</span>
                <span className="text-[10px] font-mono text-[#808080]">{gallery.length} / {MAX_GALLERY_IMAGES}</span>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {gallery.map((slot, index) => {
                  const src = slot.kind === "existing" ? slot.url : slot.previewUrl;
                  const isCover = index === 0;
                  const isDragging = dragIndex === index;
                  const isDragOver = dragOverIndex === index;

                  return (
                    <div
                      key={`slot-${index}`}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDrop={(e) => handleDrop(e, index)}
                      onDragEnd={handleDragEnd}
                      className={`aspect-square bg-[#121212] border relative group overflow-hidden cursor-grab active:cursor-grabbing transition-all duration-150 ${
                        isCover ? "border-[#ccff00]/60" : "border-[#333333]"
                      } ${isDragging ? "opacity-40 scale-95" : ""} ${isDragOver && !isDragging ? "border-[#ccff00] scale-[1.03]" : ""}`}
                    >
                      <img
                        src={src}
                        alt={`Gallery image ${index + 1}`}
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-50 transition-opacity select-none pointer-events-none"
                        draggable={false}
                      />

                      {/* Cover badge */}
                      {isCover && (
                        <span className="absolute left-1 top-1 bg-[#ccff00] px-1.5 py-0.5 text-[7px] font-black uppercase tracking-[0.15em] text-[#121212] z-10">
                          Cover
                        </span>
                      )}

                      {/* Media Role Dropdown overlay */}
                      <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-1 z-30">
                        <select
                          value={mediaRoles[slot.kind === 'existing' ? slot.url : slot.file.name] || (index === 0 ? "cover image" : "gallery image")}
                          onChange={(e) => {
                            const identifier = slot.kind === 'existing' ? slot.url : slot.file.name;
                            setMediaRoles(prev => ({ ...prev, [identifier]: e.target.value }));
                          }}
                          className="w-full bg-[#1a1a1a] border border-[#333333] text-[#a0a0a0] text-[8px] font-bold uppercase tracking-wider p-1 focus:ring-0 focus:border-[#ccff00]"
                        >
                          <option value="cover image">Cover Image</option>
                          <option value="gallery image">Gallery Image</option>
                          <option value="room mockup">Room Mockup</option>
                          <option value="detail close-up">Detail Close-up</option>
                        </select>
                      </div>

                      {/* Hover action overlay */}
                      <div className="absolute top-1 right-1 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                        {/* Set as Cover */}
                        {!isCover && (
                          <button
                            type="button"
                            title="Set as cover"
                            onClick={() => setAsCover(index)}
                            className="flex items-center justify-center bg-[#ccff00]/90 text-[#121212] p-1 hover:bg-[#ccff00] transition-colors rounded"
                          >
                            <span className="material-symbols-outlined text-[12px]">star</span>
                          </button>
                        )}

                        {/* Delete */}
                        <button
                          type="button"
                          title="Delete image"
                          onClick={() => removeImage(index)}
                          className="flex items-center justify-center bg-[#ff3333]/90 text-white p-1 hover:bg-[#ff3333] transition-colors rounded"
                        >
                          <span className="material-symbols-outlined text-[12px]">delete</span>
                        </button>
                      </div>

                      {/* Drag handle hint */}
                      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-60 transition-opacity z-10">
                        <span className="material-symbols-outlined text-[12px] text-white drop-shadow">drag_indicator</span>
                      </div>
                    </div>
                  );
                })}

                {/* Add more slot */}
                {gallery.length < MAX_GALLERY_IMAGES && (
                  <div
                    onClick={() => addMoreInputRef.current?.click()}
                    className="aspect-square border border-dashed border-[#333333] flex flex-col items-center justify-center text-[#606060] hover:text-[#ccff00] hover:border-[#ccff00] transition-colors cursor-pointer bg-[#121212]"
                  >
                    <span className="material-symbols-outlined text-[20px]">add_photo_alternate</span>
                  </div>
                )}
              </div>

              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                ref={addMoreInputRef}
                onChange={handleAddImages}
              />

              <div className="text-[9px] uppercase tracking-wider text-[#606060] mt-3 space-y-1">
                <div>Drag images to reorder. Hover to set cover or delete.</div>
                {deletedExistingUrls.length > 0 && (
                  <div className="text-[#ff9b9b]">
                    {deletedExistingUrls.length} image{deletedExistingUrls.length > 1 ? "s" : ""} will be permanently deleted from storage on save.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4 border-t border-[#2a2a2a] pt-8">
          <Link
            href="/admin/products"
            className="px-8 py-4 text-xs font-bold uppercase tracking-widest text-white border border-[#333333] hover:bg-[#222222] transition-colors text-center flex items-center"
          >
            Cancel
          </Link>
          <button 
            type="button"
            onClick={(e) => handleFormSubmit(e, 'Draft')}
            disabled={saving || categoriesLoading || categoryOptions.length === 0}
            className="px-8 py-4 text-xs font-bold uppercase tracking-widest bg-[#222222] border border-[#333333] text-white hover:bg-[#333333] transition-colors flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Draft
            <span className="material-symbols-outlined text-[16px]">edit_document</span>
          </button>
          <button 
            type="submit" 
            disabled={saving || categoriesLoading || categoryOptions.length === 0}
            className="px-8 py-4 text-xs font-black uppercase tracking-widest bg-[#ccff00] text-[#121212] hover:bg-white transition-colors flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Transmitting Data...' : 'Commit & Publish'}
            {!saving && <span className="material-symbols-outlined text-[16px]">rocket_launch</span>}
            {saving && <span className="material-symbols-outlined text-[16px] animate-spin">refresh</span>}
          </button>
        </div>
      </form>
    </div>
  );
}
