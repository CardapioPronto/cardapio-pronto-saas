
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

import { IfoodOrder } from '@/services/ifoodService';
import { getIfoodPendingOrders, loadIfoodConfig, updateIfoodOrderStatus } from '@/services/ifoodService';
import { IfoodOrderBadge } from './IfoodOrderBadge';

export function IfoodOrdersList() {
  const [isLoading, setIsLoading] = useState(false);
  const [pendingOrders, setPendingOrders] = useState<IfoodOrder[]>([]);
  const config = loadIfoodConfig();
  
  const fetchPendingOrders = async () => {
    if (!config.isEnabled || !config.credentials) {
      return;
    }
    
    setIsLoading(true);
    try {
      const orders = await getIfoodPendingOrders();
      setPendingOrders(orders);
      
      if (orders.length > 0) {
        toast.success(`${orders.length} ${orders.length === 1 ? 'pedido' : 'pedidos'} pendente${orders.length === 1 ? '' : 's'} do iFood.`);
      }
    } catch (error) {
      console.error('Erro ao buscar pedidos pendentes do iFood:', error);
      toast.error('Erro ao buscar pedidos do iFood');
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    if (config.isEnabled) {
      fetchPendingOrders();
    }
  }, []);
  
  const acceptOrder = async (orderId: string) => {
    try {
      await updateIfoodOrderStatus(orderId, 'ACCEPTED');
      // Atualiza a lista após aceitar o pedido
      fetchPendingOrders();
    } catch (error) {
      console.error('Erro ao aceitar pedido:', error);
    }
  };
  
  const rejectOrder = async (orderId: string) => {
    try {
      await updateIfoodOrderStatus(orderId, 'CANCELLED', 'Indisponibilidade do estabelecimento');
      // Atualiza a lista após rejeitar o pedido
      fetchPendingOrders();
    } catch (error) {
      console.error('Erro ao rejeitar pedido:', error);
    }
  };
  
  // Se a integração não estiver configurada, não exibe nada
  if (!config.isEnabled || !config.credentials) {
    return null;
  }
  
  return (
    <Card className="mb-6">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center">
            <span>Pedidos iFood</span>
            <IfoodOrderBadge className="ml-2" />
          </CardTitle>
          <CardDescription>
            Pedidos recebidos através da integração com iFood
          </CardDescription>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={fetchPendingOrders}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          <span className="ml-2">Atualizar</span>
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : pendingOrders.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Horário</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">#{order.shortReference}</TableCell>
                  <TableCell>{order.customer.name}</TableCell>
                  <TableCell>
                    {new Date(order.createdAt).toLocaleTimeString('pt-BR', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </TableCell>
                  <TableCell>R$ {order.total.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className="bg-orange/10 text-orange border-orange"
                    >
                      {order.status === 'PLACED' ? 'Novo' : 'Pendente'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => acceptOrder(order.id)}
                      >
                        Aceitar
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="border-red-500 text-red-500 hover:bg-red-500/10"
                        onClick={() => rejectOrder(order.id)}
                      >
                        Rejeitar
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum pedido pendente do iFood no momento.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
