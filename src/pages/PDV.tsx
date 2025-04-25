
import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Minus, Trash2, CreditCard, QrCode } from "lucide-react";
import { toast } from "@/components/ui/sonner";

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
];

const PDV = () => {
  const [itensPedido, setItensPedido] = useState<ItemPedido[]>([]);
  const [mesaSelecionada, setMesaSelecionada] = useState("1");
  const [categoriaAtiva, setCategoriaAtiva] = useState("lanches");

  // Função para adicionar produto ao pedido
  const adicionarProduto = (produto: Produto) => {
    setItensPedido(itensAtuais => {
      const itemExistente = itensAtuais.find(item => item.produto.id === produto.id);
      
      if (itemExistente) {
        return itensAtuais.map(item => 
          item.produto.id === produto.id 
            ? { ...item, quantidade: item.quantidade + 1 } 
            : item
        );
      } else {
        return [...itensAtuais, { produto, quantidade: 1 }];
      }
    });
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
    
    toast.success("Pedido finalizado com sucesso!", {
      description: `Mesa ${mesaSelecionada} - Total: R$ ${totalPedido.toFixed(2)}`
    });
    setItensPedido([]);
  };

  // Filtrar produtos por categoria
  const produtosFiltrados = produtosExemplo.filter(
    produto => produto.categoria === categoriaAtiva
  );

  return (
    <DashboardLayout title="PDV - Ponto de Venda">
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Coluna da esquerda - Seleção de produtos */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
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
            <Input placeholder="Buscar produto..." className="max-w-xs" />
          </div>

          <Tabs defaultValue="lanches" value={categoriaAtiva} onValueChange={setCategoriaAtiva}>
            <TabsList className="grid grid-cols-4">
              <TabsTrigger value="lanches">Lanches</TabsTrigger>
              <TabsTrigger value="porcoes">Porções</TabsTrigger>
              <TabsTrigger value="bebidas">Bebidas</TabsTrigger>
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
          <h3 className="font-bold text-lg mb-4">Comanda Atual - Mesa {mesaSelecionada}</h3>
          
          <div className="max-h-[400px] overflow-y-auto mb-4">
            {itensPedido.length === 0 ? (
              <div className="text-center text-gray-500 py-6">
                Adicione itens ao pedido
              </div>
            ) : (
              <div className="space-y-2">
                {itensPedido.map((item, index) => (
                  <div key={index} className="flex justify-between items-center border-b pb-2">
                    <div className="flex-1">
                      <p className="font-medium">{item.produto.nome}</p>
                      <p className="text-sm text-muted-foreground">R$ {item.produto.preco.toFixed(2)} x {item.quantidade}</p>
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
                Pagamento
              </Button>
              <Button variant="outline" className="w-full">
                <QrCode className="mr-2 h-4 w-4" />
                QR Code
              </Button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PDV;
