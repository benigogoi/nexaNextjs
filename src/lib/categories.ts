export const CATEGORIES_TABLE = "categories";

export type CategoryRecord = {
  id: string;
  name: string;
  slug: string;
  parent_id?: string | null;
  image_url?: string | null;
  is_visible?: boolean;
  category_type?: 'poster' | 'decal' | 'sticker' | 'other' | null;
  created_at?: string;
};

export function slugifyCategoryName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
