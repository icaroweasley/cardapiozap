import { create } from 'zustand';

export interface CartItemOption {
  name: string;
  price: number;
}

export interface CartItem {
  id: string; // Unique cart item ID to allow same product with different options
  productId: string;
  name: string;
  price: number;
  quantity: number;
  options?: CartItemOption[];
}

interface CartStore {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'id' | 'quantity'> & { quantity?: number }) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  addItem: (item) => set((state) => {
    // Check if there is an exact match (same product AND same options)
    const optionsStr = JSON.stringify(item.options || []);
    const existingIndex = state.items.findIndex(i => 
      i.productId === item.productId && JSON.stringify(i.options || []) === optionsStr
    );

    const quantityToAdd = item.quantity || 1;

    if (existingIndex >= 0) {
      const newItems = [...state.items];
      newItems[existingIndex].quantity += quantityToAdd;
      return { items: newItems };
    }
    
    // Create a new entry
    return { 
      items: [...state.items, { ...item, id: crypto.randomUUID(), quantity: quantityToAdd }] 
    };
  }),
  removeItem: (id) => set((state) => ({
    items: state.items.filter(i => i.id !== id)
  })),
  updateQuantity: (id, quantity) => set((state) => ({
    items: quantity <= 0 
      ? state.items.filter(i => i.id !== id)
      : state.items.map(i => i.id === id ? { ...i, quantity } : i)
  })),
  clearCart: () => set({ items: [] }),
  getTotal: () => {
    return get().items.reduce((total, item) => {
      let itemTotal = item.price;
      if (item.options) {
        item.options.forEach(opt => itemTotal += opt.price);
      }
      return total + (itemTotal * item.quantity);
    }, 0);
  }
}));
