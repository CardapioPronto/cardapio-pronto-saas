
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useEffect, useState } from "react";
import { ObservacaoModal } from "@/features/pdv/components/ObservacaoModal";
import { HistoricoPedidos } from "@/features/pdv/components/HistoricoPedidos";
import { NovoPedido } from "@/features/pdv/components/NovoPedido";
import { PDVTabs } from "@/features/pdv/components/PDVTabs";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { usePDVHook } from "@/features/pdv/hooks/usePDVHook";
import { supabase } from "@/integrations/supabase/client";

export default function PDV() {
  // Obter o usuário atual e ID do restaurante
  const { user } = useCurrentUser();
  const restaurantId = user?.restaurant_id || "";
  const [restaurantName, setRestaurantName] = useState("Pubfy");
  
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

  return (
    <DashboardLayout title="PDV - Ponto de Venda">
      <PDVTabs 
        visualizacaoAtiva={visualizacaoAtiva}
        onChangeVisualizacao={setVisualizacaoAtiva}
        tipoPedido={tipoPedido}
        onChangeTipoPedido={trocarTipoPedido}
        showPedidoTabs={visualizacaoAtiva === "novo"}
      />

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
      ) : (
        <HistoricoPedidos 
          pedidosHistorico={pedidosHistorico}
          alterarStatusPedido={handleAlterarStatusPedido}
          onAtualizar={carregarHistoricoPedidos}
          restaurantName={restaurantName}
        />
      )}

      {/* Modal para adicionar observação ao produto */}
      <ObservacaoModal 
        produtoSelecionado={produtoSelecionado}
        observacaoAtual={observacaoAtual}
        setObservacaoAtual={setObservacaoAtual}
        confirmarAdicao={confirmarAdicao}
        cancelarAdicao={cancelarAdicao}
      />
    </DashboardLayout>
  );
}
