"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminDialog } from "@/components/AdminDialogProvider";
import { CATEGORIES_TABLE, CategoryRecord, slugifyCategoryName } from "@/lib/categories";
import { supabase } from "@/lib/supabaseClient";
import { getProductImagePaths, PRODUCT_IMAGES_BUCKET } from "@/lib/productImages";

const MAX_GALLERY_IMAGES = 8;

// Product reality: A4/A3 self-adhesive only. Flip these to true when you stock
// framed prints or A3+ paper — the inputs and pricing plumbing are already wired,
// and the flags apply identically to the create and edit flows.
const ENABLE_FRAMED = false;
const ENABLE_A3PLUS = false;

// A stored size/price variant. Shape varies by product type (poster vs decal),
// so the price fields are all optional.
export type ProductVariant = {
  size?: string;
  frameless_price?: number | null;
  framed_price?: number | null;
  price?: number | null;
  active?: boolean;
};

// The shape the edit route hands us. Mirrors the `products` row we care about.
export interface ProductDefaults {
  id: string;
  sku: string;
  name: string;
  category: string | null;
  base_price: number | null;
  image_url: string | null;
  mockup_urls: string[] | null;
  variants: ProductVariant[] | null;
  status: string | null;
  short_hook: string | null;
  product_story: string | null;
  highlights: string[] | null;
  seo_title: string | null;
  meta_description: string | null;
  url_slug: string | null;
  focus_keyword: string | null;
  image_alt_text: string | null;
  media_roles: Record<string, string> | null;
  feature_on_home: boolean | null;
  bundle_only: boolean | null;
  collection_narrative: string | null;
}

// Each slot in the gallery is either an existing (DB) image or a newly staged file.
type GallerySlot =
  | { kind: "existing"; url: string }
  | { kind: "new"; file: File; previewUrl: string };

interface Props {
  categories: CategoryRecord[];
  defaultValues?: ProductDefaults;
}

// Split a stored variants[] array back into the flat price fields the form edits.
function parseVariantPrices(variants: ProductVariant[] | null | undefined) {
  let framedPrice = "";
  let a3Price = "";
  let a3FramedPrice = "";
  let a3PlusPrice = "";
  let a3PlusFramedPrice = "";
  let decalBaseSize = "";
  let decalVariants: { size: string; price: string }[] = [];

  if (Array.isArray(variants)) {
    const a4 = variants.find((v) => v.size === "A4");
    const a3 = variants.find((v) => v.size === "A3 (12x18)");
    const a3p = variants.find((v) => v.size === "A3+ (13x19)");

    if (a4) framedPrice = a4.framed_price ? String(a4.framed_price) : "";
    if (a3) {
      a3Price = a3.frameless_price ? String(a3.frameless_price) : "";
      a3FramedPrice = a3.framed_price ? String(a3.framed_price) : "";
    }
    if (a3p) {
      a3PlusPrice = a3p.frameless_price ? String(a3p.frameless_price) : "";
      a3PlusFramedPrice = a3p.framed_price ? String(a3p.framed_price) : "";
    }

    const decalVars = variants.filter(
      (v) => !["A4", "A3 (12x18)", "A3+ (13x19)"].includes(v.size ?? "")
    );
    if (decalVars.length > 0) {
      decalBaseSize = decalVars[0].size || "";
      decalVariants = decalVars.slice(1).map((v) => ({
        size: v.size || "",
        price: v.price ? String(v.price) : "",
      }));
    }
  }

  return {
    framedPrice,
    a3Price,
    a3FramedPrice,
    a3PlusPrice,
    a3PlusFramedPrice,
    decalBaseSize,
    decalVariants,
  };
}

