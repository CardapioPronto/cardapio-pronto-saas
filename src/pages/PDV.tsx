
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useState, useEffect } from "react";
import { FiltroProdutos } from "@/features/pdv/components/FiltroProdutos";
import { ComandaPedido } from "@/features/pdv/components/ComandaPedido";
import { HistoricoPedidos } from "@/features/pdv/components/HistoricoPedidos";
import { ObservacaoModal } from "@/features/pdv/components/ObservacaoModal";
import { Product } from "@/types";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useProdutos } from "@/hooks/useProdutos";
import { ProdutoCard } from "@/features/pdv/components/ProdutoCard";
import { toast } from "sonner";
import { salvarPedido, listarPedidos, alterarStatusPedido } from "@/features/pdv/services/pedidoService";
import { Button } from "@/components/ui/button";
import { Pedido } from "@/features/pdv/types";

const PDV = () => {
  // Obter o usuário atual e ID do restaurante
  const { user } = useCurrentUser();
  const restaurantId = user?.restaurant_id || "";
  
  // Obter produtos usando o hook existente
  const { produtos, loading } = useProdutos(restaurantId);

  // Estados do PDV
  const [itensPedido, setItensPedido] = useState<{produto: Product; quantidade: number; observacao?: string}[]>([]);
  const [mesaSelecionada, setMesaSelecionada] = useState("1");
  const [categoriaAtiva, setCategoriaAtiva] = useState("");
  const [observacaoAtual, setObservacaoAtual] = useState("");
  const [produtoSelecionado, setProdutoSelecionado] = useState<Product | null>(null);
  const [busca, setBusca] = useState("");
  const [tipoPedido, setTipoPedido] = useState<"mesa" | "balcao">("mesa");
  const [pedidosHistorico, setPedidosHistorico] = useState<Pedido[]>([]);
  const [visualizacaoAtiva, setVisualizacaoAtiva] = useState<"novo" | "historico">("novo");
  const [salvandoPedido, setSalvandoPedido] = useState(false);
  
  // Filtrar produtos por categoria e busca
  const produtosFiltrados = produtos.filter(produto => {
    const matchesBusca = busca === "" || 
                         produto.name.toLowerCase().includes(busca.toLowerCase()) ||
                         produto.description.toLowerCase().includes(busca.toLowerCase());
    const matchesCategoria = categoriaAtiva === "" || produto.category?.id === categoriaAtiva;
    
    return matchesBusca && matchesCategoria;
  });

  // Carregar histórico de pedidos
  useEffect(() => {
    if (restaurantId && visualizacaoAtiva === "historico") {
      carregarHistoricoPedidos();
    }
  }, [restaurantId, visualizacaoAtiva]);

  const carregarHistoricoPedidos = async () => {
    if (!restaurantId) return;
    
    const result = await listarPedidos(restaurantId);
    if (result.success) {
      setPedidosHistorico(result.pedidos);
    } else {
      toast.error("Erro ao carregar o histórico de pedidos");
    }
  };

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
    
    if (!restaurantId) {
      toast.error("ID do restaurante não encontrado");
      return;
    }
    
    try {
      setSalvandoPedido(true);
      const mesa = tipoPedido === "mesa" ? `Mesa ${mesaSelecionada}` : "Balcão";
      
      const result = await salvarPedido(
        restaurantId,
        mesa,
        itensPedido,
        totalPedido
      );
      
      if (result.success) {
        setItensPedido([]);
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
  const handleAlterarStatusPedido = async (pedidoId: number, novoStatus: 'em-andamento' | 'finalizado' | 'pendente' | 'preparo' | 'cancelado') => {
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
              restaurantId={restaurantId}
            />
            
            <div className="mt-4">
              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <p>Carregando produtos...</p>
                </div>
              ) : produtosFiltrados.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {produtosFiltrados.map((produto) => (
                    <ProdutoCard 
                      key={produto.id} 
                      produto={produto} 
                      onSelecionar={adicionarProduto} 
                    />
                  ))}
                </div>
              ) : (
                <div className="flex justify-center items-center h-64 text-center">
                  <div>
                    <p className="text-lg font-medium">Nenhum produto encontrado</p>
                    <p className="text-gray-500">Tente ajustar os filtros ou adicione novos produtos</p>
                  </div>
                </div>
              )}
            </div>
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
            salvandoPedido={salvandoPedido}
          />
        </div>
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
