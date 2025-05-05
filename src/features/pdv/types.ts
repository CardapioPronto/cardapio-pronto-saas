
import { Product } from "@/types";

export interface ItemPedido {
  produto: Product;
  quantidade: number;
  observacao?: string;
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
