
import {
  HistoricoPedidosFiltros,
  HistoricoPedidosResumo,
  HistoricoPeriodoFiltro,
  HistoricoStatusFiltro,
  Pedido,
} from "../types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PedidoHistoricoItem } from "./PedidoHistoricoItem";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays, ChevronLeft, ChevronRight, Clock, RefreshCw, Receipt, XCircle } from "lucide-react";
import { useState } from "react";
import { PedidoStatus } from "../types";

interface HistoricoPedidosProps {
  pedidosHistorico: Pedido[];
  carregando: boolean;
  alterarStatusPedido: (pedidoId: number | string, novoStatus: PedidoStatus) => void;
  onAtualizar: () => Promise<void>;
  restaurantName: string;
  filtros: HistoricoPedidosFiltros;
  total: number;
  resumo: HistoricoPedidosResumo;
  onChangePeriodo: (periodo: HistoricoPeriodoFiltro) => void;
  onChangeStatus: (status: HistoricoStatusFiltro) => void;
  onChangeDataInicio: (data: string) => void;
  onChangeDataFim: (data: string) => void;
  onChangePagina: (pagina: number) => void;
  onChangeItensPorPagina: (itens: number) => void;
  canViewFinancials: boolean;
  canManageOrders: boolean;
}

export const HistoricoPedidos = ({
  pedidosHistorico,
  carregando,
  alterarStatusPedido,
  onAtualizar,
  restaurantName,
  filtros,
  total,
  resumo,
  onChangePeriodo,
  onChangeStatus,
  onChangeDataInicio,
  onChangeDataFim,
  onChangePagina,
  onChangeItensPorPagina,
  canViewFinancials,
  canManageOrders,
}: HistoricoPedidosProps) => {
  const [atualizando, setAtualizando] = useState(false);
  const totalPaginas = Math.max(1, Math.ceil(total / filtros.itensPorPagina));
  const inicioPagina = total === 0 ? 0 : (filtros.pagina - 1) * filtros.itensPorPagina + 1;
  const fimPagina = Math.min(total, filtros.pagina * filtros.itensPorPagina);

  const handleAtualizar = async () => {
    setAtualizando(true);
    try {
      await onAtualizar();
    } finally {
      setAtualizando(false);
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);

  return (
    <div className="space-y-4">
      {canViewFinancials && (
        <div className="grid gap-3 md:grid-cols-4">
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
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle className="text-base">Filtros do histórico</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAtualizar}
              disabled={atualizando || carregando}
              className="w-full lg:w-auto"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${atualizando || carregando ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <div className="space-y-2 xl:col-span-2">
            <Label>Período</Label>
            <Select value={filtros.periodo} onValueChange={(value) => onChangePeriodo(value as HistoricoPeriodoFiltro)}>
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
            <Label htmlFor="historico-data-inicio">Data inicial</Label>
            <Input
              id="historico-data-inicio"
              type="date"
              value={filtros.dataInicio}
              max={filtros.dataFim}
              onChange={(event) => onChangeDataInicio(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="historico-data-fim">Data final</Label>
            <Input
              id="historico-data-fim"
              type="date"
              value={filtros.dataFim}
              min={filtros.dataInicio}
              onChange={(event) => onChangeDataFim(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={filtros.status} onValueChange={(value) => onChangeStatus(value as HistoricoStatusFiltro)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="preparo">Em preparo</SelectItem>
                <SelectItem value="pronto">Pronto</SelectItem>
                <SelectItem value="finalizado">Finalizado</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Por página</Label>
            <Select value={String(filtros.itensPorPagina)} onValueChange={(value) => onChangeItensPorPagina(Number(value))}>
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
        </CardContent>
      </Card>

      {carregando ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Carregando pedidos...</p>
        </Card>
      ) : pedidosHistorico.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Nenhum pedido encontrado para os filtros selecionados</p>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pedidosHistorico.map((pedido) => (
            <PedidoHistoricoItem
              key={pedido.id}
              pedido={pedido}
              alterarStatusPedido={alterarStatusPedido}
              restaurantName={restaurantName}
              canManageOrders={canManageOrders}
            />
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-md border bg-background p-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Mostrando {inicioPagina}-{fimPagina} de {total} pedidos
        </p>
        <div className="flex items-center justify-between gap-2 sm:justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onChangePagina(Math.max(1, filtros.pagina - 1))}
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
            onClick={() => onChangePagina(Math.min(totalPaginas, filtros.pagina + 1))}
            disabled={filtros.pagina >= totalPaginas || carregando}
          >
            Próxima
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
