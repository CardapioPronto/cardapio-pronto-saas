
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, CheckCircle, Clock, Package, XCircle, RefreshCw, CalendarDays, ChevronLeft, ChevronRight, Receipt } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { RealtimeChannel } from "@supabase/supabase-js";
import { IfoodOrderBadge } from "@/components/ifood/IfoodOrderBadge";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { usePermissionsV2 } from "@/hooks/usePermissionsV2";
import { listarPedidos, alterarStatusPedido } from "@/features/pdv/services/pedidoService";
import {
  HistoricoPedidosFiltros,
  HistoricoPedidosResumo,
  HistoricoPeriodoFiltro,
  HistoricoStatusFiltro,
  Pedido,
  PedidoStatus,
} from "@/features/pdv/types";
import {
  getDateRangeByPeriod,
  getInitialHistoricoFiltros,
  toEndOfDayIso,
  toStartOfDayIso,
} from "@/features/pdv/utils/historicoPedidos";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

const Pedidos = () => {
  const { user } = useCurrentUser();
  const { hasPermission } = usePermissionsV2();
  const restaurantId = user?.restaurant_id || "";
  const canViewFinancials = hasPermission("orders_metrics_view");
  const canManageOrders = hasPermission("orders_manage");
  
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [pedidoDetalhes, setPedidoDetalhes] = useState<Pedido | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [filtros, setFiltros] = useState<HistoricoPedidosFiltros>(getInitialHistoricoFiltros);
  const [totalPedidos, setTotalPedidos] = useState(0);
  const [resumo, setResumo] = useState<HistoricoPedidosResumo>({
    totalPedidos: 0,
    totalVendido: 0,
    pedidosAbertos: 0,
    cancelados: 0,
  });
  
  // ✅ Ref para evitar múltiplas subscrições
  const subscriptionRef = useRef<RealtimeChannel | null>(null);
  const pedidoDetalhesRef = useRef<Pedido | null>(null);
  const recarregarRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    pedidoDetalhesRef.current = pedidoDetalhes;
  }, [pedidoDetalhes]);
  
  // Função para carregar pedidos do banco de dados
  const carregarPedidos = useCallback(async () => {
    if (!restaurantId) return;
    
    setCarregando(true);
    try {
      const result = await listarPedidos(restaurantId, {
        dataInicio: toStartOfDayIso(filtros.dataInicio),
        dataFim: toEndOfDayIso(filtros.dataFim),
        status: filtros.status,
        pagina: filtros.pagina,
        itensPorPagina: filtros.itensPorPagina,
      });
      if (result.success) {
        setPedidos(result.pedidos || []);
        setTotalPedidos(result.total);
        setResumo(result.resumo);
      } else {
        toast.error("Erro ao carregar pedidos");
      }
    } catch (error) {
      console.error("Erro ao carregar pedidos:", error);
      toast.error("Ocorreu um erro ao carregar os pedidos");
    } finally {
      setCarregando(false);
    }
  }, [restaurantId, filtros]);

  useEffect(() => {
    recarregarRef.current = () => {
      void carregarPedidos();
    };
  }, [carregarPedidos]);

  const setPeriodo = useCallback((periodo: HistoricoPeriodoFiltro) => {
    const range = periodo === "personalizado" ? {} : getDateRangeByPeriod(periodo);
    setFiltros((filtrosAtuais) => ({
      ...filtrosAtuais,
      periodo,
      ...range,
      pagina: 1,
    }));
  }, []);

  const setStatus = useCallback((status: HistoricoStatusFiltro) => {
    setFiltros((filtrosAtuais) => ({
      ...filtrosAtuais,
      status,
      pagina: 1,
    }));
  }, []);

  const setDataInicio = useCallback((dataInicio: string) => {
    setFiltros((filtrosAtuais) => ({
      ...filtrosAtuais,
      periodo: "personalizado",
      dataInicio,
      pagina: 1,
    }));
  }, []);

  const setDataFim = useCallback((dataFim: string) => {
    setFiltros((filtrosAtuais) => ({
      ...filtrosAtuais,
      periodo: "personalizado",
      dataFim,
      pagina: 1,
    }));
  }, []);

  const setPagina = useCallback((pagina: number) => {
    setFiltros((filtrosAtuais) => ({
      ...filtrosAtuais,
      pagina,
    }));
  }, []);

  const setItensPorPagina = useCallback((itensPorPagina: number) => {
    setFiltros((filtrosAtuais) => ({
      ...filtrosAtuais,
      itensPorPagina,
      pagina: 1,
    }));
  }, []);
  
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
            if (payload.eventType === 'INSERT') {
              const novoPedido = payload.new as Pedido;

              recarregarRef.current();

              // ✅ Notificação sonora e visual
              const audio = new Audio('/notification.mp3');
              audio.play().catch(() => undefined);

              toast.success('Novo pedido recebido!', {
                description: canViewFinancials ? `Total: R$ ${Number(novoPedido.total || 0).toFixed(2)}` : undefined,
                duration: 5000
              });
            } else if (payload.eventType === 'UPDATE') {
              // ✅ Pedido atualizado
              const pedidoAtualizado = payload.new as Pedido;
              
              recarregarRef.current();
              
              // Atualizar detalhes se estiver aberto
              if (pedidoDetalhesRef.current && pedidoDetalhesRef.current.id === pedidoAtualizado.id) {
                setPedidoDetalhes(prev => prev ? { ...prev, ...pedidoAtualizado } : null);
              }
              
            } else if (payload.eventType === 'DELETE') {
              // ✅ Pedido deletado
              const pedidoDeletado = payload.old as Pedido;
              
              recarregarRef.current();
              
              // Fechar detalhes se estava aberto
              if (pedidoDetalhesRef.current && pedidoDetalhesRef.current.id === pedidoDeletado.id) {
                setPedidoDetalhes(null);
              }
            }
          }
        )
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR') {
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
  }, [restaurantId, carregarPedidos, canViewFinancials]);
  
  // ✅ Auto-refresh a cada 30 segundos (fallback)
  useEffect(() => {
    if (!restaurantId) return;
    
    const intervalId = setInterval(() => {
      carregarPedidos();
    }, 30000); // 30 segundos
    
    return () => clearInterval(intervalId);
  }, [restaurantId, carregarPedidos]);
  
  // Função para alterar status do pedido
  const handleAlterarStatus = async (
    id: number | string, 
    novoStatus: PedidoStatus
  ) => {
    if (!canManageOrders) {
      toast.error("Você não tem permissão para gerenciar pedidos");
      return;
    }

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
      case "aguardando_pagamento": return "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20";
      case "pagamento_falhou": return "bg-red-500/10 text-red-500 hover:bg-red-500/20";
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
      case "aguardando_pagamento": return <Clock className="h-4 w-4 mr-1" />;
      case "pagamento_falhou": return <XCircle className="h-4 w-4 mr-1" />;
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
      case 'cardapio':
        return <Badge className="bg-purple-500 text-white ml-2">Cardápio</Badge>;
      default:
        return null;
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);

  const totalPaginas = Math.max(1, Math.ceil(totalPedidos / filtros.itensPorPagina));
  const inicioPagina = totalPedidos === 0 ? 0 : (filtros.pagina - 1) * filtros.itensPorPagina + 1;
  const fimPagina = Math.min(totalPedidos, filtros.pagina * filtros.itensPorPagina);

  return (
    <DashboardLayout title="Pedidos">
      {canViewFinancials && (
        <div className="mb-4 grid gap-3 md:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <Receipt className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Pedidos</p>
                <p className="text-lg font-semibold">{resumo.totalPedidos}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <CalendarDays className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Vendido</p>
                <p className="text-lg font-semibold">{formatCurrency(resumo.totalVendido)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Abertos</p>
                <p className="text-lg font-semibold">{resumo.pedidosAbertos}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <XCircle className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Cancelados</p>
                <p className="text-lg font-semibold">{resumo.cancelados}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle>Histórico de Pedidos</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={carregarPedidos}
              disabled={carregando}
              className="w-full lg:w-auto"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${carregando ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <div className="space-y-2 xl:col-span-2">
              <Label>Período</Label>
              <Select value={filtros.periodo} onValueChange={(value) => setPeriodo(value as HistoricoPeriodoFiltro)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hoje">Hoje</SelectItem>
                  <SelectItem value="ontem">Ontem</SelectItem>
                  <SelectItem value="7dias">Últimos 7 dias</SelectItem>
                  <SelectItem value="mes">Este mês</SelectItem>
                  <SelectItem value="personalizado">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pedidos-data-inicio">Data inicial</Label>
              <Input
                id="pedidos-data-inicio"
                type="date"
                value={filtros.dataInicio}
                max={filtros.dataFim}
                onChange={(event) => setDataInicio(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pedidos-data-fim">Data final</Label>
              <Input
                id="pedidos-data-fim"
                type="date"
                value={filtros.dataFim}
                min={filtros.dataInicio}
                onChange={(event) => setDataFim(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={filtros.status} onValueChange={(value) => setStatus(value as HistoricoStatusFiltro)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="preparo">Em preparo</SelectItem>
                  <SelectItem value="finalizado">Finalizado</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Por página</Label>
              <Select value={String(filtros.itensPorPagina)} onValueChange={(value) => setItensPorPagina(Number(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 pedidos</SelectItem>
                  <SelectItem value="20">20 pedidos</SelectItem>
                  <SelectItem value="50">50 pedidos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
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
                          {pedido.status === "preparo" || pedido.status === "em-andamento"
                            ? "Em preparo"
                            : pedido.status === "aguardando_pagamento"
                              ? "Aguardando pagamento"
                              : pedido.status === "pagamento_falhou"
                                ? "Pagamento falhou"
                                : pedido.status}
                        </span>
                      </Badge>
                      {pedido.payment_status && pedido.payment_status !== "not_required" && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Pagamento: {pedido.payment_status}
                        </p>
                      )}
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
                                    {pedidoDetalhes.status === "preparo" || pedidoDetalhes.status === "em-andamento"
                                      ? "Em preparo"
                                      : pedidoDetalhes.status === "aguardando_pagamento"
                                        ? "Aguardando pagamento"
                                        : pedidoDetalhes.status === "pagamento_falhou"
                                          ? "Pagamento falhou"
                                          : pedidoDetalhes.status}
                                  </span>
                                </Badge>
                                {pedidoDetalhes.payment_method && (
                                  <p className="mt-2 text-xs text-muted-foreground">
                                    Pagamento: {pedidoDetalhes.payment_method.replace("_online", " online").replaceAll("_", " ")}
                                    {pedidoDetalhes.payment_status ? ` • ${pedidoDetalhes.payment_status}` : ""}
                                  </p>
                                )}
                              </div>
                              
                              <div className="space-y-4">
                                <div>
                                  <h4 className="text-sm font-medium">Cliente</h4>
                                  <p className="text-sm text-gray-500">{pedidoDetalhes.cliente || pedidoDetalhes.clientName || "Cliente local"}</p>
                                </div>
                                
                                <div>
                                  <h4 className="text-sm font-medium mb-2">Itens do Pedido</h4>
                                  <div className="border rounded-md divide-y">
                                    {pedidoDetalhes.itensPedido.length > 0 ? (
                                      pedidoDetalhes.itensPedido.map((item, index) => (
                                        <div key={index} className="flex justify-between gap-3 py-2 px-3">
                                          <div className="min-w-0 flex-1">
                                            <span className="font-medium">{item.quantidade}x</span> {item.produto.name}
                                            {item.observacao && (
                                              <p className="text-xs text-muted-foreground">Obs: {item.observacao}</p>
                                            )}
                                          </div>
                                          <div className="shrink-0 text-right">
                                            R$ {(item.produto.price * item.quantidade).toFixed(2)}
                                          </div>
                                        </div>
                                      ))
                                    ) : (
                                      <div className="py-2 px-3 text-sm text-muted-foreground">
                                        Nenhum item encontrado para este pedido.
                                      </div>
                                    )}
                                    <div className="flex justify-between py-2 px-3 font-bold">
                                      <div>Total</div>
                                      <div>R$ {pedidoDetalhes.total.toFixed(2)}</div>
                                    </div>
                                  </div>
                                </div>
                                
                                {canManageOrders && pedidoDetalhes.status !== "finalizado" && pedidoDetalhes.status !== "cancelado" && (
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

          <div className="mt-4 flex flex-col gap-3 rounded-md border bg-background p-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Mostrando {inicioPagina}-{fimPagina} de {totalPedidos} pedidos
            </p>
            <div className="flex items-center justify-between gap-2 sm:justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagina(Math.max(1, filtros.pagina - 1))}
                disabled={filtros.pagina <= 1 || carregando}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Anterior
              </Button>
              <span className="min-w-24 text-center text-sm text-muted-foreground">
                Página {filtros.pagina} de {totalPaginas}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagina(Math.min(totalPaginas, filtros.pagina + 1))}
                disabled={filtros.pagina >= totalPaginas || carregando}
              >
                Próxima
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default Pedidos;
