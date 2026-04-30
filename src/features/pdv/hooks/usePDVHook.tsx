import { useState, useEffect, useCallback } from "react";
import { Product } from "@/types";
import {
  DadosClientePedido,
  HistoricoPedidosFiltros,
  HistoricoPedidosResumo,
  HistoricoPeriodoFiltro,
  HistoricoStatusFiltro,
  ItemPedido,
  Pedido,
  PedidoStatus,
} from "../types";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { 
  salvarPedido, 
  listarPedidos, 
  alterarStatusPedido 
} from "../services/pedidoService";
import {
  getDateRangeByPeriod,
  getInitialHistoricoFiltros,
  toEndOfDayIso,
  toStartOfDayIso,
} from "../utils/historicoPedidos";

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
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);
  const [historicoFiltros, setHistoricoFiltros] = useState<HistoricoPedidosFiltros>(getInitialHistoricoFiltros);
  const [historicoTotal, setHistoricoTotal] = useState(0);
  const [historicoResumo, setHistoricoResumo] = useState<HistoricoPedidosResumo>({
    totalPedidos: 0,
    totalVendido: 0,
    pedidosAbertos: 0,
    cancelados: 0,
  });

  const trocarTipoPedido = useCallback((novoTipo: "mesa" | "balcao") => {
    setTipoPedido(novoTipo);
    if (novoTipo === "balcao") {
      setMesaSelecionada("");
    }
  }, []);

  // Carregar histórico de pedidos
  const carregarHistoricoPedidos = useCallback(async () => {
    if (!restaurantId) return;

    setCarregandoHistorico(true);
    
    try {
      const result = await listarPedidos(restaurantId, {
        dataInicio: toStartOfDayIso(historicoFiltros.dataInicio),
        dataFim: toEndOfDayIso(historicoFiltros.dataFim),
        status: historicoFiltros.status,
        pagina: historicoFiltros.pagina,
        itensPorPagina: historicoFiltros.itensPorPagina,
      });

      if (result.success) {
        setPedidosHistorico(result.pedidos);
        setHistoricoTotal(result.total);
        setHistoricoResumo(result.resumo);
      } else {
        toast.error("Erro ao carregar o histórico de pedidos");
      }
    } finally {
      setCarregandoHistorico(false);
    }
  }, [restaurantId, historicoFiltros]);

  useEffect(() => {
    if (restaurantId && visualizacaoAtiva === "historico") {
      carregarHistoricoPedidos();
    }
  }, [restaurantId, visualizacaoAtiva, carregarHistoricoPedidos]);

  const setHistoricoPeriodo = useCallback((periodo: HistoricoPeriodoFiltro) => {
    const range = periodo === "personalizado" ? {} : getDateRangeByPeriod(periodo);
    setHistoricoFiltros((filtros) => ({
      ...filtros,
      periodo,
      ...range,
      pagina: 1,
    }));
  }, []);

  const setHistoricoStatus = useCallback((status: HistoricoStatusFiltro) => {
    setHistoricoFiltros((filtros) => ({
      ...filtros,
      status,
      pagina: 1,
    }));
  }, []);

  const setHistoricoDataInicio = useCallback((dataInicio: string) => {
    setHistoricoFiltros((filtros) => ({
      ...filtros,
      periodo: "personalizado",
      dataInicio,
      pagina: 1,
    }));
  }, []);

  const setHistoricoDataFim = useCallback((dataFim: string) => {
    setHistoricoFiltros((filtros) => ({
      ...filtros,
      periodo: "personalizado",
      dataFim,
      pagina: 1,
    }));
  }, []);

  const setHistoricoPagina = useCallback((pagina: number) => {
    setHistoricoFiltros((filtros) => ({
      ...filtros,
      pagina,
    }));
  }, []);

  const setHistoricoItensPorPagina = useCallback((itensPorPagina: number) => {
    setHistoricoFiltros((filtros) => ({
      ...filtros,
      itensPorPagina,
      pagina: 1,
    }));
  }, []);

  // Ação ao selecionar um produto
  const adicionarProduto = (produto: Product) => {
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
  const finalizarPedido = async (dadosCliente: DadosClientePedido = {}) => {
    if (itensPedido.length === 0) {
      toast.error("Adicione pelo menos um item ao pedido");
      return false;
    }
    
    // Validar mesa apenas para pedidos tipo "mesa"
    if (tipoPedido === "mesa" && !mesaSelecionada) {
      toast.error("Selecione uma mesa para o pedido");
      return false;
    }
    
    if (!restaurantId) {
      toast.error("ID do restaurante não encontrado");
      return false;
    }
    
    try {
      setSalvandoPedido(true);
      const mesa = tipoPedido === "mesa" && mesaSelecionada ? `Mesa ${mesaSelecionada}` : "Balcão";
      
      // Obter o ID do usuário atual da sessão
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Usuário não autenticado");
        return false;
      }

      const nomeClientePedido = dadosCliente.nomeCliente?.trim() || nomeCliente.trim() || undefined;
      const telefoneClientePedido = dadosCliente.telefoneCliente?.trim() || undefined;
      
      const result = await salvarPedido(
        restaurantId,
        mesa,
        itensPedido,
        totalPedido,
        user.id, // ID do funcionário/usuário logado
        nomeClientePedido,
        telefoneClientePedido,
        tipoPedido === "mesa" ? mesaSelecionada : undefined
      );
      
      if (result.success) {
        setItensPedido([]);
        setNomeCliente("");
        setMesaSelecionada("");
        setVisualizacaoAtiva("historico");
        await carregarHistoricoPedidos();
      }

      return result.success;
    } catch (error) {
      console.error("Erro ao finalizar pedido:", error);
      toast.error("Ocorreu um erro ao finalizar o pedido");
      return false;
    } finally {
      setSalvandoPedido(false);
    }
  };

  // Mudar status do pedido
  const handleAlterarStatusPedido = async (pedidoId: number | string, novoStatus: PedidoStatus) => {
    const result = await alterarStatusPedido(String(pedidoId), novoStatus);
    if (result.success) {
      setPedidosHistorico(pedidos => 
        pedidos.map(pedido => 
          pedido.id === pedidoId 
            ? { ...pedido, status: novoStatus } 
            : pedido
        )
      );
      await carregarHistoricoPedidos();
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
    trocarTipoPedido,
    pedidosHistorico,
    carregandoHistorico,
    historicoFiltros,
    historicoTotal,
    historicoResumo,
    setHistoricoPeriodo,
    setHistoricoStatus,
    setHistoricoDataInicio,
    setHistoricoDataFim,
    setHistoricoPagina,
    setHistoricoItensPorPagina,
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
