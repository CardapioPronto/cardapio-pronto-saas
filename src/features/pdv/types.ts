
import { Product } from "@/types";

export interface ItemPedido {
  produto: Product;
  quantidade: number;
  observacao?: string;
}

export interface Pedido {
  id: number;
  mesa: string;
  itensPedido: ItemPedido[];
  status: 'em-andamento' | 'finalizado' | 'pendente' | 'preparo' | 'cancelado';
  timestamp: Date;
  total: number;
}
