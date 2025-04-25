
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Eye, CheckCircle, Clock, Package, XCircle } from "lucide-react";
import { useState } from "react";

// Tipo para status do pedido
type StatusPedido = "pendente" | "concluido" | "cancelado" | "preparo";

// Tipo para pedidos
interface Pedido {
  id: number;
  mesa: number;
  cliente: string | null;
  valorTotal: number;
  data: Date;
  status: StatusPedido;
  itens: {
    nome: string;
    quantidade: number;
    precoUnitario: number;
  }[];
}

const Pedidos = () => {
  // Dados de exemplo para pedidos
  const [pedidos, setPedidos] = useState<Pedido[]>([
    {
      id: 10001,
      mesa: 1,
      cliente: null,
      valorTotal: 45.80,
      data: new Date(2023, 3, 25, 19, 30),
      status: "pendente",
      itens: [
        { nome: "X-Tudo", quantidade: 1, precoUnitario: 24.90 },
        { nome: "Batata Frita", quantidade: 1, precoUnitario: 12.90 },
        { nome: "Refrigerante Lata", quantidade: 2, precoUnitario: 4.00 }
      ]
    },
    {
      id: 10002,
      mesa: 3,
      cliente: "João Silva",
      valorTotal: 63.70,
      data: new Date(2023, 3, 25, 19, 45),
      status: "preparo",
      itens: [
        { nome: "X-Salada", quantidade: 2, precoUnitario: 21.90 },
        { nome: "Anéis de Cebola", quantidade: 1, precoUnitario: 15.90 },
        { nome: "Água Mineral", quantidade: 1, precoUnitario: 3.50 }
      ]
    },
    {
      id: 10003,
      mesa: 5,
      cliente: "Maria Oliveira",
      valorTotal: 36.80,
      data: new Date(2023, 3, 25, 18, 15),
      status: "concluido",
      itens: [
        { nome: "X-Burger", quantidade: 1, precoUnitario: 18.90 },
        { nome: "X-Burger", quantidade: 1, precoUnitario: 18.90 }
      ]
    },
    {
      id: 10004,
      mesa: 2,
      cliente: null,
      valorTotal: 37.50,
      data: new Date(2023, 3, 25, 17, 30),
      status: "cancelado",
      itens: [
        { nome: "X-Burger", quantidade: 1, precoUnitario: 18.90 },
        { nome: "Batata Frita", quantidade: 1, precoUnitario: 12.90 },
        { nome: "Refrigerante Lata", quantidade: 1, precoUnitario: 5.00 }
      ]
    }
  ]);
  
  const [pedidoDetalhes, setPedidoDetalhes] = useState<Pedido | null>(null);
  
  // Função para alterar status do pedido
  const alterarStatusPedido = (id: number, novoStatus: StatusPedido) => {
    setPedidos(pedidos.map(pedido => 
      pedido.id === id ? { ...pedido, status: novoStatus } : pedido
    ));
    
    if (pedidoDetalhes && pedidoDetalhes.id === id) {
      setPedidoDetalhes({...pedidoDetalhes, status: novoStatus});
    }
  };
  
  // Função para obter a cor do badge de status
  const getStatusColor = (status: StatusPedido) => {
    switch (status) {
      case "pendente": return "bg-orange/10 text-orange hover:bg-orange/20";
      case "preparo": return "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20";
      case "concluido": return "bg-green/10 text-green hover:bg-green/20";
      case "cancelado": return "bg-red-500/10 text-red-500 hover:bg-red-500/20";
    }
  };
  
  // Função para obter o ícone do status
  const getStatusIcon = (status: StatusPedido) => {
    switch (status) {
      case "pendente": return <Clock className="h-4 w-4 mr-1" />;
      case "preparo": return <Package className="h-4 w-4 mr-1" />;
      case "concluido": return <CheckCircle className="h-4 w-4 mr-1" />;
      case "cancelado": return <XCircle className="h-4 w-4 mr-1" />;
    }
  };

  return (
    <DashboardLayout title="Pedidos">
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Pedidos</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Mesa</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pedidos.map((pedido) => (
                <TableRow key={pedido.id}>
                  <TableCell className="font-medium">{pedido.id}</TableCell>
                  <TableCell>Mesa {pedido.mesa}</TableCell>
                  <TableCell>{pedido.cliente || "Cliente local"}</TableCell>
                  <TableCell>{pedido.data.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</TableCell>
                  <TableCell>R$ {pedido.valorTotal.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`flex items-center w-fit ${getStatusColor(pedido.status)}`}>
                      {getStatusIcon(pedido.status)}
                      <span className="capitalize">
                        {pedido.status === "preparo" ? "Em preparo" : pedido.status}
                      </span>
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setPedidoDetalhes(pedido)}
                        >
                          <Eye className="h-4 w-4 mr-1" /> Ver
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Detalhes do Pedido #{pedidoDetalhes?.id}</DialogTitle>
                          <DialogDescription>
                            Mesa {pedidoDetalhes?.mesa} • {pedidoDetalhes?.data.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                          </DialogDescription>
                        </DialogHeader>
                        
                        {pedidoDetalhes && (
                          <div className="py-4">
                            <div className="mb-4">
                              <Badge variant="outline" className={`flex items-center w-fit ${getStatusColor(pedidoDetalhes.status)}`}>
                                {getStatusIcon(pedidoDetalhes.status)}
                                <span className="capitalize">
                                  {pedidoDetalhes.status === "preparo" ? "Em preparo" : pedidoDetalhes.status}
                                </span>
                              </Badge>
                            </div>
                            
                            <div className="space-y-4">
                              <div>
                                <h4 className="text-sm font-medium">Cliente</h4>
                                <p className="text-sm text-gray-500">{pedidoDetalhes.cliente || "Cliente local"}</p>
                              </div>
                              
                              <div>
                                <h4 className="text-sm font-medium mb-2">Itens do Pedido</h4>
                                <div className="border rounded-md divide-y">
                                  {pedidoDetalhes.itens.map((item, index) => (
                                    <div key={index} className="flex justify-between py-2 px-3">
                                      <div className="flex-1">
                                        <span className="font-medium">{item.quantidade}x</span> {item.nome}
                                      </div>
                                      <div className="text-right">
                                        R$ {(item.precoUnitario * item.quantidade).toFixed(2)}
                                      </div>
                                    </div>
                                  ))}
                                  <div className="flex justify-between py-2 px-3 font-bold">
                                    <div>Total</div>
                                    <div>R$ {pedidoDetalhes.valorTotal.toFixed(2)}</div>
                                  </div>
                                </div>
                              </div>
                              
                              {pedidoDetalhes.status !== "concluido" && pedidoDetalhes.status !== "cancelado" && (
                                <div>
                                  <h4 className="text-sm font-medium mb-2">Atualizar status</h4>
                                  <div className="flex gap-2">
                                    {pedidoDetalhes.status === "pendente" && (
                                      <Button 
                                        size="sm" 
                                        variant="outline"
                                        className="border-blue-500 text-blue-500 hover:bg-blue-500/10"
                                        onClick={() => alterarStatusPedido(pedidoDetalhes.id, "preparo")}
                                      >
                                        <Package className="h-4 w-4 mr-1" /> Em preparo
                                      </Button>
                                    )}
                                    {pedidoDetalhes.status === "preparo" && (
                                      <Button 
                                        size="sm" 
                                        variant="outline"
                                        className="border-green text-green hover:bg-green/10"
                                        onClick={() => alterarStatusPedido(pedidoDetalhes.id, "concluido")}
                                      >
                                        <CheckCircle className="h-4 w-4 mr-1" /> Concluído
                                      </Button>
                                    )}
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      className="border-red-500 text-red-500 hover:bg-red-500/10"
                                      onClick={() => alterarStatusPedido(pedidoDetalhes.id, "cancelado")}
                                    >
                                      <XCircle className="h-4 w-4 mr-1" /> Cancelar
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        <DialogFooter>
                          <Button type="button" variant="outline" onClick={() => setPedidoDetalhes(null)}>
                            Fechar
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default Pedidos;