export default function ProductForm({ categories: initialCategories, defaultValues }: Props) {
  const router = useRouter();
  const addMoreInputRef = useRef<HTMLInputElement>(null);
  const { showAlert } = useAdminDialog();

  const isEditMode = !!defaultValues;
  const parsedVariants = parseVariantPrices(defaultValues?.variants);

  const [categories, setCategories] = useState<CategoryRecord[]>(initialCategories);
  const [saving, setSaving] = useState(false);

  // Quick-add subcategory state
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatParent, setNewCatParent] = useState("");
  const [addingCategoryData, setAddingCategoryData] = useState(false);

  // The working gallery — ordered list of slots
  const [gallery, setGallery] = useState<GallerySlot[]>(() => {
    if (!defaultValues) return [];
    const urls = [defaultValues.image_url, ...(defaultValues.mockup_urls ?? [])].filter(
      (url): url is string => Boolean(url)
    );
    return urls.map((url) => ({ kind: "existing", url }));
  });
  // Existing URLs marked for deletion (removed from bucket on save)
  const [deletedExistingUrls, setDeletedExistingUrls] = useState<string[]>([]);

  // Drag-and-drop state
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const [decalBaseSize, setDecalBaseSize] = useState(parsedVariants.decalBaseSize);
  const [decalVariants, setDecalVariants] = useState<{ size: string; price: string }[]>(
    parsedVariants.decalVariants
  );

  const [mediaRoles, setMediaRoles] = useState<{ [key: string]: string }>(
    defaultValues?.media_roles ?? {}
  );

  const [formData, setFormData] = useState({
    name: defaultValues?.name ?? "",
    sku: defaultValues?.sku ?? "",
    price: defaultValues?.base_price != null ? String(defaultValues.base_price) : "",
    framedPrice: parsedVariants.framedPrice,
    a3Price: parsedVariants.a3Price,
    a3FramedPrice: parsedVariants.a3FramedPrice,
    a3PlusPrice: parsedVariants.a3PlusPrice,
    a3PlusFramedPrice: parsedVariants.a3PlusFramedPrice,
    category:
      defaultValues?.category ??
      initialCategories.find((c) => c.parent_id)?.name ??
      "",
  });

  const [structuredContent, setStructuredContent] = useState({
    short_hook: defaultValues?.short_hook ?? "",
    product_story: defaultValues?.product_story ?? "",
    highlights:
      defaultValues?.highlights && defaultValues.highlights.length > 0
        ? defaultValues.highlights
        : [""],
    seo: {
      seo_title: defaultValues?.seo_title ?? "",
      meta_description: defaultValues?.meta_description ?? "",
      url_slug: defaultValues?.url_slug ?? "",
      focus_keyword: defaultValues?.focus_keyword ?? "",
      image_alt_text: defaultValues?.image_alt_text ?? "",
    },
    merchandising: {
      feature_on_home: defaultValues?.feature_on_home ?? false,
      bundle_only: defaultValues?.bundle_only ?? false,
      collection_narrative: defaultValues?.collection_narrative ?? "",
    },
  });

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      gallery.forEach((slot) => {
        if (slot.kind === "new") URL.revokeObjectURL(slot.previewUrl);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Category type detection ───────────────────────
  const isDecalCategory = (() => {
    const selectedCat = categories.find((c) => c.name === formData.category);
    if (!selectedCat) {
      // Legacy / not-in-list value: fall back to name heuristics
      const prodName = formData.name.toLowerCase();
      const catName = (formData.category ?? "").toLowerCase();
      return (
        catName.includes("decal") ||
        catName.includes("sticker") ||
        prodName.includes("decal") ||
        prodName.includes("sticker")
      );
    }

    if (selectedCat.category_type === "decal" || selectedCat.category_type === "sticker") return true;

    const parent = categories.find((c) => c.id === selectedCat.parent_id);
    if (parent && (parent.category_type === "decal" || parent.category_type === "sticker")) return true;

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

    const selectedCat = categories.find((c) => c.name === formData.category);
    if (!selectedCat) {
      const catName = (formData.category ?? "").toLowerCase();
      return catName.includes("poster") || catName.includes("series");
    }

    if (selectedCat.category_type === "poster") return true;

    const parent = categories.find((c) => c.id === selectedCat.parent_id);
    if (parent && parent.category_type === "poster") return true;

    const catName = selectedCat.name.toLowerCase();
    const parentName = parent?.name.toLowerCase() || "";
    if (catName.includes("poster") || catName.includes("series")) return true;
    if (parentName.includes("poster") || parentName.includes("series")) return true;

    return false;
  })();

  // ── Category options (grandfather a legacy value not in the list) ──
  const hasCurrentInList = categories.some((c) => c.name === formData.category);
  const legacyCategory = !hasCurrentInList && formData.category ? formData.category : null;
  const topLevelCategories = categories.filter((c) => !c.parent_id);
  const getSubcategories = (parentId: string) => categories.filter((c) => c.parent_id === parentId);

  // ── Handlers ──────────────────────────────────────
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

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

      const { data } = await supabase
        .from(CATEGORIES_TABLE)
        .select("*")
        .order("name", { ascending: true });
      setCategories((data ?? []) as CategoryRecord[]);
      setFormData((prev) => ({ ...prev, category: trimmed }));
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

  const updateDecalVariant = (index: number, field: "size" | "price", value: string) => {
    setDecalVariants((prev) =>
      prev.map((v, i) => (i === index ? { ...v, [field]: value } : v))
    );
  };

  const removeDecalVariant = (index: number) => {
    setDecalVariants((prev) => prev.filter((_, i) => i !== index));
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
    if (addMoreInputRef.current) addMoreInputRef.current.value = "";
  };

  const removeImage = (index: number) => {
    const slot = gallery[index];
    if (!slot) return;

    if (slot.kind === "existing") {
      setDeletedExistingUrls((prev) => [...prev, slot.url]);
    } else {
      URL.revokeObjectURL(slot.previewUrl);
    }

    setGallery((prev) => prev.filter((_, i) => i !== index));
  };

  const setAsCover = (index: number) => {
    if (index === 0) return;
    setGallery((prev) => {
      const next = [...prev];
      const [picked] = next.splice(index, 1);
      next.unshift(picked!);
      return next;
    });
  };

  const handleDragStart = (index: number) => setDragIndex(index);
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
    handleFormSubmit(e, "Active");
  };

  const handleFormSubmit = async (e: React.FormEvent, statusToSave: "Active" | "Draft") => {
    e.preventDefault();

    if (!formData.name || !formData.sku || !formData.price || !formData.category || gallery.length === 0) {
      await showAlert(
        "Please fill all required fields and keep at least one product image.",
        "Missing Information"
      );
      return;
    }

    // A top-level type (Posters / Decals) or a subcategory are both valid targets.
    const selectedCat = categories.find((c) => c.name === formData.category);

    setSaving(true);
    const newlyUploadedUrls: string[] = [];

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

          if (error) throw new Error(`Image Upload Error (${slot.file.name}): ${error.message}`);

          const {
            data: { publicUrl },
          } = supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(imageName);

          newlyUploadedUrls.push(publicUrl);
          return publicUrl;
        })
      );

      const [imageUrl, ...mockupUrls] = resolvedGallery;

      // Resolve image roles
      const finalMediaRoles: { [key: string]: string } = {};
      resolvedGallery.forEach((url, index) => {
        const slot = gallery[index];
        const identifier = slot.kind === "existing" ? slot.url : slot.file.name;
        finalMediaRoles[url] = mediaRoles[identifier] || (index === 0 ? "cover image" : "gallery image");
      });

      let variantsJson: ProductVariant[] = [];
      if (isPosterCategory) {
        variantsJson = [
          {
            size: "A4",
            frameless_price: parseFloat(formData.price || "0"),
            framed_price: formData.framedPrice ? parseFloat(formData.framedPrice) : null,
            active: true,
          },
          {
            size: "A3 (12x18)",
            frameless_price: formData.a3Price ? parseFloat(formData.a3Price) : null,
            framed_price: formData.a3FramedPrice ? parseFloat(formData.a3FramedPrice) : null,
            active: true,
          },
          {
            size: "A3+ (13x19)",
            frameless_price: formData.a3PlusPrice ? parseFloat(formData.a3PlusPrice) : null,
            framed_price: formData.a3PlusFramedPrice ? parseFloat(formData.a3PlusFramedPrice) : null,
            active: true,
          },
        ].filter((v) => v.frameless_price !== null);
      } else if (isDecalCategory) {
        variantsJson = [
          {
            size: decalBaseSize || "4 inch",
            price: parseFloat(formData.price || "0"),
            active: true,
          },
          ...decalVariants
            .filter((v) => v.size && v.price)
            .map((v) => ({ size: v.size, price: parseFloat(v.price), active: true })),
        ];
      } else {
        variantsJson = [{ size: "Standard", price: parseFloat(formData.price || "0"), active: true }];
      }

      // Resolve parent category and type for architectural integrity
      const parentCat = selectedCat ? categories.find((c) => c.id === selectedCat.parent_id) : null;
      const parentCategoryName = parentCat ? parentCat.name : null;
      const finalType =
        selectedCat?.category_type ||
        parentCat?.category_type ||
        (isPosterCategory ? "poster" : isDecalCategory ? "decal" : "other");

      const payload = {
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
        highlights:
          structuredContent.highlights.filter((h) => h.trim()).length > 0
            ? structuredContent.highlights.filter((h) => h.trim())
            : null,
        // Flat SEO columns
        seo_title: structuredContent.seo.seo_title || null,
        meta_description: structuredContent.seo.meta_description || null,
        url_slug: structuredContent.seo.url_slug || null,
        focus_keyword: structuredContent.seo.focus_keyword || null,
        image_alt_text: structuredContent.seo.image_alt_text || null,
        // Media roles
        media_roles: Object.keys(finalMediaRoles).length > 0 ? finalMediaRoles : null,
        // Merchandising — saved consistently for both create and edit
        feature_on_home: structuredContent.merchandising.feature_on_home,
        bundle_only: structuredContent.merchandising.bundle_only,
        collection_narrative: structuredContent.merchandising.collection_narrative || null,
      };

      if (isEditMode && defaultValues) {
        const { error: updateError } = await supabase
          .from("products")
          .update(payload)
          .eq("id", defaultValues.id);
        if (updateError) throw new Error(`Update Error: ${updateError.message}`);

        // Delete removed images from storage
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
      } else {
        const { error: dbError } = await supabase.from("products").insert([payload]);
        if (dbError) throw new Error(`Database Error: ${dbError.message}`);
      }

      router.push("/admin/products");
      router.refresh();
    } catch (error: unknown) {
      // Roll back any images uploaded this attempt so the bucket isn't orphaned
      if (newlyUploadedUrls.length > 0) {
        const orphanPaths = getProductImagePaths(newlyUploadedUrls);
        if (orphanPaths.length > 0) {
          try {
            await supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove(orphanPaths);
          } catch {
            // Best-effort cleanup; surface the original error below.
          }
        }
      }
      console.error("Error saving product:", error);
      await showAlert(
        error instanceof Error ? error.message : "Something went wrong while saving the product.",
        "Save Failed"
      );
      setSaving(false);
    }
  };

  const coverSrc = gallery[0]
    ? gallery[0].kind === "existing"
      ? gallery[0].url
      : gallery[0].previewUrl
    : null;

  const basePriceLabel = isPosterCategory
    ? "Base Price (A4 Frameless) *"
    : isDecalCategory
      ? "Base Price (Smallest Size) *"
      : "Base Price (INR) *";

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
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#808080] mb-2 block">
            {isEditMode ? "SKU Maintenance" : "SKU Deployment"}
          </span>
          <h1 className="text-4xl font-black uppercase tracking-tighter text-white">
            {isEditMode ? "Edit Product" : "New Product"}
          </h1>
        </div>
      </header>

      <form className="space-y-12" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Core Identification */}
          <div className="space-y-8 md:col-span-2 bg-[#1a1a1a] border border-[#2a2a2a] p-8">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-white border-b border-[#2a2a2a] pb-4 mb-6">
              Product Information
            </h2>

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
              {/* System Category — choose the type first (mirrors the bundle form layout) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#808080]">System Category *</label>
                  <button
                    type="button"
                    onClick={() => setIsAddingCategory(!isAddingCategory)}
                    className="text-[9px] font-bold uppercase tracking-widest text-[#ccff00] hover:text-white transition-colors flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[12px]">{isAddingCategory ? "close" : "add"}</span>
                    {isAddingCategory ? "Cancel" : "Quick Add"}
                  </button>
                </div>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  required
                  disabled={categories.length === 0}
                  className="w-full bg-[#1a1a1a] border-t-0 border-x-0 border-b border-[#333333] focus:border-[#ccff00] focus:ring-0 px-0 py-3 text-white transition-colors cursor-pointer"
                >
                  {categories.length === 0 ? <option value="">No categories found</option> : null}
                  {legacyCategory && <option value={legacyCategory}>{legacyCategory} (current)</option>}
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
                {isAddingCategory && (
                  <div className="bg-[#151515] border border-[#ccff00]/30 p-4 space-y-4 mt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ccff00] border-b border-[#2a2a2a] pb-2">New Subcategory</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <select
                          value={newCatParent}
                          onChange={(e) => setNewCatParent(e.target.value)}
                          className="w-full bg-[#1a1a1a] border border-[#333333] focus:border-[#ccff00] focus:ring-0 text-white p-2 text-sm"
                        >
                          <option value="" disabled hidden>Select Main Category...</option>
                          {topLevelCategories.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
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
                {categories.length === 0 ? (
                  <div className="text-[10px] text-[#808080]">
                    No categories available yet. Add one from{" "}
                    <Link href="/admin/categories" className="text-[#ccff00] hover:text-white transition-colors">
                      Categories
                    </Link>{" "}
                    before saving this product.
                  </div>
                ) : null}
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#808080]">Product SKU *</label>
                  {!isEditMode && (
                    <button
                      type="button"
                      onClick={() => {
                        const namePrefix = formData.name.replace(/\s+/g, "").slice(0, 3).toUpperCase() || "PRD";
                        const catPrefix = formData.category.replace(/\s+/g, "").slice(0, 2).toUpperCase() || "XX";
                        const rand = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
                        setFormData((prev) => ({ ...prev, sku: `NX-${catPrefix}-${namePrefix}-${rand}` }));
                      }}
                      className="text-[9px] font-bold uppercase tracking-widest text-[#ccff00] hover:text-white transition-colors"
                    >
                      Auto-Generate
                    </button>
                  )}
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
                  onChange={(e) => setStructuredContent((prev) => ({ ...prev, short_hook: e.target.value }))}
                  placeholder="Appears right below the product title on the storefront"
                  className="w-full bg-transparent border-t-0 border-x-0 border-b border-[#333333] focus:border-[#ccff00] focus:ring-0 px-0 py-3 text-white transition-colors"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#ccff00]">Product Story (Long Narrative) *</label>
                <textarea
                  value={structuredContent.product_story}
                  onChange={(e) => setStructuredContent((prev) => ({ ...prev, product_story: e.target.value }))}
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
                    onClick={() => setStructuredContent((prev) => ({ ...prev, highlights: [...prev.highlights, ""] }))}
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
                          setStructuredContent((prev) => ({ ...prev, highlights: newHighlights }));
                        }}
                        placeholder={`Highlight bullet point #${index + 1}`}
                        className="w-full bg-transparent border-t-0 border-x-0 border-b border-[#333333] focus:border-[#ccff00] focus:ring-0 px-0 py-2 text-white text-sm transition-colors"
                      />
                      {structuredContent.highlights.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setStructuredContent((prev) => ({
                              ...prev,
                              highlights: prev.highlights.filter((_, i) => i !== index),
                            }))
                          }
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
                      onChange={(e) =>
                        setStructuredContent((prev) => ({ ...prev, seo: { ...prev.seo, seo_title: e.target.value } }))
                      }
                      placeholder="e.g. Apex Velocity Stripe | Premium Art Print"
                      className="w-full bg-[#121212] border border-[#333333] focus:border-[#ccff00] px-3 py-2 text-white text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#808080]">Focus Keyword</label>
                    <input
                      type="text"
                      value={structuredContent.seo.focus_keyword}
                      onChange={(e) =>
                        setStructuredContent((prev) => ({ ...prev, seo: { ...prev.seo, focus_keyword: e.target.value } }))
                      }
                      placeholder="e.g. automotive poster"
                      className="w-full bg-[#121212] border border-[#333333] focus:border-[#ccff00] px-3 py-2 text-white text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#808080]">URL Slug Override</label>
                    <input
                      type="text"
                      value={structuredContent.seo.url_slug}
                      onChange={(e) =>
                        setStructuredContent((prev) => ({
                          ...prev,
                          seo: { ...prev.seo, url_slug: e.target.value.toLowerCase().replace(/\s+/g, "-") },
                        }))
                      }
                      placeholder="e.g. apex-velocity-stripe"
                      className="w-full bg-[#121212] border border-[#333333] focus:border-[#ccff00] px-3 py-2 text-white font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#808080]">Image Alt Text</label>
                    <input
                      type="text"
                      value={structuredContent.seo.image_alt_text}
                      onChange={(e) =>
                        setStructuredContent((prev) => ({ ...prev, seo: { ...prev.seo, image_alt_text: e.target.value } }))
                      }
                      placeholder="Describe image for screen readers and SEO..."
                      className="w-full bg-[#121212] border border-[#333333] focus:border-[#ccff00] px-3 py-2 text-white text-sm"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#808080]">Meta Description</label>
                    <textarea
                      value={structuredContent.seo.meta_description}
                      onChange={(e) =>
                        setStructuredContent((prev) => ({ ...prev, seo: { ...prev.seo, meta_description: e.target.value } }))
                      }
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
                    {structuredContent.seo.seo_title || formData.name || "Product Name | NexaDesignLab"}
                  </div>
                  <div className="text-[#006621] text-xs font-normal mt-0.5 truncate">
                    https://nexadesignlab.com/products/
                    {structuredContent.seo.url_slug || formData.sku.toLowerCase() || "product-id"}
                  </div>
                  <div className="text-[#545454] text-xs font-normal mt-1 line-clamp-2 leading-relaxed">
                    {structuredContent.seo.meta_description ||
                      "Premium visual art designed for collectors by NexaDesignLab. Discover museum-grade archival prints."}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Visibility & Merchandising */}
          <div className="space-y-8 md:col-span-2 bg-[#1a1a1a] border border-[#2a2a2a] p-8">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-white border-b border-[#2a2a2a] pb-4 mb-6">Visibility &amp; Merchandising</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div
                  className="flex items-center justify-between p-4 bg-[#121212] border border-[#333333] hover:border-[#ccff00]/50 transition-colors group cursor-pointer"
                  onClick={() =>
                    setStructuredContent((prev) => ({
                      ...prev,
                      merchandising: { ...prev.merchandising, bundle_only: !prev.merchandising.bundle_only },
                    }))
                  }
                >
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white">Sold Only as Bundle</div>
                    <div className="text-[9px] text-[#808080] uppercase tracking-wider">Hide from individual storefront listings</div>
                  </div>
                  <div className={`w-10 h-5 rounded-full relative transition-colors ${structuredContent.merchandising.bundle_only ? "bg-[#ccff00]" : "bg-[#333333]"}`}>
                    <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${structuredContent.merchandising.bundle_only ? "left-6" : "left-1"}`}></div>
                  </div>
                </div>

                <div
                  className="flex items-center justify-between p-4 bg-[#121212] border border-[#333333] hover:border-[#ccff00]/50 transition-colors group cursor-pointer"
                  onClick={() =>
                    setStructuredContent((prev) => ({
                      ...prev,
                      merchandising: { ...prev.merchandising, feature_on_home: !prev.merchandising.feature_on_home },
                    }))
                  }
                >
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white">Feature on Home</div>
                    <div className="text-[9px] text-[#808080] uppercase tracking-wider">Promote in the main cinematic gallery</div>
                  </div>
                  <div className={`w-10 h-5 rounded-full relative transition-colors ${structuredContent.merchandising.feature_on_home ? "bg-[#ccff00]" : "bg-[#333333]"}`}>
                    <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${structuredContent.merchandising.feature_on_home ? "left-6" : "left-1"}`}></div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#808080]">Collection Narrative</label>
                <textarea
                  value={structuredContent.merchandising.collection_narrative}
                  onChange={(e) =>
                    setStructuredContent((prev) => ({
                      ...prev,
                      merchandising: { ...prev.merchandising, collection_narrative: e.target.value },
                    }))
                  }
                  rows={4}
                  className="w-full bg-transparent border-t-0 border-x-0 border-b border-[#333333] focus:border-[#ccff00] focus:ring-0 px-0 py-3 text-white transition-colors resize-none text-sm"
                  placeholder="How does this product fit into its wider collection? (Optional)"
                ></textarea>
              </div>
            </div>
          </div>

          {/* Commerce & Categorization */}
          <div className="space-y-8 bg-[#1a1a1a] border border-[#2a2a2a] p-8">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-white border-b border-[#2a2a2a] pb-4 mb-6">Pricing &amp; Variants</h2>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#808080]">{basePriceLabel}</label>
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
                              onChange={(e) => updateDecalVariant(index, "size", e.target.value)}
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
                                onChange={(e) => updateDecalVariant(index, "price", e.target.value)}
                                step="0.01"
                                min="0"
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
                        onClick={() => setDecalVariants([...decalVariants, { size: "", price: "" }])}
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
                          A4 and A3 self-adhesive only. Framed and A3+ options stay hidden until you stock them (toggle
                          ENABLE_FRAMED / ENABLE_A3PLUS in ProductForm.tsx).
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
                        {ENABLE_FRAMED && (
                          <div className="space-y-2">
                            <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#808080]">A4 Framed Option</label>
                            <div className="relative">
                              <span className="absolute left-0 top-1/2 -translate-y-1/2 text-[#808080] font-mono px-3">₹</span>
                              <input
                                type="number"
                                name="framedPrice"
                                value={formData.framedPrice}
                                onChange={handleInputChange}
                                step="0.01"
                                min="0"
                                className="w-full bg-[#121212] border border-[#333333] focus:border-[#ccff00] focus:ring-0 pl-8 px-3 py-2 text-white transition-colors font-mono text-sm"
                                placeholder="0.00"
                              />
                            </div>
                          </div>
                        )}

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
                              step="0.01"
                              min="0"
                              className="w-full bg-[#121212] border border-[#333333] focus:border-[#ccff00] focus:ring-0 pl-8 px-3 py-2 text-white transition-colors font-mono text-sm"
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                        {ENABLE_FRAMED && (
                          <div className="space-y-2">
                            <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#808080]">A3 Framed Option</label>
                            <div className="relative">
                              <span className="absolute left-0 top-1/2 -translate-y-1/2 text-[#808080] font-mono px-3">₹</span>
                              <input
                                type="number"
                                name="a3FramedPrice"
                                value={formData.a3FramedPrice}
                                onChange={handleInputChange}
                                step="0.01"
                                min="0"
                                className="w-full bg-[#121212] border border-[#333333] focus:border-[#ccff00] focus:ring-0 pl-8 px-3 py-2 text-white transition-colors font-mono text-sm"
                                placeholder="0.00"
                              />
                            </div>
                          </div>
                        )}

                        {ENABLE_A3PLUS && (
                          <>
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
                                  step="0.01"
                                  min="0"
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
                                  step="0.01"
                                  min="0"
                                  className="w-full bg-[#121212] border border-[#333333] focus:border-[#ccff00] focus:ring-0 pl-8 px-3 py-2 text-white transition-colors font-mono text-sm"
                                  placeholder="0.00"
                                />
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

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
                <div
                  onClick={() => addMoreInputRef.current?.click()}
                  className="flex flex-col items-center justify-center h-full gap-4 text-[#808080] hover:text-[#ccff00] cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[32px]">public</span>
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Product Gallery *</span>
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

                      {isCover && (
                        <span className="absolute left-1 top-1 bg-[#ccff00] px-1.5 py-0.5 text-[7px] font-black uppercase tracking-[0.15em] text-[#121212] z-10">
                          Cover
                        </span>
                      )}

                      {/* Media Role Dropdown overlay */}
                      <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-1 z-30">
                        <select
                          value={mediaRoles[slot.kind === "existing" ? slot.url : slot.file.name] || (index === 0 ? "cover image" : "gallery image")}
                          onChange={(e) => {
                            const identifier = slot.kind === "existing" ? slot.url : slot.file.name;
                            setMediaRoles((prev) => ({ ...prev, [identifier]: e.target.value }));
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

                        <button
                          type="button"
                          title="Delete image"
                          onClick={() => removeImage(index)}
                          className="flex items-center justify-center bg-[#ff3333]/90 text-white p-1 hover:bg-[#ff3333] transition-colors rounded"
                        >
                          <span className="material-symbols-outlined text-[12px]">delete</span>
                        </button>
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
                <div>Drag images to reorder. Hover to set cover or delete. The first image is the product cover.</div>
                {deletedExistingUrls.length > 0 && (
                  <div className="text-[#ff9b9b]">
                    {deletedExistingUrls.length} image{deletedExistingUrls.length > 1 ? "s" : ""} will be permanently deleted from storage on save.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4 border-t border-[#2a2a2a] pt-8">
          <Link
            href="/admin/products"
            className="px-8 py-4 text-xs font-bold uppercase tracking-widest text-white border border-[#333333] hover:bg-[#222222] transition-colors text-center flex items-center"
          >
            {isEditMode ? "Cancel" : "Abort"}
          </Link>
          <button
            type="button"
            onClick={(e) => handleFormSubmit(e, "Draft")}
            disabled={saving || categories.length === 0}
            className="px-8 py-4 text-xs font-bold uppercase tracking-widest bg-[#222222] border border-[#333333] text-white hover:bg-[#333333] transition-colors flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Draft
            <span className="material-symbols-outlined text-[16px]">edit_document</span>
          </button>
          <button
            type="submit"
            disabled={saving || categories.length === 0}
            className="px-8 py-4 text-xs font-black uppercase tracking-widest bg-[#ccff00] text-[#121212] hover:bg-white transition-colors flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Transmitting Data..." : "Commit & Publish"}
            {!saving && <span className="material-symbols-outlined text-[16px]">rocket_launch</span>}
            {saving && <span className="material-symbols-outlined text-[16px] animate-spin">refresh</span>}
          </button>
        </div>
      </form>
    </div>
  );
}
