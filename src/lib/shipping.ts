// Single source of truth for shipping rules.
// Used by the cart, checkout, and (recommended) the server-side order/amount calc
// so the displayed shipping and the actually-charged shipping never drift apart.

export const FREE_SHIPPING_THRESHOLD = 599; // ₹: spend this much (or more) → free shipping
export const FLAT_SHIPPING_FEE = 79; // ₹: flat fee charged below the threshold

/** Shipping fee for a given cart subtotal. Empty cart ships nothing. */
export function computeShipping(subtotal: number): number {
  if (subtotal <= 0) return 0;
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING_FEE;
}

/** How much more the customer must add to unlock free shipping (0 once unlocked). */
export function amountToFreeShipping(subtotal: number): number {
  return Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
}
