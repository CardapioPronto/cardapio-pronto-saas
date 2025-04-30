
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { usePDV } from "@/features/pdv/hooks/usePDV";
import { FiltroProdutos } from "@/features/pdv/components/FiltroProdutos";
import { ListaProdutos } from "@/features/pdv/components/ListaProdutos";
import { ComandaPedido } from "@/features/pdv/components/ComandaPedido";
import { HistoricoPedidos } from "@/features/pdv/components/HistoricoPedidos";
import { ObservacaoModal } from "@/features/pdv/components/ObservacaoModal";

const PDV = () => {
  const {
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
  } = usePDV();

  return (
    <DashboardLayout title="PDV - Ponto de Venda">
      <div className="mb-4 flex justify-between items-center">
        <div>
          <Tabs value={visualizacaoAtiva} onValueChange={(v) => setVisualizacaoAtiva(v as "novo" | "historico")}>
            <TabsList>
              <TabsTrigger value="novo">Novo Pedido</TabsTrigger>
              <TabsTrigger value="historico">Histórico</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        {visualizacaoAtiva === "novo" && (
          <Tabs value={tipoPedido} onValueChange={(v) => setTipoPedido(v as "mesa" | "balcao")}>
            <TabsList>
              <TabsTrigger value="mesa">Mesa</TabsTrigger>
              <TabsTrigger value="balcao">Balcão</TabsTrigger>
            </TabsList>
          </Tabs>
        )}
      </div>

      {visualizacaoAtiva === "novo" ? (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Coluna da esquerda - Seleção de produtos */}
          <div className="lg:col-span-2 space-y-4">
            <FiltroProdutos 
              categoriaAtiva={categoriaAtiva}
              setCategoriaAtiva={setCategoriaAtiva}
              busca={busca}
              setBusca={setBusca}
              tipoPedido={tipoPedido}
              mesaSelecionada={mesaSelecionada}
              setMesaSelecionada={setMesaSelecionada}
            />
            
            <ListaProdutos 
              categoriaAtiva={categoriaAtiva}
              produtosFiltrados={produtosFiltrados}
              onSelecionarProduto={adicionarProduto}
            />
          </div>

          {/* Coluna da direita - Comanda atual */}
          <ComandaPedido
            tipoPedido={tipoPedido}
            mesaSelecionada={mesaSelecionada}
            itensPedido={itensPedido}
            totalPedido={totalPedido}
            alterarQuantidade={alterarQuantidade}
            removerItem={removerItem}
            finalizarPedido={finalizarPedido}
          />
        </div>
      ) : (
        <HistoricoPedidos 
          pedidosHistorico={pedidosHistorico}
          alterarStatusPedido={alterarStatusPedido}
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
