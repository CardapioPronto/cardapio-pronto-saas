import { useCallback, useEffect, useMemo, useState, ReactNode } from 'react';
import { CartContext, type CartContextValue, type CartItem } from './cartContextCore';

export type { CartItem } from './cartContextCore';

const STORAGE_KEY_PREFIX = 'pubfy_cart_';

const flavorFingerprint = (item: Pick<CartItem, 'flavor_selection'>) => {
  if (!item.flavor_selection) return 'single';
  const flavorIds = item.flavor_selection.flavors
    .map((flavor) => flavor.product_id)
    .sort()
    .join('|');
  return `${item.flavor_selection.pricing_strategy}:${flavorIds}:${item.flavor_selection.unit_price}`;
};

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
        p =>
          p.product_id === item.product_id &&
          !p.observations &&
          !item.observations &&
          flavorFingerprint(p) === flavorFingerprint(item)
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
