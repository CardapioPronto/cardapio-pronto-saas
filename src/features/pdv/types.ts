
import { Product } from "@/types";

// Create a simplified product type for database responses
export interface ProdutoSimplificado {
  id: string;
  name: string;
  price: number;
  description?: string;
  available?: boolean;
  category?: any;
  restaurant_id?: string;
}

export interface ItemPedido {
  produto: Product | ProdutoSimplificado; // Allow both full Product and simplified product format
  quantidade: number;
  observacao?: string | null;  // Allow null values from database responses
}

export interface Pedido {
  id: number | string; // Allow both number and string types for id to handle API responses
  mesa: string;
  cliente?: string;
  clientName?: string; // Campo adicional para compatibilidade
  itensPedido: ItemPedido[];
  status: 'em-andamento' | 'finalizado' | 'pendente' | 'preparo' | 'cancelado';
  timestamp: Date;
  total: number;
  source?: 'app' | 'ifood' | 'whatsapp';
}
