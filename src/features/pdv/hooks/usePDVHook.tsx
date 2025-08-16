import { useState, useEffect, useCallback } from "react";
import { Product } from "@/types";
import { Pedido, ItemPedido } from "../types";
import { toast } from "sonner";
import { 
  salvarPedido, 
  listarPedidos, 
  alterarStatusPedido 
} from "../services/pedidoService";

export const usePDVHook = (restaurantId: string) => {
  // Estados do PDV
  const [itensPedido, setItensPedido] = useState<ItemPedido[]>([]);
  const [mesaSelecionada, setMesaSelecionada] = useState("");
  const [categoriaAtiva, setCategoriaAtiva] = useState("all");
  const [observacaoAtual, setObservacaoAtual] = useState("");
  const [produtoSelecionado, setProdutoSelecionado] = useState<Product | null>(null);
  const [busca, setBusca] = useState("");
  const [tipoPedido, setTipoPedido] = useState<"mesa" | "balcao">("mesa");
  const [pedidosHistorico, setPedidosHistorico] = useState<Pedido[]>([]);
  const [visualizacaoAtiva, setVisualizacaoAtiva] = useState<"novo" | "historico">("novo");
  const [salvandoPedido, setSalvandoPedido] = useState(false);
  const [nomeCliente, setNomeCliente] = useState("");

  // Carregar histórico de pedidos
  const carregarHistoricoPedidos = useCallback(async () => {
    if (!restaurantId) return;
    
    const result = await listarPedidos(restaurantId);
    if (result.success) {
      // Convert API response to match our Pedido interface
      const pedidos = result.pedidos || [];
      setPedidosHistorico(pedidos as Pedido[]);
    } else {
      toast.error("Erro ao carregar o histórico de pedidos");
    }
  }, [restaurantId]);

  useEffect(() => {
    if (restaurantId && visualizacaoAtiva === "historico") {
      carregarHistoricoPedidos();
    }
  }, [restaurantId, visualizacaoAtiva, carregarHistoricoPedidos]);

  // Ação ao selecionar um produto
  const adicionarProduto = (produto: Product) => {
    console.log("Produto selecionado para adicionar:", produto);
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
    (total, item) => total + item.produto.price * item.quantidade,
    0
  );

  // Finalizar pedido
  const finalizarPedido = async () => {
    if (itensPedido.length === 0) {
      toast.error("Adicione pelo menos um item ao pedido");
      return;
    }
    
    if (!mesaSelecionada) {
      toast.error("Selecione uma mesa para o pedido");
      return;
    }
    
    if (!restaurantId) {
      toast.error("ID do restaurante não encontrado");
      return;
    }
    
    try {
      setSalvandoPedido(true);
      const mesa = tipoPedido === "mesa" ? `Mesa ${mesaSelecionada}` : `Balcão - Mesa ${mesaSelecionada}`;
      
      const result = await salvarPedido(
        restaurantId,
        mesa,
        itensPedido,
        totalPedido,
        nomeCliente.trim() || undefined // Passa undefined se estiver vazio para usar o valor padrão
      );
      
      if (result.success) {
        setItensPedido([]);
        setNomeCliente("");
        setMesaSelecionada("");
        setVisualizacaoAtiva("historico");
        await carregarHistoricoPedidos();
      }
    } catch (error) {
      console.error("Erro ao finalizar pedido:", error);
      toast.error("Ocorreu um erro ao finalizar o pedido");
    } finally {
      setSalvandoPedido(false);
    }
  };

  // Mudar status do pedido
  const handleAlterarStatusPedido = async (pedidoId: number | string, novoStatus: 'em-andamento' | 'finalizado' | 'pendente' | 'preparo' | 'cancelado') => {
    const result = await alterarStatusPedido(String(pedidoId), novoStatus);
    if (result.success) {
      // Atualizar o estado local para refletir a mudança imediatamente
      setPedidosHistorico(pedidos => 
        pedidos.map(pedido => 
          pedido.id === pedidoId 
            ? { ...pedido, status: novoStatus } 
            : pedido
        )
      );
    }
  };

  return {
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
    salvandoPedido,
    adicionarProduto,
    confirmarAdicao,
    cancelarAdicao,
    alterarQuantidade,
    removerItem,
    totalPedido,
    finalizarPedido,
    handleAlterarStatusPedido,
    carregarHistoricoPedidos,
    nomeCliente,
    setNomeCliente
  };
};
