
export interface Produto {
  id: number;
  nome: string;
  preco: number;
  categoria: string;
}

export interface ItemPedido {
  produto: Produto;
  quantidade: number;
  observacao: string;
}

export interface Pedido {
  id: number;
  mesa: string;
  itensPedido: ItemPedido[];
  status: 'em-andamento' | 'finalizado';
  timestamp: Date;
  total: number;
}
