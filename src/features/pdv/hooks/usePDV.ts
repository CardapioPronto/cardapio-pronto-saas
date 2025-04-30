
import { useState } from "react";
import { Produto, ItemPedido, Pedido } from "../types";
import { toast } from "@/components/ui/sonner";

// Dados de exemplo para produtos
const produtosExemplo: Produto[] = [
  { id: 1, nome: "X-Burger", preco: 18.90, categoria: "lanches" },
  { id: 2, nome: "X-Salada", preco: 21.90, categoria: "lanches" },
  { id: 3, nome: "X-Tudo", preco: 24.90, categoria: "lanches" },
  { id: 4, nome: "Batata Frita", preco: 12.90, categoria: "porcoes" },
  { id: 5, nome: "Anéis de Cebola", preco: 15.90, categoria: "porcoes" },
  { id: 6, nome: "Água Mineral", preco: 3.50, categoria: "bebidas" },
  { id: 7, nome: "Refrigerante Lata", preco: 5.00, categoria: "bebidas" },
  { id: 8, nome: "Cerveja Long Neck", preco: 7.50, categoria: "bebidas" },
  { id: 9, nome: "Suco Natural", preco: 8.00, categoria: "bebidas" },
  { id: 10, nome: "Pudim", preco: 8.90, categoria: "sobremesas" },
  { id: 11, nome: "Sorvete", preco: 10.90, categoria: "sobremesas" },
];

export function usePDV() {
  const [itensPedido, setItensPedido] = useState<ItemPedido[]>([]);
  const [mesaSelecionada, setMesaSelecionada] = useState("1");
  const [categoriaAtiva, setCategoriaAtiva] = useState("lanches");
  const [observacaoAtual, setObservacaoAtual] = useState("");
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null);
  const [busca, setBusca] = useState("");
  const [tipoPedido, setTipoPedido] = useState<"mesa" | "balcao">("mesa");
  const [pedidosHistorico, setPedidosHistorico] = useState<Pedido[]>([]);
  const [visualizacaoAtiva, setVisualizacaoAtiva] = useState<"novo" | "historico">("novo");
  
  // Filtrar produtos por categoria e busca
  const produtosFiltrados = produtosExemplo.filter(produto => {
    const matchesCategoria = produto.categoria === categoriaAtiva;
    const matchesBusca = busca === "" || 
                         produto.nome.toLowerCase().includes(busca.toLowerCase());
    return matchesCategoria && matchesBusca;
  });

  // Função para adicionar produto ao pedido
  const adicionarProduto = (produto: Produto) => {
    setProdutoSelecionado(produto);
  };

  // Confirmar adição do produto com observação
  const confirmarAdicao = () => {
    if (!produtoSelecionado) return;
    
    setItensPedido(itensAtuais => {
      const itemExistente = itensAtuais.find(
        item => item.produto.id === produtoSelecionado.id && 
                item.observacao === observacaoAtual
      );
      
      if (itemExistente) {
        return itensAtuais.map(item => 
          item === itemExistente 
            ? { ...item, quantidade: item.quantidade + 1 } 
            : item
        );
      } else {
        return [...itensAtuais, { 
          produto: produtoSelecionado, 
          quantidade: 1,
          observacao: observacaoAtual 
        }];
      }
    });
    
    setProdutoSelecionado(null);
    setObservacaoAtual("");
  };

  // Cancelar adição do produto
  const cancelarAdicao = () => {
    setProdutoSelecionado(null);
    setObservacaoAtual("");
  };

  // Função para alterar a quantidade de um item
  const alterarQuantidade = (itemIndex: number, delta: number) => {
    setItensPedido(itensAtuais => {
      return itensAtuais.map((item, i) => {
        if (i === itemIndex) {
          const novaQuantidade = Math.max(1, item.quantidade + delta);
          return { ...item, quantidade: novaQuantidade };
        }
        return item;
      });
    });
  };

  // Função para remover item do pedido
  const removerItem = (itemIndex: number) => {
    setItensPedido(itensAtuais => itensAtuais.filter((_, i) => i !== itemIndex));
  };

  // Calcular total do pedido
  const totalPedido = itensPedido.reduce(
    (total, item) => total + item.produto.preco * item.quantidade,
    0
  );

  // Finalizar pedido
  const finalizarPedido = () => {
    if (itensPedido.length === 0) {
      toast("Adicione itens ao pedido", {
        description: "Seu pedido está vazio."
      });
      return;
    }
    
    const novoPedido: Pedido = {
      id: pedidosHistorico.length + 1,
      mesa: tipoPedido === "mesa" ? mesaSelecionada : "Balcão",
      itensPedido: [...itensPedido],
      status: 'em-andamento',
      timestamp: new Date(),
      total: totalPedido
    };
    
    setPedidosHistorico([novoPedido, ...pedidosHistorico]);
    
    toast.success("Pedido finalizado com sucesso!", {
      description: `${tipoPedido === "mesa" ? `Mesa ${mesaSelecionada}` : "Balcão"} - Total: R$ ${totalPedido.toFixed(2)}`
    });
    
    // Limpar o pedido atual
    setItensPedido([]);
  };

  // Mudar status do pedido
  const alterarStatusPedido = (pedidoId: number, novoStatus: 'em-andamento' | 'finalizado') => {
    setPedidosHistorico(pedidos => 
      pedidos.map(pedido => 
        pedido.id === pedidoId 
          ? { ...pedido, status: novoStatus } 
          : pedido
      )
    );
    
    toast.success(`Pedido #${pedidoId} marcado como ${novoStatus === 'em-andamento' ? 'Em andamento' : 'Finalizado'}`);
  };

  return {
    // Estado
    itensPedido,
    mesaSelecionada,
    setMesaSelecionada,
    categoriaAtiva,
    setCategoriaAtiva,
    observacaoAtual,
    setObservacaoAtual,
    produtoSelecionado,
    busca,
    setBusca,
    tipoPedido,
    setTipoPedido,
    pedidosHistorico,
    visualizacaoAtiva,
    setVisualizacaoAtiva,
    produtosFiltrados,
    totalPedido,

    // Ações
    adicionarProduto,
    confirmarAdicao,
    cancelarAdicao,
    alterarQuantidade,
    removerItem,
    finalizarPedido,
    alterarStatusPedido,
  };
}
