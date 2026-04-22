// Crystal Aura — 購物車狀態管理
import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { Product } from "@/lib/data";

export interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  unitPrice: number;
  wristSize?: string;
  claspType?: "elastic" | "lobster" | "magnetic";
}

interface CartContextType {
  items: CartItem[];
  addToCart: (
    product: Product,
    options?: { unitPrice?: number; wristSize?: string; claspType?: "elastic" | "lobster" | "magnetic" }
  ) => void;
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
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const addToCart = useCallback((
    product: Product,
    options?: { unitPrice?: number; wristSize?: string; claspType?: "elastic" | "lobster" | "magnetic" }
  ) => {
    const unitPrice = options?.unitPrice ?? product.price;
    const itemId = `${product.id}-${options?.wristSize ?? "default"}-${options?.claspType ?? "default"}-${unitPrice}`;
    setItems(prev => {
      const existing = prev.find(item => item.id === itemId);
      if (existing) {
        return prev.map(item =>
          item.id === itemId
            ? { ...item, quantity: item.quantity + 1 }
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
