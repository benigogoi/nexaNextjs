import { computeShipping } from "./shipping";

// Authoritative, server-side price math. The browser can send whatever prices it
// likes — these helpers ignore that and recompute everything from the products
// table, so an order can never be charged less than its real value.

export interface CartLineInput {
  productId: string;
  size?: string;
  quantity: number;
}

export interface ComputedCart {
  subtotal: number;
  shipping: number;
  lines: {
    productId: string;
    size?: string;
    quantity: number;
    unit_price: number;
    line_total: number;
  }[];
}

/** Price for a product at a given size — mirrors the storefront product page logic. */
export function unitPrice(product: any, size?: string): number {
  let price = Number(product?.base_price) || 0;
  if (Array.isArray(product?.variants) && size) {
    const variant = product.variants.find((v: any) => v.size === size);
    if (variant) {
      if (variant.frameless_price !== undefined && variant.frameless_price !== null) {
        price = Number(variant.frameless_price);
      } else if (variant.price !== undefined && variant.price !== null) {
        price = Number(variant.price);
      }
    }
  }
  return price;
}

/**
 * Recompute the cart from authoritative DB prices. Never trust client-sent prices.
 * Throws if an item references a missing or inactive product.
 */
export async function computeCartFromDb(
  supabaseAdmin: any,
  items: CartLineInput[]
): Promise<ComputedCart> {
  const list = Array.isArray(items) ? items : [];
  const ids = [...new Set(list.map((i) => i.productId).filter(Boolean))];

  if (ids.length === 0) {
    return { subtotal: 0, shipping: 0, lines: [] };
  }

  const { data: products, error } = await supabaseAdmin
    .from("products")
    .select("id, base_price, variants, status")
    .in("id", ids);

  if (error) throw new Error(`Price lookup failed: ${error.message}`);

  const byId = new Map<string, any>((products || []).map((p: any) => [p.id, p]));

  let subtotal = 0;
  const lines = list.map((i) => {
    const product: any = byId.get(i.productId);
    if (!product || (product.status && product.status !== "Active")) {
      throw new Error("One or more items in your cart are no longer available.");
    }
    const quantity = Math.max(1, Math.floor(Number(i.quantity) || 1));
    const unit_price = unitPrice(product, i.size);
    const line_total = unit_price * quantity;
    subtotal += line_total;
    return { productId: i.productId, size: i.size, quantity, unit_price, line_total };
  });

  return { subtotal, shipping: computeShipping(subtotal), lines };
}

/** Discount amount for a validated coupon row against a server-computed subtotal. */
export function couponDiscount(
  subtotal: number,
  coupon?: { discount_type: string; discount_value: number } | null
): number {
  if (!coupon) return 0;
  return coupon.discount_type === "percentage"
    ? subtotal * (Number(coupon.discount_value) / 100)
    : Math.min(subtotal, Number(coupon.discount_value));
}
