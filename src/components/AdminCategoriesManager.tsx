'use client';

import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import { useAdminDialog } from "@/components/AdminDialogProvider";
import { CATEGORIES_TABLE, CategoryRecord, slugifyCategoryName } from "@/lib/categories";
import { supabase } from "@/lib/supabaseClient";

const IMAGE_BUCKET = "category-images";

interface CategoryWithCount extends CategoryRecord {
  productCount: number;
}

interface AdminCategoriesManagerProps {
  categories: CategoryWithCount[];
}

// ─── Inline Edit Modal ─────────────────────────────────────────────────────────
interface EditModalProps {
  category: CategoryWithCount;
  onClose: () => void;
  onSaved: () => void;
}

function EditCategoryModal({ category, onClose, onSaved }: EditModalProps) {
  const { showAlert } = useAdminDialog();
  const [name, setName] = useState(category.name);
  const [categoryType, setCategoryType] = useState(category.category_type ?? "other");
  const [imagePreview, setImagePreview] = useState<string | null>(category.image_url ?? null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      await showAlert("Please enter a category name.", "Missing Name");
      return;
    }

    setSaving(true);
    try {
      let imageUrl = category.image_url ?? null;

      // Upload new image if selected
      if (imageFile) {
        const ext = imageFile.name.split(".").pop();
        const path = `${category.id}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from(IMAGE_BUCKET)
          .upload(path, imageFile, { upsert: true });
        if (uploadErr) throw new Error(uploadErr.message);
        const { data: urlData } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path);
        // Cache-bust so updated images refresh immediately
        imageUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      }

      const newSlug = slugifyCategoryName(trimmedName);
      const { error } = await supabase
        .from(CATEGORIES_TABLE)
        .update({ 
          name: trimmedName, 
          slug: newSlug, 
          image_url: imageUrl,
          category_type: categoryType 
        })
        .eq("id", category.id);

      if (error) throw new Error(error.message);

      onSaved();
      onClose();
    } catch (err: unknown) {
      await showAlert(err instanceof Error ? err.message : "Save failed.", "Error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[#141414] border border-[#2a2a2a] w-full max-w-md p-8 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#ccff00] block mb-1">
              Editing
            </span>
            <h3 className="text-xl font-black uppercase text-white tracking-tight">
              {category.name}
            </h3>
          </div>
          <button onClick={onClose} className="text-[#555] hover:text-white transition-colors p-1">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="space-y-6">
          {/* Name */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#808080]">
              Category Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              className="w-full bg-transparent border-t-0 border-x-0 border-b border-[#333] focus:border-[#ccff00] focus:ring-0 px-0 py-3 text-white transition-colors"
            />
          </div>

          {/* Category Type (Only for Top Level or to override) */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#808080]">
              Category Type
            </label>
            <select
              value={categoryType}
              onChange={(e) => setCategoryType(e.target.value as any)}
              className="w-full bg-[#151515] border border-[#333] focus:border-[#ccff00] focus:ring-0 px-4 py-3 text-sm text-white appearance-none"
            >
              <option value="other">Other / Generic</option>
              <option value="poster">Poster (Standard A4/A3/A3+)</option>
              <option value="decal">Decal (Custom sizes)</option>
              <option value="sticker">Sticker (Custom sizes)</option>
            </select>
          </div>

          {/* Image */}
          <div className="space-y-3">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#808080]">
              Category Image
            </label>

            {/* Preview */}
            {imagePreview ? (
              <div className="relative group w-full h-40 overflow-hidden border border-[#2a2a2a]">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="text-[10px] font-black uppercase tracking-widest text-white border border-white/30 px-4 py-2 hover:border-[#ccff00] hover:text-[#ccff00] transition-colors"
                  >
                    Change
                  </button>
                  <button
                    type="button"
                    onClick={() => { setImagePreview(null); setImageFile(null); }}
                    className="text-[10px] font-black uppercase tracking-widest text-white border border-white/30 px-4 py-2 hover:border-red-500 hover:text-red-400 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full h-32 border border-dashed border-[#333] hover:border-[#ccff00]/50 bg-[#111] flex flex-col items-center justify-center gap-2 transition-colors group"
              >
                <span className="material-symbols-outlined text-[28px] text-[#444] group-hover:text-[#ccff00]/60 transition-colors">
                  add_photo_alternate
                </span>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#555] group-hover:text-[#ccff00]/60 transition-colors">
                  Upload Image
                </span>
              </button>
            )}

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </div>

        {/* Save button */}
        <div className="mt-8 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-6 py-3 border border-[#333] text-[10px] font-black uppercase tracking-[0.2em] text-[#808080] hover:text-white hover:border-[#555] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-[2] px-6 py-3 bg-[#ccff00] text-[#121212] text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <span className="material-symbols-outlined text-[16px] animate-spin">refresh</span>
                Saving...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[16px]">check</span>
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Image Upload Field (reusable) ─────────────────────────────────────────────
interface ImageUploadFieldProps {
  preview: string | null;
  onFileChange: (file: File | null, previewUrl: string | null) => void;
}

function ImageUploadField({ preview, onFileChange }: ImageUploadFieldProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    onFileChange(file, file ? URL.createObjectURL(file) : null);
  };
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#808080]">
        Image <span className="text-[#555]">(optional)</span>
      </label>
      {preview ? (
        <div className="relative group w-full h-28 overflow-hidden border border-[#2a2a2a]">
          <img src={preview} alt="Preview" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button type="button" onClick={() => fileRef.current?.click()}
              className="text-[9px] font-black uppercase tracking-widest text-white border border-white/30 px-3 py-1.5 hover:border-[#ccff00] hover:text-[#ccff00] transition-colors">
              Change
            </button>
            <button type="button" onClick={() => onFileChange(null, null)}
              className="text-[9px] font-black uppercase tracking-widest text-white border border-white/30 px-3 py-1.5 hover:border-red-500 hover:text-red-400 transition-colors">
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => fileRef.current?.click()}
          className="w-full h-24 border border-dashed border-[#333] hover:border-[#ccff00]/50 bg-[#111] flex items-center justify-center gap-2 transition-colors group">
          <span className="material-symbols-outlined text-[20px] text-[#444] group-hover:text-[#ccff00]/60 transition-colors">add_photo_alternate</span>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#555] group-hover:text-[#ccff00]/60 transition-colors">Upload Image</span>
        </button>
      )}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleChange} />
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────────
export default function AdminCategoriesManager({ categories }: AdminCategoriesManagerProps) {
  const router = useRouter();
  const { showAlert, showConfirm } = useAdminDialog();

  // Create main category
  const [mainName, setMainName] = useState("");
  const [mainType, setMainType] = useState<'poster' | 'decal' | 'sticker' | 'other'>("poster");
  const [submittingMain, setSubmittingMain] = useState(false);

  // Create subcategory
  const [subName, setSubName] = useState("");
  const [subParentId, setSubParentId] = useState<string>("");
  const [subImageFile, setSubImageFile] = useState<File | null>(null);
  const [subImagePreview, setSubImagePreview] = useState<string | null>(null);
  const [submittingSub, setSubmittingSub] = useState(false);

  // Delete
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Edit modal
  const [editingCategory, setEditingCategory] = useState<CategoryWithCount | null>(null);

  const topLevelCategories = categories.filter(c => !c.parent_id);
  const getSubcategories = (parentId: string) => categories.filter(c => c.parent_id === parentId);

  // ── Handlers ──────────────────────────────────────────────────────────────────
  const handleAddMainCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = mainName.trim();
    if (!trimmedName) { await showAlert("Please enter a main category name.", "Missing Name"); return; }
    const slug = slugifyCategoryName(trimmedName);
    if (!slug) { await showAlert("Please enter a valid name.", "Invalid Name"); return; }

    setSubmittingMain(true);
    try {
      const { error } = await supabase.from(CATEGORIES_TABLE).insert([{ 
        name: trimmedName, 
        slug, 
        parent_id: null,
        category_type: mainType
      }]);
      if (error) throw new Error(error.message);
      setMainName("");
      router.refresh();
    } catch (err: unknown) {
      await showAlert(err instanceof Error ? err.message : "Something went wrong.", "Create Failed");
    } finally {
      setSubmittingMain(false);
    }
  };

  const handleAddSubCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = subName.trim();
    if (!trimmedName) { await showAlert("Please enter a subcategory name.", "Missing Name"); return; }
    if (!subParentId) { await showAlert("Please select a parent category.", "Missing Parent"); return; }
    const slug = slugifyCategoryName(trimmedName);
    if (!slug) { await showAlert("Please enter a valid name.", "Invalid Name"); return; }

    setSubmittingSub(true);
    try {
      // Insert category first to get the id
      const { data: inserted, error: insertErr } = await supabase
        .from(CATEGORIES_TABLE)
        .insert([{ name: trimmedName, slug, parent_id: subParentId }])
        .select()
        .single();
      if (insertErr) throw new Error(insertErr.message);

      // Upload image if provided
      let imageUrl: string | null = null;
      if (subImageFile && inserted) {
        const ext = subImageFile.name.split(".").pop();
        const path = `${inserted.id}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from(IMAGE_BUCKET)
          .upload(path, subImageFile, { upsert: true });
        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path);
          imageUrl = `${urlData.publicUrl}?t=${Date.now()}`;
          // Update the row with the image url
          await supabase.from(CATEGORIES_TABLE).update({ image_url: imageUrl }).eq("id", inserted.id);
        }
      }

      setSubName("");
      setSubParentId("");
      setSubImageFile(null);
      setSubImagePreview(null);
      router.refresh();
    } catch (err: unknown) {
      await showAlert(err instanceof Error ? err.message : "Something went wrong.", "Create Failed");
    } finally {
      setSubmittingSub(false);
    }
  };

  const handleDeleteCategory = async (category: CategoryWithCount) => {
    if (category.productCount > 0) {
      await showAlert(`"${category.name}" has ${category.productCount} product(s). Reassign before deleting.`, "Category In Use");
      return;
    }
    const ok = await showConfirm(`Delete "${category.name}"?`, "Delete Category");
    if (!ok) return;

    setDeletingId(category.id);
    try {
      const { error } = await supabase.from(CATEGORIES_TABLE).delete().eq("id", category.id);
      if (error) throw new Error(error.message);
      router.refresh();
    } catch (err: unknown) {
      await showAlert(err instanceof Error ? err.message : "Delete failed.", "Delete Failed");
    } finally {
      setDeletingId(null);
    }
  };

  // ── Category row renderer ─────────────────────────────────────────────────────
  const CategoryRow = ({ cat, isSubcat = false }: { cat: CategoryWithCount; isSubcat?: boolean }) => (
    <div className={`flex items-center justify-between gap-4 border border-[#2a2a2a] ${isSubcat ? "bg-[#121212]" : "bg-[#151515]"} px-5 py-4`}>
      <div className="min-w-0 flex items-center gap-3">
        {isSubcat && <span className="material-symbols-outlined text-[14px] text-[#555] shrink-0">subdirectory_arrow_right</span>}
        {/* Tiny image badge */}
        {cat.image_url ? (
          <div className="w-8 h-8 shrink-0 overflow-hidden border border-[#333] rounded">
            <img src={cat.image_url} alt={cat.name} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-8 h-8 shrink-0 border border-dashed border-[#333] rounded flex items-center justify-center bg-[#1a1a1a]">
            <span className="material-symbols-outlined text-[12px] text-[#444]">image</span>
          </div>
        )}
        <div className="min-w-0">
          <div className={`text-sm font-bold truncate ${isSubcat ? "text-[#ccc]" : "text-white"} ${isSubcat ? "border-l-2 border-[#333] pl-2" : ""}`}>
            {cat.name}
          </div>
          <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#606060] mt-0.5 pl-2">{cat.slug}</div>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#808080]">Products</div>
          <div className="text-sm font-black text-[#ccff00]">{cat.productCount}</div>
        </div>

        {/* Visibility toggle */}
        <button
          type="button"
          onClick={async () => {
            const newVisibility = cat.is_visible === false;
            const { error } = await supabase
              .from(CATEGORIES_TABLE)
              .update({ is_visible: newVisibility })
              .eq("id", cat.id);
            if (error) {
              showAlert(error.message, "Visibility Update Failed");
            } else {
              router.refresh();
            }
          }}
          className={`p-2 transition-colors flex items-center justify-center ${cat.is_visible !== false ? "text-[#ccff00] hover:text-[#808080]" : "text-[#555] hover:text-[#ccff00]"}`}
          title={cat.is_visible !== false ? "Hide in store" : "Show in store"}
        >
          <span className="material-symbols-outlined text-[20px]">
            {cat.is_visible !== false ? "visibility" : "visibility_off"}
          </span>
        </button>

        {/* Edit button */}
        <button
          type="button"
          onClick={() => setEditingCategory(cat)}
          className="text-[#606060] hover:text-[#ccff00] p-2 transition-colors"
          title="Edit category"
        >
          <span className="material-symbols-outlined text-[18px]">edit</span>
        </button>

        {/* Delete button */}
        <button
          type="button"
          onClick={() => handleDeleteCategory(cat)}
          disabled={deletingId === cat.id}
          className="text-[#606060] hover:text-[#ff3333] p-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          title="Delete category"
        >
          <span className="material-symbols-outlined text-[18px]">
            {deletingId === cat.id ? "hourglass_top" : "delete"}
          </span>
        </button>
      </div>
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Edit modal */}
      {editingCategory && (
        <EditCategoryModal
          category={editingCategory}
          onClose={() => setEditingCategory(null)}
          onSaved={() => router.refresh()}
        />
      )}

      <div className="space-y-10">
        <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)] gap-8">
          {/* Categories list */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] p-8">
            <div className="flex items-center justify-between gap-6 border-b border-[#2a2a2a] pb-5 mb-6">
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#808080] block mb-2">Category Registry</span>
                <h2 className="text-2xl font-black uppercase tracking-tight text-white">Listed Categories</h2>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#808080]">Total</div>
                <div className="text-3xl font-black text-[#ccff00]">{categories.length}</div>
              </div>
            </div>

            <div className="space-y-3">
              {categories.length === 0 ? (
                <div className="border border-dashed border-[#333] bg-[#121212] px-6 py-10 text-center text-sm text-[#808080]">
                  No categories yet. Add your first one from the panel on the right.
                </div>
              ) : (
                topLevelCategories.map((cat) => (
                  <div key={cat.id} className="space-y-3">
                    <CategoryRow cat={cat} />
                    {getSubcategories(cat.id).length > 0 && (
                      <div className="pl-6 space-y-3 border-l-[2px] border-[#333] ml-4">
                        {getSubcategories(cat.id).map((sub) => (
                          <CategoryRow key={sub.id} cat={sub} isSubcat />
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right panel — forms */}
          <div className="space-y-8 h-fit">
            {/* Add Main Category */}
            <section className="bg-[#1a1a1a] border border-[#2a2a2a] p-8">
              <div className="border-b border-[#2a2a2a] pb-5 mb-6">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#808080] block mb-2">Product Type</span>
                <h2 className="text-xl font-black uppercase tracking-tight text-white">Add Main Category</h2>
              </div>
              <form className="space-y-6" onSubmit={handleAddMainCategory}>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#808080]">Main Category Name</label>
                  <input
                    type="text"
                    value={mainName}
                    onChange={(e) => setMainName(e.target.value)}
                    placeholder="e.g. Posters, Decals"
                    className="w-full bg-transparent border-t-0 border-x-0 border-b border-[#333] focus:border-[#ccff00] focus:ring-0 px-0 py-3 text-white transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#808080]">Main Category Type</label>
                  <select
                    value={mainType}
                    onChange={(e) => setMainType(e.target.value as any)}
                    className="w-full bg-[#151515] border border-[#333] focus:border-[#ccff00] focus:ring-0 px-4 py-3 text-sm text-white appearance-none"
                  >
                    <option value="poster">Poster</option>
                    <option value="decal">Decal</option>
                    <option value="sticker">Sticker</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="text-[11px] text-[#808080] leading-relaxed">Use this to create high-level product types.</div>
                <button
                  type="submit"
                  disabled={submittingMain}
                  className="w-full flex items-center justify-center gap-3 bg-[#333] text-white px-6 py-4 text-xs font-black uppercase tracking-[0.2em] hover:bg-white hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submittingMain ? "Adding..." : "Add Main Category"}
                  <span className={`material-symbols-outlined text-[18px] ${submittingMain ? "animate-spin" : ""}`}>
                    {submittingMain ? "refresh" : "add"}
                  </span>
                </button>
              </form>
            </section>

            {/* Add Subcategory */}
            <section className="bg-[#1a1a1a] border border-[#2a2a2a] p-8 relative overflow-hidden">
              {topLevelCategories.length === 0 && (
                <div className="absolute inset-0 bg-[#121212]/90 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-6 text-center border-l-4 border-[#ccff00]">
                  <span className="material-symbols-outlined text-4xl text-[#ccff00] mb-3">lock</span>
                  <h3 className="text-white text-sm font-bold uppercase tracking-widest mb-2">Needs Main Category</h3>
                  <p className="text-xs text-[#808080] leading-relaxed">Create a Main Category first (e.g. Posters or Decals) before adding subcategories.</p>
                </div>
              )}

              <div className="border-b border-[#2a2a2a] pb-5 mb-6">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#ccff00] block mb-2">Collection</span>
                <h2 className="text-xl font-black uppercase tracking-tight text-white">Add Subcategory</h2>
              </div>

              <form className="space-y-5" onSubmit={handleAddSubCategory}>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#808080]">Subcategory Name</label>
                  <input
                    type="text"
                    value={subName}
                    onChange={(e) => setSubName(e.target.value)}
                    placeholder="e.g. Travel Series, Spiritual"
                    className="w-full bg-transparent border-t-0 border-x-0 border-b border-[#333] focus:border-[#ccff00] focus:ring-0 px-0 py-3 text-white transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#808080]">Parent Category *</label>
                  <select
                    value={subParentId}
                    onChange={(e) => setSubParentId(e.target.value)}
                    required
                    className="w-full bg-[#151515] border border-[#333] focus:border-[#ccff00] focus:ring-0 px-4 py-3 text-sm text-white transition-colors appearance-none"
                  >
                    <option value="" disabled hidden>Select a Main Category...</option>
                    {topLevelCategories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Image upload */}
                <ImageUploadField
                  preview={subImagePreview}
                  onFileChange={(file, preview) => { setSubImageFile(file); setSubImagePreview(preview); }}
                />

                <div className="text-[11px] text-[#808080] leading-relaxed">
                  Subcategories are nested directly beneath their respective Main Categories.
                </div>

                <button
                  type="submit"
                  disabled={submittingSub}
                  className="w-full flex items-center justify-center gap-3 bg-[#ccff00] text-[#121212] px-6 py-4 text-xs font-black uppercase tracking-[0.2em] hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submittingSub ? "Adding..." : "Add Subcategory"}
                  <span className={`material-symbols-outlined text-[18px] ${submittingSub ? "animate-spin" : ""}`}>
                    {submittingSub ? "refresh" : "add"}
                  </span>
                </button>
              </form>
            </section>
          </div>
        </section>
      </div>
    </>
  );
}
