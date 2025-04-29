
import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Minus, Trash2, CreditCard, QrCode, Clock, CheckCircle } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { Textarea } from "@/components/ui/textarea";

// Tipos para os produtos e pedidos
interface Produto {
  id: number;
  nome: string;
  preco: number;
  categoria: string;
}

interface ItemPedido {
  produto: Produto;
  quantidade: number;
  observacao: string;
}

interface Pedido {
  id: number;
  mesa: string;
  itensPedido: ItemPedido[];
  status: 'em-andamento' | 'finalizado';
  timestamp: Date;
  total: number;
}

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

const PDV = () => {
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
            <div className="flex justify-between items-center">
              {tipoPedido === "mesa" && (
                <div className="flex items-center gap-2">
                  <label htmlFor="mesa" className="text-sm font-medium">Mesa:</label>
                  <Input 
                    id="mesa" 
                    type="number" 
                    value={mesaSelecionada} 
                    onChange={(e) => setMesaSelecionada(e.target.value)} 
                    className="w-16"
                  />
                </div>
              )}
              <Input 
                placeholder="Buscar produto..." 
                className="max-w-xs"
                value={busca}
                onChange={(e) => setBusca(e.target.value)} 
              />
            </div>

            <Tabs defaultValue="lanches" value={categoriaAtiva} onValueChange={setCategoriaAtiva}>
              <TabsList className="grid grid-cols-5">
                <TabsTrigger value="lanches">Lanches</TabsTrigger>
                <TabsTrigger value="porcoes">Porções</TabsTrigger>
                <TabsTrigger value="bebidas">Bebidas</TabsTrigger>
                <TabsTrigger value="sobremesas">Sobremesas</TabsTrigger>
                <TabsTrigger value="outros">Outros</TabsTrigger>
              </TabsList>
              
              <TabsContent value={categoriaAtiva} className="mt-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {produtosFiltrados.map((produto) => (
                    <Card key={produto.id} className="cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => adicionarProduto(produto)}>
                      <CardContent className="p-4">
                        <div className="font-medium">{produto.nome}</div>
                        <div className="text-green font-bold">R$ {produto.preco.toFixed(2)}</div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Coluna da direita - Comanda atual */}
          <div className="bg-white rounded-lg shadow-md p-4 border">
            <h3 className="font-bold text-lg mb-4">
              {tipoPedido === "mesa" ? `Comanda Mesa ${mesaSelecionada}` : "Comanda Balcão"}
            </h3>
            
            <div className="max-h-[400px] overflow-y-auto mb-4">
              {itensPedido.length === 0 ? (
                <div className="text-center text-gray-500 py-6">
                  Adicione itens ao pedido
                </div>
              ) : (
                <div className="space-y-2">
                  {itensPedido.map((item, index) => (
                    <div key={index} className="flex justify-between items-start border-b pb-2">
                      <div className="flex-1">
                        <p className="font-medium">{item.produto.nome}</p>
                        <p className="text-sm text-muted-foreground">R$ {item.produto.preco.toFixed(2)} x {item.quantidade}</p>
                        {item.observacao && (
                          <p className="text-xs text-gray-500 italic mt-1">Obs: {item.observacao}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          size="icon" 
                          variant="outline" 
                          className="h-7 w-7" 
                          onClick={() => alterarQuantidade(index, -1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-5 text-center">{item.quantidade}</span>
                        <Button 
                          size="icon" 
                          variant="outline" 
                          className="h-7 w-7" 
                          onClick={() => alterarQuantidade(index, 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-7 w-7 text-red-500" 
                          onClick={() => removerItem(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between text-lg font-bold mb-4">
                <span>Total</span>
                <span className="text-green">R$ {totalPedido.toFixed(2)}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  className="bg-green hover:bg-green-dark text-white w-full"
                  onClick={finalizarPedido}
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  Finalizar Pedido
                </Button>
                <Button variant="outline" className="w-full">
                  <QrCode className="mr-2 h-4 w-4" />
                  QR Code
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-6 border">
          <h3 className="font-bold text-lg mb-4">Histórico de Pedidos</h3>
          
          {pedidosHistorico.length === 0 ? (
            <div className="text-center text-gray-500 py-12">
              Não há pedidos registrados
            </div>
          ) : (
            <div className="space-y-6">
              {pedidosHistorico.map((pedido) => (
                <div key={pedido.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <h4 className="font-bold">Pedido #{pedido.id} - {pedido.mesa}</h4>
                      <p className="text-sm text-gray-500">
                        {pedido.timestamp.toLocaleTimeString()} - {pedido.timestamp.toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        pedido.status === 'em-andamento' ? 'bg-orange/10 text-orange' : 'bg-green/10 text-green'
                      }`}>
                        {pedido.status === 'em-andamento' ? 'Em andamento' : 'Finalizado'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    {pedido.itensPedido.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span>
                          {item.quantidade}x {item.produto.nome}
                          {item.observacao && <span className="text-xs text-gray-500 ml-2 italic">({item.observacao})</span>}
                        </span>
                        <span>R$ {(item.produto.preco * item.quantidade).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex justify-between items-center pt-3 border-t">
                    <div className="font-bold">
                      Total: R$ {pedido.total.toFixed(2)}
                    </div>
                    <div className="flex gap-2">
                      {pedido.status === 'em-andamento' ? (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => alterarStatusPedido(pedido.id, 'finalizado')}
                          className="bg-green hover:bg-green-dark"
                        >
                          <CheckCircle className="mr-1 h-4 w-4" />
                          Finalizar
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => alterarStatusPedido(pedido.id, 'em-andamento')}
                        >
                          <Clock className="mr-1 h-4 w-4" />
                          Em andamento
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal para adicionar observação ao produto */}
      {produtoSelecionado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h3 className="text-lg font-bold mb-2">{produtoSelecionado.nome}</h3>
            <p className="text-green font-medium mb-4">R$ {produtoSelecionado.preco.toFixed(2)}</p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Observações:</label>
              <Textarea
                placeholder="Ex: sem cebola, bem passado, etc."
                value={observacaoAtual}
                onChange={(e) => setObservacaoAtual(e.target.value)}
                className="resize-none"
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={cancelarAdicao}>
                Cancelar
              </Button>
              <Button onClick={confirmarAdicao}>
                Adicionar ao Pedido
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default PDV;
