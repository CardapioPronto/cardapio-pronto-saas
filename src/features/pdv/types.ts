
import { Product, Category } from "@/types";

export type PedidoStatus = 'em-andamento' | 'finalizado' | 'pendente' | 'preparo' | 'cancelado';
export type HistoricoStatusFiltro = PedidoStatus | 'todos';
export type HistoricoPeriodoFiltro = 'hoje' | 'ontem' | '7dias' | 'mes' | 'personalizado';

export interface HistoricoPedidosFiltros {
  periodo: HistoricoPeriodoFiltro;
  dataInicio: string;
  dataFim: string;
  status: HistoricoStatusFiltro;
  pagina: number;
  itensPorPagina: number;
}

export interface HistoricoPedidosResumo {
  totalPedidos: number;
  totalVendido: number;
  pedidosAbertos: number;
  cancelados: number;
}

export interface HistoricoPedidosResultado {
  pedidos: Pedido[];
  total: number;
  resumo: HistoricoPedidosResumo;
}

// Create a simplified product type for database responses
export interface ProdutoSimplificado {
  id: string;
  name: string;
  price: number;
  description?: string;
  available?: boolean;
  category?: Category | null;
  restaurant_id?: string;
}

export interface ItemPedido {
  produto: Product | ProdutoSimplificado; // Allow both full Product and simplified product format
  quantidade: number;
  observacao?: string | null;  // Allow null values from database responses
}

export interface DadosClientePedido {
  nomeCliente?: string;
  telefoneCliente?: string;
}

export interface Pedido {
  id: number | string; // Allow both number and string types for id to handle API responses
  mesa?: string | null; // Alterado para suportar objeto mesa ou null
  table_id?: string | null; // Campo para número da mesa
  cliente?: string;
  clientName?: string; // Campo adicional para compatibilidade
  itensPedido: ItemPedido[];
  status: PedidoStatus;
  timestamp: Date;
  total: number;
  source?: 'app' | 'ifood' | 'whatsapp';
}
