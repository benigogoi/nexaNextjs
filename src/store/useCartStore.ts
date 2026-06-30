import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  id: string; // Composite Cart ID (e.g. product.id + size + finish)
  productId: string; // Original Product ID
  name: string;
  price: number;
  quantity: number;
  image_url: string;
  size?: string;
  finish?: string;
}

interface CartState {
  items: CartItem[];
  buyNowItem: CartItem | null;
  addItem: (item: CartItem) => void;
  setBuyNowItem: (item: CartItem | null) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  updateItem: (id: string, patch: Partial<CartItem>) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getSubtotal: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      buyNowItem: null,
      addItem: (item) => {
        set((state) => {
          const existingItem = state.items.find((i) => i.id === item.id);
          if (existingItem) {
            return {
              items: state.items.map((i) =>
                i.id === item.id ? { ...i, quantity: i.quantity + item.quantity } : i
              ),
            };
          }
          return { items: [...state.items, item] };
        });
      },
      setBuyNowItem: (item) => set({ buyNowItem: item }),
      removeItem: (id) => {
        set((state) => ({
          items: state.items.filter((i) => i.id !== id),
        }));
      },
      updateQuantity: (id, quantity) => {
        set((state) => ({
          items: state.items.map((i) =>
            i.id === id ? { ...i, quantity: Math.max(1, quantity) } : i
          ),
        }));
      },
      updateItem: (id, patch) => {
        set((state) => {
          const idx = state.items.findIndex((i) => i.id === id);
          if (idx === -1) return state;

          const updated = { ...state.items[idx], ...patch };
          // Re-derive the composite cart id (matches the product page scheme) so the
          // line stays consistent after a size/finish change.
          updated.id = updated.size
            ? `${updated.productId}-${String(updated.size).replace(/\s+/g, "")}${updated.finish ? `-${updated.finish}` : ""}`
            : updated.productId;

          const items = [...state.items];
          const dupeIdx = items.findIndex((i, k) => k !== idx && i.id === updated.id);
          if (dupeIdx !== -1) {
            // Same size/finish already in cart — merge quantities and drop the old line.
            items[dupeIdx] = { ...items[dupeIdx], quantity: items[dupeIdx].quantity + updated.quantity };
            items.splice(idx, 1);
          } else {
            items[idx] = updated;
          }
          return { items };
        });
      },
      clearCart: () => set({ items: [] }),
      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },
      getSubtotal: () => {
        return get().items.reduce((total, item) => total + (item.price * item.quantity), 0);
      },
    }),
    {
      name: 'nexa-cart-storage', // unique name for localStorage key
    }
  )
);
