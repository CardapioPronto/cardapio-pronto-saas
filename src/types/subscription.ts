
export interface Assinatura {
  id: string;
  planoId: string;
  status: "ativa" | "inativa";
  dataInicio: Date;
  dataProximaCobranca: Date;
  metodoPagamento: string;
  historicoPagamentos?: {
    id: string;
    data: Date;
    valor: number;
    status: "aprovado" | "recusado" | "pendente";
  }[];
}

export interface PlanoFormatado {
  id: string;
  nome: string;
  preco: number;
  periodo: string;
}
