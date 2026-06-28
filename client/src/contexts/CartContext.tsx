// Crystal Aura — 購物車狀態管理
import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { Product } from "@/lib/data";

// 購物車存進 sessionStorage：讓使用者在「同分頁跳轉去綠界選店」再回來時，
// 購物車不會被清空（純記憶體 state 會在整頁導頁後消失）。sessionStorage 會
// 在分頁關閉時自動清掉，不會像 localStorage 那樣長期殘留。
const CART_STORAGE_KEY = "cart_items";

function loadStoredCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  unitPrice: number;
  wristSize?: string;
  claspType?: "elastic" | "lobster" | "magnetic";
  fitPreference?: "just-right" | "loose";
  isPreorder?: boolean;
  customConsultationNote?: string;
}

type AddToCartOptions = {
  unitPrice?: number;
  wristSize?: string;
  claspType?: "elastic" | "lobster" | "magnetic";
  fitPreference?: "just-right" | "loose";
  isPreorder?: boolean;
  customConsultationNote?: string;
};

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, options?: AddToCartOptions) => void;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(loadStoredCart);
  const [isOpen, setIsOpen] = useState(false);

  // items 變動時同步寫回 sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* 容量超過或無法寫入時略過，不影響購物流程 */
    }
  }, [items]);

  const addToCart = useCallback((
    product: Product,
    options?: AddToCartOptions
  ) => {
    const unitPrice = options?.unitPrice ?? product.price;
    const consultationKey = options?.customConsultationNote
      ? (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`)
      : "default";
    const itemId = `${product.id}-${options?.wristSize ?? "default"}-${options?.claspType ?? "default"}-${options?.fitPreference ?? "default"}-${unitPrice}-${consultationKey}`;
    setItems(prev => {
      const existing = prev.find(item => item.id === itemId);
      if (existing) {
        return prev.map(item =>
          item.id === itemId
            ? { ...item, quantity: item.quantity + 1, isPreorder: options?.isPreorder ?? item.isPreorder }
            : item
        );
      }
      return [
        ...prev,
        {
          id: itemId,
          product,
          quantity: 1,
          unitPrice,
          wristSize: options?.wristSize,
          claspType: options?.claspType,
          fitPreference: options?.fitPreference,
          isPreorder: options?.isPreorder,
          customConsultationNote: options?.customConsultationNote,
        },
      ];
    });
    setIsOpen(true);
  }, []);

  const removeFromCart = useCallback((itemId: string) => {
    setItems(prev => prev.filter(item => item.id !== itemId));
  }, []);

  const updateQuantity = useCallback((itemId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems(prev => prev.filter(item => item.id !== itemId));
    } else {
      setItems(prev =>
        prev.map(item =>
          item.id === itemId ? { ...item, quantity } : item
        )
      );
    }
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  return (
    <CartContext.Provider value={{
      items,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      totalItems,
      totalPrice,
      isOpen,
      setIsOpen
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
}
