
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Eye, CheckCircle, Clock, Package, XCircle, RefreshCw } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { IfoodOrdersList } from "@/components/ifood/IfoodOrdersList";
import { IfoodOrderBadge } from "@/components/ifood/IfoodOrderBadge";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { listarPedidos, alterarStatusPedido } from "@/features/pdv/services/pedidoService";
import { Pedido } from "@/features/pdv/types";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

const Pedidos = () => {
  const { user } = useCurrentUser();
  const restaurantId = user?.restaurant_id || "";
  
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [pedidoDetalhes, setPedidoDetalhes] = useState<Pedido | null>(null);
  const [carregando, setCarregando] = useState(false);
  
  // ✅ Ref para evitar múltiplas subscrições
  const subscriptionRef = useRef<any>(null);
  
  // Função para carregar pedidos do banco de dados
  const carregarPedidos = async () => {
    if (!restaurantId) return;
    
    setCarregando(true);
    try {
      const result = await listarPedidos(restaurantId);
      if (result.success) {
        setPedidos(result.pedidos || []);
      } else {
        toast.error("Erro ao carregar pedidos");
      }
    } catch (error) {
      console.error("Erro ao carregar pedidos:", error);
      toast.error("Ocorreu um erro ao carregar os pedidos");
    } finally {
      setCarregando(false);
    }
  };
  
  // ✅ Configurar real-time subscriptions
  useEffect(() => {
    if (!restaurantId) return;
    
    // Carregar pedidos iniciais
    carregarPedidos();
    
    // Configurar subscription para mudanças em tempo real
    const setupRealtimeSubscription = () => {
      // Limpar subscrição anterior se existir
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
      
      const channel = supabase
        .channel('orders-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders',
            filter: `restaurant_id=eq.${restaurantId}`
          },
          (payload) => {
            console.log('Order changed:', payload);
            
            if (payload.eventType === 'INSERT') {
              // ✅ Novo pedido - buscar com detalhes completos
              const novoPedido = payload.new as Pedido;
              
              // Buscar itens do pedido
              supabase
                .from('order_items')
                .select(`
                  *,
                  product:products (
                    id,
                    name,
                    price,
                    image_url
                  )
                `)
                .eq('order_id', String(novoPedido.id))
                .then(({ data: items }) => {
                  if (items) {
                    const pedidoCompleto = {
                      ...novoPedido,
                      itensPedido: items.map((item: any) => ({
                        id: item.id,
                        quantidade: item.quantity,
                        produto: {
                          id: item.product.id,
                          name: item.product.name,
                          price: item.product.price,
                          image_url: item.product.image_url
                        },
                        observacao: item.observations
                      }))
                    };
                    
                    setPedidos(prev => [pedidoCompleto, ...prev]);
                    
                    // ✅ Notificação sonora e visual
                    const audio = new Audio('/notification.mp3');
                    audio.play().catch(() => {
                      console.log('Audio play blocked by browser');
                    });
                    
                    toast.success('Novo pedido recebido!', {
                      description: `Mesa: ${novoPedido.mesa || novoPedido.table_number || 'Balcão'} - Total: R$ ${novoPedido.total.toFixed(2)}`,
                      duration: 5000
                    });
                  }
                });
                
            } else if (payload.eventType === 'UPDATE') {
              // ✅ Pedido atualizado
              const pedidoAtualizado = payload.new as Pedido;
              
              setPedidos(prev =>
                prev.map(pedido =>
                  pedido.id === pedidoAtualizado.id
                    ? { ...pedido, ...pedidoAtualizado }
                    : pedido
                )
              );
              
              // Atualizar detalhes se estiver aberto
              if (pedidoDetalhes && pedidoDetalhes.id === pedidoAtualizado.id) {
                setPedidoDetalhes(prev => prev ? { ...prev, ...pedidoAtualizado } : null);
              }
              
            } else if (payload.eventType === 'DELETE') {
              // ✅ Pedido deletado
              const pedidoDeletado = payload.old as Pedido;
              
              setPedidos(prev =>
                prev.filter(pedido => pedido.id !== pedidoDeletado.id)
              );
              
              // Fechar detalhes se estava aberto
              if (pedidoDetalhes && pedidoDetalhes.id === pedidoDeletado.id) {
                setPedidoDetalhes(null);
              }
            }
          }
        )
        .subscribe((status) => {
          console.log('Subscription status:', status);
          
          if (status === 'SUBSCRIBED') {
            console.log('✅ Real-time subscription ativa para pedidos');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Erro na subscrição real-time');
            toast.error('Erro na conexão em tempo real. Recarregue a página.');
          }
        });
      
      subscriptionRef.current = channel;
    };
    
    setupRealtimeSubscription();
    
    // Cleanup
    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [restaurantId]);
  
  // ✅ Auto-refresh a cada 30 segundos (fallback)
  useEffect(() => {
    if (!restaurantId) return;
    
    const intervalId = setInterval(() => {
      carregarPedidos();
    }, 30000); // 30 segundos
    
    return () => clearInterval(intervalId);
  }, [restaurantId]);
  
  // Função para alterar status do pedido
  const handleAlterarStatus = async (
    id: number | string, 
    novoStatus: 'em-andamento' | 'finalizado' | 'pendente' | 'preparo' | 'cancelado'
  ) => {
    try {
      const result = await alterarStatusPedido(String(id), novoStatus);
      if (result.success) {
        // Atualização local já será feita pelo real-time
        // Mas mantemos para feedback imediato
        setPedidos(pedidos.map(pedido => 
          pedido.id === id ? { ...pedido, status: novoStatus } : pedido
        ));
        
        if (pedidoDetalhes && pedidoDetalhes.id === id) {
          setPedidoDetalhes({...pedidoDetalhes, status: novoStatus});
        }
        
        toast.success(`Status atualizado para ${novoStatus}`);
      }
    } catch (error) {
      console.error("Erro ao alterar status:", error);
      toast.error("Erro ao atualizar status");
    }
  };
  
  // Função para obter a cor do badge de status
  const getStatusColor = (status: string) => {
    switch (status) {
      case "pendente": return "bg-orange/10 text-orange hover:bg-orange/20";
      case "preparo": 
      case "em-andamento": return "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20";
      case "finalizado": return "bg-green/10 text-green hover:bg-green/20";
      case "cancelado": return "bg-red-500/10 text-red-500 hover:bg-red-500/20";
      default: return "bg-gray-500/10 text-gray-500 hover:bg-gray-500/20";
    }
  };
  
  // Função para obter o ícone do status
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pendente": return <Clock className="h-4 w-4 mr-1" />;
      case "preparo":
      case "em-andamento": return <Package className="h-4 w-4 mr-1" />;
      case "finalizado": return <CheckCircle className="h-4 w-4 mr-1" />;
      case "cancelado": return <XCircle className="h-4 w-4 mr-1" />;
      default: return <Clock className="h-4 w-4 mr-1" />;
    }
  };
  
  // Função para renderizar badge da fonte do pedido
  const renderSourceBadge = (source?: string) => {
    switch (source) {
      case 'ifood':
        return <IfoodOrderBadge className="ml-2" />;
      case 'whatsapp':
        return <Badge className="bg-green-500 text-white ml-2">WhatsApp</Badge>;
      case 'app':
        return <Badge className="bg-blue-500 text-white ml-2">App</Badge>;
      default:
        return null;
    }
  };

  return (
    <DashboardLayout title="Pedidos">
      {/* Lista de pedidos do iFood */}
      <IfoodOrdersList />
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Histórico de Pedidos</CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={carregarPedidos}
            disabled={carregando}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${carregando ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Mesa/Balcão</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pedidos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    {carregando ? "Carregando pedidos..." : "Nenhum pedido encontrado"}
                  </TableCell>
                </TableRow>
              ) : (
                pedidos.map((pedido) => (
                  <TableRow key={pedido.id}>
                    <TableCell className="font-medium">
                      {typeof pedido.id === 'string' ? pedido.id.substring(0, 8) : pedido.id}
                      {renderSourceBadge(pedido.source)}
                    </TableCell>
                    <TableCell>{pedido.mesa}</TableCell>
                    <TableCell>{pedido.cliente || pedido.clientName || "Cliente local"}</TableCell>
                    <TableCell>{new Date(pedido.timestamp).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</TableCell>
                    <TableCell>R$ {pedido.total.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`flex items-center w-fit ${getStatusColor(pedido.status)}`}>
                        {getStatusIcon(pedido.status)}
                        <span className="capitalize">
                          {pedido.status === "preparo" || pedido.status === "em-andamento" ? "Em preparo" : pedido.status}
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
                            <DialogTitle className="flex items-center">
                              Detalhes do Pedido #{typeof pedidoDetalhes?.id === 'string' ? pedidoDetalhes?.id.substring(0, 8) : pedidoDetalhes?.id}
                              {pedidoDetalhes?.source && renderSourceBadge(pedidoDetalhes.source)}
                            </DialogTitle>
                            <DialogDescription>
                              {pedidoDetalhes?.mesa} • {pedidoDetalhes && new Date(pedidoDetalhes.timestamp).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                            </DialogDescription>
                          </DialogHeader>
                          
                          {pedidoDetalhes && (
                            <div className="py-4">
                              <div className="mb-4">
                                <Badge variant="outline" className={`flex items-center w-fit ${getStatusColor(pedidoDetalhes.status)}`}>
                                  {getStatusIcon(pedidoDetalhes.status)}
                                  <span className="capitalize">
                                    {pedidoDetalhes.status === "preparo" || pedidoDetalhes.status === "em-andamento" ? "Em preparo" : pedidoDetalhes.status}
                                  </span>
                                </Badge>
                              </div>
                              
                              <div className="space-y-4">
                                <div>
                                  <h4 className="text-sm font-medium">Cliente</h4>
                                  <p className="text-sm text-gray-500">{pedidoDetalhes.cliente || pedidoDetalhes.clientName || "Cliente local"}</p>
                                </div>
                                
                                <div>
                                  <h4 className="text-sm font-medium mb-2">Itens do Pedido</h4>
                                  <div className="border rounded-md divide-y">
                                    {pedidoDetalhes.itensPedido.map((item, index) => (
                                      <div key={index} className="flex justify-between py-2 px-3">
                                        <div className="flex-1">
                                          <span className="font-medium">{item.quantidade}x</span> {item.produto.name}
                                          {item.observacao && (
                                            <p className="text-xs text-muted-foreground">Obs: {item.observacao}</p>
                                          )}
                                        </div>
                                        <div className="text-right">
                                          R$ {(item.produto.price * item.quantidade).toFixed(2)}
                                        </div>
                                      </div>
                                    ))}
                                    <div className="flex justify-between py-2 px-3 font-bold">
                                      <div>Total</div>
                                      <div>R$ {pedidoDetalhes.total.toFixed(2)}</div>
                                    </div>
                                  </div>
                                </div>
                                
                                {pedidoDetalhes.status !== "finalizado" && pedidoDetalhes.status !== "cancelado" && (
                                  <div>
                                    <h4 className="text-sm font-medium mb-2">Atualizar status</h4>
                                    <div className="flex gap-2">
                                      {(pedidoDetalhes.status === "pendente") && (
                                        <Button 
                                          size="sm" 
                                          variant="outline"
                                          className="border-blue-500 text-blue-500 hover:bg-blue-500/10"
                                          onClick={() => handleAlterarStatus(pedidoDetalhes.id, "preparo")}
                                        >
                                          <Package className="h-4 w-4 mr-1" /> Em preparo
                                        </Button>
                                      )}
                                      {(pedidoDetalhes.status === "preparo" || pedidoDetalhes.status === "em-andamento") && (
                                        <Button 
                                          size="sm" 
                                          variant="outline"
                                          className="border-green text-green hover:bg-green/10"
                                          onClick={() => handleAlterarStatus(pedidoDetalhes.id, "finalizado")}
                                        >
                                          <CheckCircle className="h-4 w-4 mr-1" /> Concluído
                                        </Button>
                                      )}
                                      <Button 
                                        size="sm" 
                                        variant="outline"
                                        className="border-red-500 text-red-500 hover:bg-red-500/10"
                                        onClick={() => handleAlterarStatus(pedidoDetalhes.id, "cancelado")}
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
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default Pedidos;
