"use client";

import Link from "next/link";
import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAdminDialog } from "@/components/AdminDialogProvider";
import { supabase } from "@/lib/supabaseClient";

import { CategoryRecord } from "@/lib/categories";

const MAX_GALLERY_IMAGES = 8;

// A single line-item inside the bundle — self-contained, not linked to any product row
export type BundleLineItem = {
  product_id?: string;
  name: string;
  price: number;
  image_url: string | null;
  quantity: number;
};

interface Props {
  defaultValues?: {
    id: string;
    name: string;
    sku: string;
    category?: string;
    base_price: number;
    image_url: string | null;
    mockup_urls: string[] | null;
    bundle_items: BundleLineItem[];
    status: string;
    variants?: any[] | null;
    hero_headline?: string | null;
    subheadline?: string | null;
    default_size?: string | null;
    value_points?: string[] | null;
    urgency_tag?: string | null;
    highlight_badge?: string | null;
  };
  categories: CategoryRecord[];
}

const emptyItem = (): BundleLineItem => ({
  product_id: undefined,
  name: "",
  price: 0,
  image_url: null,
  quantity: 1,
});

export default function AdminBundleForm({ defaultValues, categories }: Props) {
  const router = useRouter();
  const { showAlert } = useAdminDialog();
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  // One hidden file input per line item for their thumbnail
  const itemImageRefs = useRef<(HTMLInputElement | null)[]>([]);
  const isEditMode = !!defaultValues;

  // Match the product form: A4/A3 only until A3+ paper is stocked.
  const ENABLE_A3PLUS = false;

  const [loading, setLoading] = useState(false);

  // The inline bundle items
  const [lineItems, setLineItems] = useState<BundleLineItem[]>(
    defaultValues?.bundle_items && defaultValues.bundle_items.length > 0
      ? defaultValues.bundle_items
      : [emptyItem()]
  );
  // Per-item image files (index matches lineItems)
  const [itemImageFiles, setItemImageFiles] = useState<(File | null)[]>(
    defaultValues?.bundle_items?.map(() => null) ?? [null]
  );
  // Per-item local preview URL (before upload)
  const [itemImagePreviews, setItemImagePreviews] = useState<(string | null)[]>(
    defaultValues?.bundle_items?.map(() => null) ?? [null]
  );

  // Bundle cover / gallery images
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(
    defaultValues?.image_url ?? null
  );
  const [existingMockupUrls, setExistingMockupUrls] = useState<string[]>(
    defaultValues?.mockup_urls ?? []
  );

  const [availableProducts, setAvailableProducts] = useState<any[]>([]);
  const [selectedProductToAdd, setSelectedProductToAdd] = useState<string>("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  useEffect(() => {
    async function fetchProducts() {
      const { data } = await supabase
        .from("products")
        .select("id, name, base_price, image_url, sku")
        .eq("is_bundle", false)
        .order("name");
      if (data) setAvailableProducts(data);
    }
    fetchProducts();
  }, []);

  const handleAddSelectedProduct = () => {
    if (!selectedProductToAdd) return;
    const product = availableProducts.find(p => p.id === selectedProductToAdd);
    if (!product) return;

    setLineItems(prev => {
      if (prev.length === 1 && !prev[0].name && prev[0].price === 0) {
        return [{
          product_id: product.id,
          name: product.name,
          price: Number(product.base_price),
          image_url: product.image_url,
          quantity: 1
        }];
      }
      return [
        ...prev,
        {
          product_id: product.id,
          name: product.name,
          price: Number(product.base_price),
          image_url: product.image_url,
          quantity: 1
        }
      ];
    });
    setItemImageFiles(prev => [...prev, null]);
    setItemImagePreviews(prev => [...prev, null]);
    setSelectedProductToAdd("");
  };

  const [formData, setFormData] = useState({
    name: defaultValues?.name ?? "",
    sku: defaultValues?.sku ?? "",
    bundlePrice: defaultValues?.base_price?.toString() ?? "",
    category: defaultValues?.category ?? "Bundle",
    a3Price: (() => {
      const a3 = defaultValues?.variants?.find((v: any) => v.size?.includes("A3 (12x18)"));
      return a3?.frameless_price?.toString() ?? "";
    })(),
    a3PlusPrice: (() => {
      const a3p = defaultValues?.variants?.find((v: any) => v.size?.includes("A3+ (13x19)"));
      return a3p?.frameless_price?.toString() ?? "";
    })(),
    hero_headline: defaultValues?.hero_headline ?? "",
    subheadline: defaultValues?.subheadline ?? "",
    default_size: defaultValues?.default_size ?? "A3 (12x18)",
    urgency_tag: defaultValues?.urgency_tag ?? "None",
    highlight_badge: defaultValues?.highlight_badge ?? "None",
  });

  const [valuePoints, setValuePoints] = useState<string[]>(
    defaultValues?.value_points && defaultValues.value_points.length > 0
      ? defaultValues.value_points
      : ["", "", ""]
  );


  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // ── Line-item helpers ─────────────────────────
  const addLineItem = () => {
    setLineItems((prev) => [...prev, emptyItem()]);
    setItemImageFiles((prev) => [...prev, null]);
    setItemImagePreviews((prev) => [...prev, null]);
  };

  const removeLineItem = (idx: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== idx));
    setItemImageFiles((prev) => prev.filter((_, i) => i !== idx));
    setItemImagePreviews((prev) => {
      const url = prev[idx];
      if (url) URL.revokeObjectURL(url);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const updateLineItem = <K extends keyof BundleLineItem>(
    idx: number,
    field: K,
    value: BundleLineItem[K]
  ) => {
    setLineItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item))
    );
  };

  const handleItemImageChange = (
    idx: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setItemImageFiles((prev) => {
      const copy = [...prev];
      copy[idx] = file;
      return copy;
    });
    setItemImagePreviews((prev) => {
      const copy = [...prev];
      if (copy[idx]) URL.revokeObjectURL(copy[idx]!);
      copy[idx] = preview;
      return copy;
    });
    // Reset the input so the same file can be re-selected
    e.target.value = "";
  };

  // ── Bundle gallery helpers ────────────────────
  const handleGalleryChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const currentCount =
      galleryFiles.length +
      (existingImageUrl ? 1 : 0) +
      existingMockupUrls.length;
    if (currentCount + files.length > MAX_GALLERY_IMAGES) {
      await showAlert(`Max ${MAX_GALLERY_IMAGES} gallery images allowed.`, "Gallery Limit");
      return;
    }
    setGalleryFiles((prev) => [...prev, ...files]);
    setGalleryPreviews((prev) => [
      ...prev,
      ...files.map((f) => URL.createObjectURL(f)),
    ]);
    if (galleryInputRef.current) galleryInputRef.current.value = "";
  };

  const removeGalleryFile = (idx: number) => {
    setGalleryFiles((prev) => prev.filter((_, i) => i !== idx));
    setGalleryPreviews((prev) => {
      URL.revokeObjectURL(prev[idx]);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const removeExistingImage = (url: string) => {
    if (url === existingImageUrl) setExistingImageUrl(null);
    else setExistingMockupUrls((prev) => prev.filter((u) => u !== url));
  };

  // ── Derived values ────────────────────────────
  const retailTotal = lineItems.reduce(
    (sum, item) => sum + Number(item.price) * item.quantity,
    0
  );
  const bundlePrice = parseFloat(formData.bundlePrice) || 0;
  const savings = retailTotal - bundlePrice;

  const allExistingUrls = [
    ...(existingImageUrl ? [existingImageUrl] : []),
    ...existingMockupUrls,
  ];
  const totalImageCount = allExistingUrls.length + galleryFiles.length;

  // ── Submit ────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.sku || !formData.bundlePrice) {
      await showAlert("Please fill in Name, SKU, and Bundle Price.", "Missing Fields");
      return;
    }

    const validItems = lineItems.filter((item) => item.name.trim());
    if (validItems.length < 1) {
      await showAlert(
        "Add at least one item with a name to this bundle.",
        "No Items"
      );
      return;
    }

    const hasImages =
      galleryFiles.length > 0 ||
      existingImageUrl ||
      existingMockupUrls.length > 0;
    if (!hasImages && !isEditMode) {
      await showAlert("Upload at least one bundle cover image.", "No Image");
      return;
    }

    setLoading(true);
    try {
      const uploadStamp = Date.now();

      // 1. Upload per-item thumbnail images
      const resolvedItems: BundleLineItem[] = await Promise.all(
        validItems.map(async (item, idx) => {
          const file = itemImageFiles[idx];
          if (!file) return item; // keep existing image_url (or null)

          const ext = file.name.split(".").pop();
          const imageName = `${formData.sku}-item-${idx}-${uploadStamp}.${ext}`;
          const { error } = await supabase.storage
            .from("product-images")
            .upload(imageName, file, { cacheControl: "3600", upsert: false });
          if (error) throw new Error(`Item image upload failed: ${error.message}`);

          const {
            data: { publicUrl },
          } = supabase.storage.from("product-images").getPublicUrl(imageName);
          return { ...item, image_url: publicUrl };
        })
      );

      // 2. Upload bundle gallery images
      const newlyUploadedUrls = await Promise.all(
        galleryFiles.map(async (file, idx) => {
          const ext = file.name.split(".").pop();
          const imageName = `${formData.sku}-gallery-${idx}-${uploadStamp}.${ext}`;
          const { error } = await supabase.storage
            .from("product-images")
            .upload(imageName, file, { cacheControl: "3600", upsert: false });
          if (error) throw new Error(`Gallery upload failed: ${error.message}`);
          const {
            data: { publicUrl },
          } = supabase.storage.from("product-images").getPublicUrl(imageName);
          return publicUrl;
        })
      );

      const allImageUrls = [
        ...(existingImageUrl ? [existingImageUrl] : []),
        ...existingMockupUrls,
        ...newlyUploadedUrls,
      ];
      const [primaryUrl, ...mockupUrls] = allImageUrls;

      const variantsJson = [
        { 
          size: "A4", 
          frameless_price: parseFloat(formData.bundlePrice || "0"), 
          active: true
        },
        { 
          size: "A3 (12x18)", 
          frameless_price: formData.a3Price ? parseFloat(formData.a3Price) : null, 
          active: true
        },
        { 
          size: "A3+ (13x19)", 
          frameless_price: formData.a3PlusPrice ? parseFloat(formData.a3PlusPrice) : null, 
          active: true
        }
      ].filter(v => v.frameless_price !== null);

      const payload = {
        sku: formData.sku,
        name: formData.name,
        category: formData.category,
        base_price: parseFloat(formData.bundlePrice),
        image_url: primaryUrl ?? null,
        mockup_urls: mockupUrls,
        variants: variantsJson,
        is_bundle: true,
        bundle_items: resolvedItems,
        status: "Active",
        hero_headline: formData.hero_headline || null,
        subheadline: formData.subheadline || null,
        default_size: formData.default_size || null,
        value_points: valuePoints.filter(p => p.trim() !== ""),
        urgency_tag: formData.urgency_tag !== "None" ? formData.urgency_tag : null,
        highlight_badge: formData.highlight_badge !== "None" ? formData.highlight_badge : null,
      };

      if (isEditMode && defaultValues) {
        const { error } = await supabase
          .from("products")
          .update(payload)
          .eq("id", defaultValues.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from("products").insert([payload]);
        if (error) throw new Error(error.message);
      }

      router.push("/admin/bundles");
      router.refresh();
    } catch (err) {
      await showAlert(
        err instanceof Error ? err.message : "Something went wrong.",
        "Save Failed"
      );
      setLoading(false);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700 max-w-4xl">
      {/* ── HEADER ───────────────────────────────────── */}
      <header className="relative flex flex-col gap-4 border-b border-[#2a2a2a] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <Link
          href="/admin/bundles"
          className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#808080] transition-colors hover:text-[#ccff00] sm:absolute sm:-top-10 sm:left-0"
        >
          <span className="material-symbols-outlined text-[14px]">arrow_back</span>
          Back to Bundles
        </Link>
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#808080] mb-2 block">
            {isEditMode ? "Editing Bundle" : "Bundle Deployment"}
          </span>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-white sm:text-4xl">
            {isEditMode ? formData.name || "Edit Bundle" : "New Bundle"}
          </h1>
        </div>
      </header>

      <form className="space-y-10" onSubmit={handleSubmit}>

        {/* ── SECTION 1: BUNDLE INFO ───────────────────── */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] p-6 sm:p-8 space-y-6">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-white border-b border-[#2a2a2a] pb-4">
            Bundle Information
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#808080]">
                Bundle Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="w-full bg-transparent border-t-0 border-x-0 border-b border-[#333333] focus:border-[#ccff00] focus:ring-0 px-0 py-3 text-white transition-colors"
                placeholder="e.g. Ultimate Car Decal Pack"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#808080]">
                System Category *
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                required
                className="w-full bg-[#1a1a1a] border-t-0 border-x-0 border-b border-[#333333] focus:border-[#ccff00] focus:ring-0 px-0 py-3 text-white transition-colors cursor-pointer"
              >
                <option value="Bundle">--- Bundle (Top Level) ---</option>
                {/* Organize categories by parent */}
                {categories.filter(c => !c.parent_id && c.name !== "Bundle").map(parent => (
                  <optgroup key={parent.id} label={parent.name} className="bg-[#1a1a1a]">
                    <option value={parent.name}>{parent.name} (Top Level)</option>
                    {categories.filter(c => c.parent_id === parent.id).map(child => (
                      <option key={child.id} value={child.name}>--- {child.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#808080]">
                Bundle SKU *
              </label>
              <input
                type="text"
                name="sku"
                value={formData.sku}
                onChange={handleInputChange}
                required
                className="w-full bg-transparent border-t-0 border-x-0 border-b border-[#333333] focus:border-[#ccff00] focus:ring-0 px-0 py-3 text-white transition-colors font-mono uppercase"
                placeholder="e.g. NX-BUNDLE-001"
              />
            </div>

          </div>
        </div>

        {/* ── SECTION 1.5: STOREFRONT SETTINGS ────────── */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] p-6 sm:p-8 space-y-8">
          <div className="border-b border-[#2a2a2a] pb-4 flex items-center gap-3">
            <span className="material-symbols-outlined text-[#ccff00] text-[20px]">auto_awesome</span>
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-white">
              Storefront Settings
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2 md:col-span-2">
              <div className="flex justify-between items-center mb-1">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#808080]">Hero Headline (Big Text)</label>
                <span className="text-[9px] text-[#666] italic">This is the main headline shown on the product page</span>
              </div>
              <input
                type="text"
                name="hero_headline"
                value={formData.hero_headline}
                onChange={handleInputChange}
                placeholder="e.g. THE ULTIMATE DISCIPLINE BUNDLE"
                className="w-full bg-transparent border-t-0 border-x-0 border-b border-[#333333] focus:border-[#ccff00] focus:ring-0 px-0 py-3 text-white transition-colors"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#808080]">Subheadline</label>
              <input
                type="text"
                name="subheadline"
                value={formData.subheadline}
                onChange={handleInputChange}
                placeholder="e.g. 8 Hand-picked posters for your workspace"
                className="w-full bg-transparent border-t-0 border-x-0 border-b border-[#333333] focus:border-[#ccff00] focus:ring-0 px-0 py-3 text-white transition-colors"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#808080]">Urgency Tag</label>
              <select
                name="urgency_tag"
                value={formData.urgency_tag}
                onChange={(e) => setFormData(prev => ({ ...prev, urgency_tag: e.target.value }))}
                className="w-full bg-[#1a1a1a] border-t-0 border-x-0 border-b border-[#333333] focus:border-[#ccff00] focus:ring-0 px-0 py-3 text-white transition-colors cursor-pointer"
              >
                <option value="None">None</option>
                <option value="Limited">Limited</option>
                <option value="Trending">Trending</option>
                <option value="Intro Offer">Intro Offer</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#808080]">Highlight Badge</label>
              <select
                name="highlight_badge"
                value={formData.highlight_badge}
                onChange={(e) => setFormData(prev => ({ ...prev, highlight_badge: e.target.value }))}
                className="w-full bg-[#1a1a1a] border-t-0 border-x-0 border-b border-[#333333] focus:border-[#ccff00] focus:ring-0 px-0 py-3 text-white transition-colors cursor-pointer"
              >
                <option value="None">None</option>
                <option value="Bestseller">Bestseller</option>
                <option value="Editor Pick">Editor Pick</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#808080]">Default Selected Size</label>
              <select
                name="default_size"
                value={formData.default_size}
                onChange={(e) => setFormData(prev => ({ ...prev, default_size: e.target.value }))}
                className="w-full bg-[#1a1a1a] border-t-0 border-x-0 border-b border-[#333333] focus:border-[#ccff00] focus:ring-0 px-0 py-3 text-white transition-colors cursor-pointer"
              >
                <option value="A4">A4</option>
                <option value="A3 (12x18)">A3 (12x18)</option>
                <option value="A3+ (13x19)">A3+ (13x19)</option>
              </select>
            </div>

            <div className="space-y-4 md:col-span-2">
              <div className="flex justify-between items-center mb-1">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#808080] block">Value Points (Max 4)</label>
                <span className="text-[9px] text-[#666] italic">max 4 points, keep each short (5–7 words)</span>
              </div>
              <div className="space-y-2">
                {valuePoints.map((point, idx) => (
                  <div key={idx} className="flex gap-2">
                    <span className="text-[#ccff00] py-2">•</span>
                    <input
                      type="text"
                      value={point}
                      onChange={(e) => {
                        const newPoints = [...valuePoints];
                        newPoints[idx] = e.target.value;
                        setValuePoints(newPoints);
                      }}
                      placeholder={`Value point ${idx + 1}`}
                      className="flex-1 bg-transparent border-t-0 border-x-0 border-b border-[#222] focus:border-[#ccff00] focus:ring-0 px-0 py-2 text-sm text-white transition-colors"
                    />
                  </div>
                ))}
                {valuePoints.length < 4 && (
                  <button
                    type="button"
                    onClick={() => setValuePoints([...valuePoints, ""])}
                    className="text-[9px] font-bold uppercase tracking-widest text-[#ccff00] hover:text-white transition-colors"
                  >
                    + Add Point
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── SECTION 2: LINE ITEMS ────────────────────── */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-[#2a2a2a] pb-4">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-white">
              What's in the Bundle
            </h2>
            <span className="text-[10px] font-mono text-[#808080]">
              {lineItems.length} item{lineItems.length !== 1 ? "s" : ""}
            </span>
          </div>
          {/* Custom Image-Supported Dropdown */}
          <div className="bg-[#161616] border border-[#2a2a2a] p-4 relative">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#808080] block mb-2">
              Quick Add Existing Product
            </label>
            
            <div className="relative w-full" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => {
                  setIsDropdownOpen(!isDropdownOpen);
                  if (!isDropdownOpen) setSearchQuery("");
                }}
                className="w-full bg-[#1a1a1a] border border-[#333333] px-4 py-3.5 text-left flex items-center justify-between text-white hover:border-[#ccff00] transition-colors group"
              >
                <span className="text-sm tracking-wide truncate">
                  {selectedProductToAdd 
                    ? availableProducts.find(p => p.id === selectedProductToAdd)?.name 
                    : "-- Choose a Poster or Decal --"}
                </span>
                <span className={`material-symbols-outlined text-[18px] transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`}>
                  expand_more
                </span>
              </button>

              {isDropdownOpen && (
                <div className="absolute z-50 left-0 right-0 top-[105%] bg-[#1a1a1a] border border-[#2a2a2a] max-h-80 overflow-y-auto divide-y divide-[#222222] shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                  {/* Search Header */}
                  <div className="sticky top-0 z-10 bg-[#1a1a1a] p-2 border-b border-[#222222]">
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#555] text-[18px]">search</span>
                      <input
                        type="text"
                        placeholder="Search by name or SKU..."
                        autoFocus
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") e.preventDefault();
                        }}
                        className="w-full bg-[#121212] border border-[#333333] pl-10 pr-10 py-2 text-sm text-white focus:border-[#ccff00] focus:ring-0 transition-colors"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery("")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555] hover:text-white transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">close</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {availableProducts
                    .filter(p => 
                      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()))
                    )
                    .length === 0 ? (
                    <div className="p-8 text-center text-[#808080] text-xs">
                      {availableProducts.length === 0 ? "No standalone products found." : "No matching products found."}
                    </div>
                  ) : availableProducts
                      .filter(p => 
                        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()))
                      )
                      .map((prod) => (
                    <button
                      key={prod.id}
                      type="button"
                      onClick={() => {
                        setSelectedProductToAdd(prod.id);
                        setIsDropdownOpen(false);
                        setSearchQuery("");
                      }}
                      className="w-full flex items-center gap-4 px-4 py-3 text-left hover:bg-[#ccff00]/10 transition-colors group/opt"
                    >
                      {prod.image_url ? (
                        <img
                          src={prod.image_url}
                          alt={prod.name}
                          className="w-10 h-10 object-cover border border-[#2a2a2a] bg-[#111] flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-[#222] flex items-center justify-center flex-shrink-0">
                          <span className="material-symbols-outlined text-[#555] text-[18px]">image</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate group-hover/opt:text-[#ccff00] transition-colors">{prod.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-[10px] text-[#ccff00] font-mono">₹{Number(prod.base_price).toFixed(0)}</p>
                          {prod.sku && <p className="text-[10px] text-[#555] font-mono uppercase tracking-tighter">/ {prod.sku}</p>}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedProductToAdd && (
              <button
                type="button"
                onClick={handleAddSelectedProduct}
                className="mt-4 w-full bg-[#ccff00] text-[#121212] font-black uppercase tracking-widest text-xs py-3 hover:bg-white transition-colors flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                Add To Bundle
              </button>
            )}
          </div>
          <div className="space-y-3">
            {lineItems.map((item, idx) => (
              <div
                key={idx}
                className="border border-[#2a2a2a] bg-[#121212] p-4 flex items-center gap-4 animate-in slide-in-from-top-2 duration-300"
              >
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-14 h-14 object-cover border border-[#2a2a2a] bg-[#111] flex-shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 bg-[#1a1a1a] border border-[#333333] flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-[#555] text-[20px]">image</span>
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-white truncate">{item.name}</h3>
                  <p className="text-xs font-mono text-[#ccff00] mt-0.5">₹{Number(item.price).toFixed(0)}</p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center border border-[#333333] bg-[#161616]">
                    <button
                      type="button"
                      onClick={() => updateLineItem(idx, "quantity", Math.max(1, item.quantity - 1))}
                      className="w-8 h-8 flex items-center justify-center text-[#a0a0a0] hover:text-white transition-colors"
                    >
                      −
                    </button>
                    <span className="w-6 text-center text-xs font-bold text-white">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateLineItem(idx, "quantity", item.quantity + 1)}
                      className="w-8 h-8 flex items-center justify-center text-[#a0a0a0] hover:text-white transition-colors"
                    >
                      +
                    </button>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => removeLineItem(idx)}
                    className="w-8 h-8 flex items-center justify-center text-[#555] hover:text-[#ff4444] transition-colors"
                    title="Remove item"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              </div>
            ))}
            
            {(!lineItems || lineItems.length === 0 || (!lineItems[0].name && lineItems[0].price === 0)) && (
              <div className="p-12 text-center border border-[#2a2a2a] text-[#808080] text-xs tracking-wider uppercase">
                No products added yet. Choose a poster from the selector above.
              </div>
            )}
          </div>
        </div>

        {/* ── SECTION 3: PRICING ───────────────────────── */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] p-6 sm:p-8 space-y-6">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-white border-b border-[#2a2a2a] pb-4">
            Bundle Pricing
          </h2>

          <div className="p-4 border border-[#ccff00]/30 bg-[#ccff00]/5 flex items-start gap-4">
              <span className="material-symbols-outlined text-[#ccff00] mt-1 text-[20px]">wallpaper</span>
              <div className="flex-1 space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-tight">Bundle Size Pricing</h3>
                  <p className="text-[10px] text-[#a0a0a0] leading-relaxed mt-1 tracking-wide">
                    Configure package rates for each print dimension. The A4 price maps directly to the main bundle price.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-[#ccff00]/20">
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#808080]">A4 Bundle Price</label>
                    <div className="relative">
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 text-[#808080] font-mono px-3">₹</span>
                      <input 
                        type="number" 
                        name="bundlePrice"
                        value={formData.bundlePrice}
                        onChange={handleInputChange}
                        step="0.01" min="0"
                        className="w-full bg-[#121212] border border-[#333333] focus:border-[#ccff00] focus:ring-0 pl-8 px-3 py-2 text-white transition-colors font-mono text-sm" 
                        placeholder="0.00" 
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#808080]">A3 Bundle Price</label>
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

                  {ENABLE_A3PLUS && (
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#808080]">A3+ Bundle Price</label>
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
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#808080]">
                Bundle Price (INR) *
              </label>
              <div className="relative">
                <span className="absolute left-0 top-1/2 -translate-y-1/2 text-[#808080] font-mono">₹</span>
                <input
                  type="number"
                  name="bundlePrice"
                  value={formData.bundlePrice}
                  onChange={handleInputChange}
                  required
                  step="0.01"
                  min="0"
                  className="w-full bg-transparent border-t-0 border-x-0 border-b border-[#333333] focus:border-[#ccff00] focus:ring-0 pl-6 py-3 text-white transition-colors font-mono"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="p-4 border border-[#2a2a2a] bg-[#121212] space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-[#808080]">Items Retail Total</span>
                <span className="font-mono text-[#a0a0a0]">₹{retailTotal.toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#808080]">Bundle Price</span>
                <span className="font-mono text-white font-bold">₹{bundlePrice.toFixed(0)}</span>
              </div>
              <div
                className={`flex justify-between text-sm pt-2 border-t border-[#2a2a2a] font-bold ${
                  savings > 0 ? "text-[#ccff00]" : savings === 0 ? "text-[#808080]" : "text-[#ff6666]"
                }`}
              >
                <span>Customer Saves</span>
                <span className="font-mono">
                  {savings > 0
                    ? `₹${savings.toFixed(0)}`
                    : savings === 0
                    ? "—"
                    : `-₹${Math.abs(savings).toFixed(0)}`}
                </span>
              </div>
            </div>
          </div>

        {/* ── SECTION 4: BUNDLE GALLERY ────────────────── */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] p-6 sm:p-8 space-y-6">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-white border-b border-[#2a2a2a] pb-4">
            Bundle Cover Images
          </h2>
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            ref={galleryInputRef}
            onChange={handleGalleryChange}
          />
          {/* Cover drop zone */}
          <div
            onClick={() => galleryInputRef.current?.click()}
            className="w-full aspect-video border border-dashed border-[#333333] flex flex-col items-center justify-center gap-4 text-[#808080] hover:border-[#ccff00] hover:text-[#ccff00] transition-all cursor-pointer bg-[#121212] relative overflow-hidden group"
          >
            {allExistingUrls[0] || galleryPreviews[0] ? (
              <>
                <img
                  src={allExistingUrls[0] ?? galleryPreviews[0]}
                  alt="Cover preview"
                  className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                />
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="material-symbols-outlined text-[32px] text-white">add_photo_alternate</span>
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white mt-2">
                    Add More Images
                  </span>
                </div>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[32px]">add_photo_alternate</span>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em]">
                  Bundle Cover Images *
                </span>
                <span className="text-[9px] text-[#666]">Click to upload — up to {MAX_GALLERY_IMAGES} images</span>
              </>
            )}
          </div>

          {/* Thumbnail strip */}
          {totalImageCount > 0 && (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {allExistingUrls.map((url, i) => (
                <div
                  key={`existing-${i}`}
                  className="aspect-square bg-[#121212] border border-[#333333] relative group/thumb overflow-hidden"
                >
                  <img src={url} alt="" className="w-full h-full object-cover opacity-80 group-hover/thumb:opacity-60 transition-opacity" />
                  {i === 0 && (
                    <span className="absolute left-1 top-1 bg-[#ccff00] px-1.5 py-0.5 text-[7px] font-black uppercase text-[#121212]">
                      Cover
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeExistingImage(url)}
                    className="absolute top-1 right-1 w-5 h-5 bg-[#ff3333]/90 text-white flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity"
                  >
                    <span className="material-symbols-outlined text-[12px]">close</span>
                  </button>
                </div>
              ))}
              {galleryPreviews.map((src, i) => (
                <div
                  key={`new-${i}`}
                  className="aspect-square bg-[#121212] border border-[#333333] relative group/thumb overflow-hidden"
                >
                  <img src={src} alt="" className="w-full h-full object-cover opacity-80 group-hover/thumb:opacity-60 transition-opacity" />
                  {allExistingUrls.length === 0 && i === 0 && (
                    <span className="absolute left-1 top-1 bg-[#ccff00] px-1.5 py-0.5 text-[7px] font-black uppercase text-[#121212]">
                      Cover
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeGalleryFile(i)}
                    className="absolute top-1 right-1 w-5 h-5 bg-[#ff3333]/90 text-white flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity"
                  >
                    <span className="material-symbols-outlined text-[12px]">close</span>
                  </button>
                </div>
              ))}
              {totalImageCount < MAX_GALLERY_IMAGES && (
                <div
                  onClick={() => galleryInputRef.current?.click()}
                  className="aspect-square border border-dashed border-[#333333] flex items-center justify-center text-[#606060] hover:text-[#ccff00] hover:border-[#ccff00] transition-colors cursor-pointer bg-[#121212]"
                >
                  <span className="material-symbols-outlined text-[20px]">add_photo_alternate</span>
                </div>
              )}
            </div>
          )}
          <p className="text-[9px] uppercase tracking-wider text-[#606060]">
            Up to {MAX_GALLERY_IMAGES} images. The first image is the bundle cover shown on the storefront.
          </p>
        </div>

        {/* ── ACTIONS ──────────────────────────────────── */}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 border-t border-[#2a2a2a] pt-8">
          <Link
            href="/admin/bundles"
            className="px-8 py-4 text-xs font-bold uppercase tracking-widest text-white border border-[#333333] hover:bg-[#222222] transition-colors text-center"
          >
            Abort
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-4 text-xs font-black uppercase tracking-widest bg-[#ccff00] text-[#121212] hover:bg-white transition-colors flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? "Saving..."
              : isEditMode
              ? "Update Bundle"
              : "Commit Bundle"}
            {!loading && (
              <span className="material-symbols-outlined text-[16px]">save</span>
            )}
            {loading && (
              <span className="material-symbols-outlined text-[16px] animate-spin">
                refresh
              </span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
