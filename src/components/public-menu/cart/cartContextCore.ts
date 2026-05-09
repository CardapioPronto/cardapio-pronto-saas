import { createContext, useContext } from "react"

export interface CartItem {
  id: string
  product_id: string
  name: string
  price: number
  quantity: number
  image_url?: string
  observations?: string
}

export interface CartContextValue {
  items: CartItem[]
  subtotal: number
  count: number
  addItem: (item: Omit<CartItem, "id" | "quantity"> & { quantity?: number }) => void
  updateQuantity: (id: string, quantity: number) => void
  updateObservations: (id: string, observations: string) => void
  removeItem: (id: string) => void
  clear: () => void
}

export const CartContext = createContext<CartContextValue | null>(null)

export const useCart = () => {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error("useCart deve ser usado dentro de CartProvider")
  return ctx
}

export const formatBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
