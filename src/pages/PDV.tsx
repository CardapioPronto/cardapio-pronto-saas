
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ObservacaoModal } from "@/features/pdv/components/ObservacaoModal";
import { HistoricoPedidos } from "@/features/pdv/components/HistoricoPedidos";
import { NovoPedido } from "@/features/pdv/components/NovoPedido";
import { PDVTabs } from "@/features/pdv/components/PDVTabs";
import { OverrideEstoqueDialog } from "@/features/pdv/components/OverrideEstoqueDialog";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { usePermissionsV2 } from "@/hooks/usePermissionsV2";
import { usePDVHook } from "@/features/pdv/hooks/usePDVHook";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Expand,
  Eye,
  EyeOff,
  Minimize,
  MonitorCog,
  ReceiptText,
  ShoppingCart,
} from "lucide-react";
import { toast } from "sonner";

export default function PDV() {
  // Obter o usuário atual e ID do restaurante
  const { user } = useCurrentUser();
  const { hasPermission } = usePermissionsV2();
  const navigate = useNavigate();
  const restaurantId = user?.restaurant_id || "";
  const [restaurantName, setRestaurantName] = useState("Pubfy");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mostrarValorVendido, setMostrarValorVendido] = useState(true);
  const canViewDashboard = hasPermission("dashboard_view");
  const canViewOrderHistory = hasPermission("orders_view");
  const canViewFinancials = hasPermission("orders_metrics_view");
  const canManageOrders = hasPermission("orders_manage");
  const canOverrideStock = hasPermission("products_manage");
  
  // Usar o hook refatorado que contém toda a lógica
  const {
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
    setNomeCliente,
    stockOverride,
    confirmarOverrideEstoque,
    cancelarOverrideEstoque,
  } = usePDVHook(restaurantId);

  useEffect(() => {
    let active = true;

    const carregarNomeRestaurante = async () => {
      if (!restaurantId) {
        setRestaurantName("Pubfy");
        return;
      }

      const { data, error } = await supabase
        .from("restaurants")
        .select("name")
        .eq("id", restaurantId)
        .maybeSingle();

      if (!active) return;
      if (!error && data?.name) {
        setRestaurantName(data.name);
      }
    };

    carregarNomeRestaurante();

    return () => {
      active = false;
    };
  }, [restaurantId]);

  useEffect(() => {
    if (!canViewOrderHistory && visualizacaoAtiva === "historico") {
      setVisualizacaoAtiva("novo");
    }
  }, [canViewOrderHistory, setVisualizacaoAtiva, visualizacaoAtiva]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        return;
      }

      await document.exitFullscreen();
    } catch (error) {
      console.error("Erro ao alternar tela cheia:", error);
      toast.error("Não foi possível alternar a tela cheia neste navegador.");
    }
  };

  const totalItensPedido = itensPedido.reduce((total, item) => total + item.quantidade, 0);
  const pedidoTipoLabel = tipoPedido === "mesa" ? "Mesa" : "Balcão";
  const mostrandoVendido = visualizacaoAtiva === "historico" && canViewFinancials;
  const valorTopo = mostrandoVendido
    ? historicoResumo.totalVendido
    : totalPedido;
  const valorTopoLabel = mostrandoVendido
    ? "Vendido"
    : "Pedido atual";
  const valorTopoFormatado = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valorTopo);
  const valorTopoVisivel = !mostrandoVendido || mostrarValorVendido;

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-zinc-50">
      <header className="shrink-0 border-b bg-background shadow-sm">
        <div className="flex flex-col gap-3 px-3 py-3 lg:flex-row lg:items-center lg:justify-between lg:px-5">
          <div className="flex min-w-0 items-center gap-3">
            {canViewDashboard && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => navigate("/dashboard")}
                aria-label="Voltar ao dashboard"
                title="Voltar ao dashboard"
                className="shrink-0"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <MonitorCog className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <h1 className="truncate text-base font-semibold leading-tight sm:text-lg">
                  {restaurantName}
                </h1>
                <Badge variant="outline" className="hidden shrink-0 sm:inline-flex">
                  PDV
                </Badge>
              </div>
              <p className="truncate text-xs text-muted-foreground">
                Operação de vendas em tempo real
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="gap-1.5 py-1">
              <ShoppingCart className="h-3.5 w-3.5" />
              {pedidoTipoLabel}
            </Badge>
            <Badge variant="outline" className="gap-1.5 py-1">
              <ReceiptText className="h-3.5 w-3.5" />
              {totalItensPedido} {totalItensPedido === 1 ? "item" : "itens"}
            </Badge>
            <div className="inline-flex items-center overflow-hidden rounded-md border bg-emerald-50 text-sm font-semibold text-emerald-800">
              <div
                className="px-3 py-1"
                title={valorTopoLabel}
                aria-label={`${valorTopoLabel}: ${valorTopoVisivel ? valorTopoFormatado : "oculto"}`}
              >
                <span className="mr-1 hidden text-emerald-700/75 sm:inline">{valorTopoLabel}:</span>
                {valorTopoVisivel ? valorTopoFormatado : "••••••"}
              </div>
              {mostrandoVendido && (
                <button
                  type="button"
                  onClick={() => setMostrarValorVendido((visible) => !visible)}
                  className="flex h-8 w-8 items-center justify-center border-l border-emerald-200 text-emerald-700 transition-colors hover:bg-emerald-100"
                  aria-label={mostrarValorVendido ? "Ocultar valor vendido" : "Mostrar valor vendido"}
                  title={mostrarValorVendido ? "Ocultar valor vendido" : "Mostrar valor vendido"}
                >
                  {mostrarValorVendido ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={toggleFullscreen}
              className="ml-auto lg:ml-0"
            >
              {isFullscreen ? <Minimize className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
              {isFullscreen ? "Sair" : "Tela cheia"}
            </Button>
          </div>
        </div>

        <div className="px-3 pb-3 lg:px-5">
          <PDVTabs
            visualizacaoAtiva={visualizacaoAtiva}
            onChangeVisualizacao={setVisualizacaoAtiva}
            tipoPedido={tipoPedido}
            onChangeTipoPedido={trocarTipoPedido}
            showPedidoTabs={visualizacaoAtiva === "novo"}
            canViewHistory={canViewOrderHistory}
          />
        </div>
      </header>

      <main className="dashboard-scrollbar min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-3 lg:p-5">
        <div className="mx-auto h-full w-full max-w-[1800px]">
          {visualizacaoAtiva === "novo" ? (
            <NovoPedido
              restaurantId={restaurantId}
              restaurantName={restaurantName}
              categoriaAtiva={categoriaAtiva}
              setCategoriaAtiva={setCategoriaAtiva}
              busca={busca}
              setBusca={setBusca}
              itensPedido={itensPedido}
              totalPedido={totalPedido}
              salvandoPedido={salvandoPedido}
              adicionarProduto={adicionarProduto}
              alterarQuantidade={alterarQuantidade}
              removerItem={removerItem}
              finalizarPedidoOriginal={finalizarPedido}
              tipoPedido={tipoPedido}
              mesaSelecionada={mesaSelecionada}
              setMesaSelecionada={setMesaSelecionada}
              nomeCliente={nomeCliente}
              setNomeCliente={setNomeCliente}
            />
          ) : canViewOrderHistory ? (
            <HistoricoPedidos
              pedidosHistorico={pedidosHistorico}
              carregando={carregandoHistorico}
              alterarStatusPedido={handleAlterarStatusPedido}
              onAtualizar={carregarHistoricoPedidos}
              restaurantName={restaurantName}
              filtros={historicoFiltros}
              total={historicoTotal}
              resumo={historicoResumo}
              onChangePeriodo={setHistoricoPeriodo}
              onChangeStatus={setHistoricoStatus}
              onChangeDataInicio={setHistoricoDataInicio}
              onChangeDataFim={setHistoricoDataFim}
              onChangePagina={setHistoricoPagina}
              onChangeItensPorPagina={setHistoricoItensPorPagina}
              canViewFinancials={canViewFinancials}
              canManageOrders={canManageOrders}
            />
          ) : null}
        </div>
      </main>

      {/* Modal para adicionar observação ao produto */}
      <ObservacaoModal 
        produtoSelecionado={produtoSelecionado}
        observacaoAtual={observacaoAtual}
        setObservacaoAtual={setObservacaoAtual}
        confirmarAdicao={confirmarAdicao}
        cancelarAdicao={cancelarAdicao}
      />

      <OverrideEstoqueDialog
        open={stockOverride.open}
        errorMessage={stockOverride.errorMessage}
        canOverride={canOverrideStock}
        onCancel={cancelarOverrideEstoque}
        onConfirm={confirmarOverrideEstoque}
      />
    </div>
  );
}
