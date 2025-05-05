
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useState } from "react";
import { ObservacaoModal } from "@/features/pdv/components/ObservacaoModal";
import { HistoricoPedidos } from "@/features/pdv/components/HistoricoPedidos";
import { NovoPedido } from "@/features/pdv/components/NovoPedido";
import { PDVTabs } from "@/features/pdv/components/PDVTabs";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { usePDVHook } from "@/features/pdv/hooks/usePDVHook";

const PDV = () => {
  // Obter o usuário atual e ID do restaurante
  const { user } = useCurrentUser();
  const restaurantId = user?.restaurant_id || "";
  
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
  } = usePDVHook(restaurantId);

  return (
    <DashboardLayout title="PDV - Ponto de Venda">
      <PDVTabs 
        visualizacaoAtiva={visualizacaoAtiva}
        onChangeVisualizacao={setVisualizacaoAtiva}
        tipoPedido={tipoPedido}
        onChangeTipoPedido={setTipoPedido}
        showPedidoTabs={visualizacaoAtiva === "novo"}
      />

      {visualizacaoAtiva === "novo" ? (
        <NovoPedido 
          restaurantId={restaurantId}
          tipoPedido={tipoPedido}
          mesaSelecionada={mesaSelecionada}
          setMesaSelecionada={setMesaSelecionada}
          categoriaAtiva={categoriaAtiva}
          setCategoriaAtiva={setCategoriaAtiva}
          busca={busca}
          setBusca={setBusca}
          itensPedido={itensPedido}
          totalPedido={totalPedido}
          alterarQuantidade={alterarQuantidade}
          removerItem={removerItem}
          finalizarPedido={finalizarPedido}
          salvandoPedido={salvandoPedido}
          onSelecionarProduto={adicionarProduto}
          nomeCliente={nomeCliente}
          setNomeCliente={setNomeCliente}
        />
      ) : (
        <HistoricoPedidos 
          pedidosHistorico={pedidosHistorico}
          alterarStatusPedido={handleAlterarStatusPedido}
          onAtualizar={carregarHistoricoPedidos}
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
};

export default PDV;
