import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';

export interface CartItem {
  id: string;            // unique line id
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  image_url?: string;
  observations?: string;
}

interface CartContextValue {
  items: CartItem[];
  subtotal: number;
  count: number;
  addItem: (item: Omit<CartItem, 'id' | 'quantity'> & { quantity?: number }) => void;
  updateQuantity: (id: string, quantity: number) => void;
  updateObservations: (id: string, observations: string) => void;
  removeItem: (id: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY_PREFIX = 'pubfy_cart_';

interface CartProviderProps {
  restaurantId: string;
  children: ReactNode;
}

export const CartProvider = ({ restaurantId, children }: CartProviderProps) => {
  const storageKey = `${STORAGE_KEY_PREFIX}${restaurantId}`;
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? (JSON.parse(raw) as CartItem[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(items));
    } catch {
      /* ignore */
    }
  }, [items, storageKey]);

  const addItem: CartContextValue['addItem'] = useCallback((item) => {
    setItems(prev => {
      // Mescla por product_id + observations vazias
      const existingIdx = prev.findIndex(
        p => p.product_id === item.product_id && !p.observations && !item.observations
      );
      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx] = {
          ...next[existingIdx],
          quantity: next[existingIdx].quantity + (item.quantity || 1),
        };
        return next;
      }
      return [
        ...prev,
        {
          id: `${item.product_id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          quantity: item.quantity || 1,
          ...item,
        },
      ];
    });
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    setItems(prev =>
      prev
        .map(p => (p.id === id ? { ...p, quantity: Math.max(0, quantity) } : p))
        .filter(p => p.quantity > 0)
    );
  }, []);

  const updateObservations = useCallback((id: string, observations: string) => {
    setItems(prev => prev.map(p => (p.id === id ? { ...p, observations } : p)));
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.filter(p => p.id !== id));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const subtotal = useMemo(
    () => items.reduce((s, i) => s + i.price * i.quantity, 0),
    [items]
  );

  const count = useMemo(() => items.reduce((s, i) => s + i.quantity, 0), [items]);

  const value = useMemo<CartContextValue>(
    () => ({ items, subtotal, count, addItem, updateQuantity, updateObservations, removeItem, clear }),
    [items, subtotal, count, addItem, updateQuantity, updateObservations, removeItem, clear]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart deve ser usado dentro de CartProvider');
  return ctx;
};

export const formatBRL = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });