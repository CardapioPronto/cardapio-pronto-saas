import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { usePermissionsV2 } from "@/hooks/usePermissionsV2";
import { useKitchenOrders } from "@/features/kitchen/useKitchenOrders";
import type { KitchenOrder } from "@/features/kitchen/types";
import type { PedidoStatus } from "@/features/pdv/types";
import { cn } from "@/lib/utils";
import {
  BellRing,
  CheckCircle2,
  ChefHat,
  Clock3,
  Loader2,
  Maximize2,
  PackageCheck,
  RefreshCw,
  RotateCcw,
  Truck,
  XCircle,
} from "lucide-react";

type Column = {
  id: "pendente" | "preparo" | "pronto";
  title: string;
  description: string;
  statuses: PedidoStatus[];
  icon: typeof Clock3;
  className: string;
};

type SourceFilter = "todos" | "delivery" | "salao";

const columns: Column[] = [
  {
    id: "pendente",
    title: "Entrada",
    description: "Pedidos aguardando início",
    statuses: ["pendente"],
    icon: Clock3,
    className: "border-l-4 border-l-amber-500",
  },
  {
    id: "preparo",
    title: "Em preparo",
    description: "Pedidos sendo produzidos",
    statuses: ["preparo", "em-andamento"],
    icon: ChefHat,
    className: "border-l-4 border-l-sky-500",
  },
  {
    id: "pronto",
    title: "Pronto",
    description: "Aguardando retirada, entrega ou fechamento",
    statuses: ["pronto"],
    icon: PackageCheck,
    className: "border-l-4 border-l-emerald-600",
  },
];

const sourceLabel = (order: KitchenOrder) => {
  if (order.source === "ifood") return "iFood";
  if (order.source === "whatsapp") return "WhatsApp";
  if (order.source === "cardapio") return order.orderType === "delivery" ? "Delivery" : "Cardápio";
  if (order.orderType === "delivery") return "Delivery";
  if (order.orderType === "mesa") return "Salão";
  return "PDV";
};

const sourceBadgeClass = (order: KitchenOrder) => {
  if (order.source === "ifood") return "bg-red-500 text-white hover:bg-red-500";
  if (order.source === "whatsapp") return "bg-emerald-600 text-white hover:bg-emerald-600";
  if (order.orderType === "delivery" || order.source === "cardapio") return "bg-violet-600 text-white hover:bg-violet-600";
  return "bg-slate-700 text-white hover:bg-slate-700";
};

const statusLabel = (status: PedidoStatus) => {
  switch (status) {
    case "pendente": return "Entrada";
    case "preparo":
    case "em-andamento": return "Em preparo";
    case "pronto": return "Pronto";
    case "finalizado": return "Finalizado";
    case "cancelado": return "Cancelado";
    default: return status.replaceAll("_", " ");
  }
};

const elapsedLabel = (createdAt: string, now: number) => {
  const minutes = Math.max(0, Math.floor((now - new Date(createdAt).getTime()) / 60000));
  if (minutes < 1) return "agora";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `${hours}h ${rest}min` : `${hours}h`;
};

const orderMatchesSource = (order: KitchenOrder, filter: SourceFilter) => {
  const isDelivery = order.orderType === "delivery" || ["ifood", "whatsapp"].includes(order.source || "");
  if (filter === "delivery") return isDelivery;
  if (filter === "salao") return !isDelivery;
  return true;
};

interface KitchenOrderCardProps {
  order: KitchenOrder;
  now: number;
  canManage: boolean;
  updating: boolean;
  onChangeStatus: (id: string, status: PedidoStatus) => void;
}

const KitchenOrderCard = ({ order, now, canManage, updating, onChangeStatus }: KitchenOrderCardProps) => {
  const shortId = (order.orderNumber || order.id).slice(0, 8).toUpperCase();
  const elapsed = elapsedLabel(order.createdAt, now);
  const isLate = now - new Date(order.createdAt).getTime() > 25 * 60000;
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Card className={cn("overflow-hidden rounded-md border bg-white shadow-sm", isLate && "border-red-300")}>
      <CardContent className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm font-semibold">#{shortId}</span>
              <Badge className={sourceBadgeClass(order)}>{sourceLabel(order)}</Badge>
              <Badge variant="outline">{statusLabel(order.status)}</Badge>
            </div>
            <p className="mt-2 truncate text-sm font-medium">{order.tableLabel}</p>
            <p className="truncate text-xs text-muted-foreground">
              {order.customerName || "Cliente"} • {itemCount} {itemCount === 1 ? "item" : "itens"}
            </p>
          </div>
          <div className={cn("rounded-md border px-2 py-1 text-right text-xs", isLate ? "border-red-300 bg-red-50 text-red-700" : "bg-muted/50")}>
            <Clock3 className="mb-1 ml-auto h-4 w-4" />
            {elapsed}
          </div>
        </div>

        <div className="space-y-2">
          {order.items.map((item) => (
            <div key={item.id} className="rounded-md bg-muted/45 p-3">
              <div className="flex items-start gap-2">
                <span className="rounded bg-background px-2 py-0.5 text-sm font-semibold">{item.quantity}x</span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium leading-snug">{item.productName}</p>
                  {item.observations && (
                    <p className="mt-1 rounded border border-amber-300 bg-amber-50 px-2 py-1 text-xs text-amber-900">
                      Obs: {item.observations}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {order.paymentStatus && order.paymentStatus !== "not_required" && (
          <p className="rounded-md border bg-background px-3 py-2 text-xs text-muted-foreground">
            Pagamento: {order.paymentStatus.replaceAll("_", " ")}
          </p>
        )}

        <div className="grid grid-cols-2 gap-2">
          {order.status === "pendente" && (
            <Button disabled={!canManage || updating} onClick={() => onChangeStatus(order.id, "preparo")}>
              <ChefHat className="mr-2 h-4 w-4" />
              Iniciar
            </Button>
          )}
          {(order.status === "preparo" || order.status === "em-andamento") && (
            <>
              <Button disabled={!canManage || updating} variant="outline" onClick={() => onChangeStatus(order.id, "pendente")}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Voltar
              </Button>
              <Button disabled={!canManage || updating} onClick={() => onChangeStatus(order.id, "pronto")}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Pronto
              </Button>
            </>
          )}
          {order.status === "pronto" && (
            <>
              <Button disabled={!canManage || updating} variant="outline" onClick={() => onChangeStatus(order.id, "preparo")}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Reabrir
              </Button>
              <Button disabled={!canManage || updating} onClick={() => onChangeStatus(order.id, "finalizado")}>
                <PackageCheck className="mr-2 h-4 w-4" />
                Finalizar
              </Button>
            </>
          )}
          {order.status === "pendente" && (
            <Button disabled={!canManage || updating} variant="outline" onClick={() => onChangeStatus(order.id, "cancelado")}>
              <XCircle className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const Cozinha = () => {
  const { user } = useCurrentUser();
  const { hasPermission } = usePermissionsV2();
  const restaurantId = user?.restaurant_id;
  const canManageOrders = hasPermission("orders_manage");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("todos");
  const [now, setNow] = useState(Date.now());
  const {
    orders,
    loading,
    updatingId,
    soundEnabled,
    setSoundEnabled,
    changeStatus,
    refresh,
    summary,
  } = useKitchenOrders(restaurantId);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(interval);
  }, []);

  const filteredOrders = useMemo(
    () => orders.filter((order) => orderMatchesSource(order, sourceFilter)),
    [orders, sourceFilter]
  );

  const requestFullscreen = () => {
    document.documentElement.requestFullscreen?.().catch(() => undefined);
  };

  const handleStatus = (orderId: string, status: PedidoStatus) => {
    void changeStatus(orderId, status);
  };

  return (
    <DashboardLayout title="Cozinha">
      <div className="space-y-5">
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-md border bg-white p-4">
            <p className="text-xs text-muted-foreground">Entrada</p>
            <p className="mt-1 text-2xl font-semibold">{summary.waiting}</p>
          </div>
          <div className="rounded-md border bg-white p-4">
            <p className="text-xs text-muted-foreground">Em preparo</p>
            <p className="mt-1 text-2xl font-semibold">{summary.preparing}</p>
          </div>
          <div className="rounded-md border bg-white p-4">
            <p className="text-xs text-muted-foreground">Prontos</p>
            <p className="mt-1 text-2xl font-semibold">{summary.ready}</p>
          </div>
          <div className="rounded-md border bg-white p-4">
            <p className="text-xs text-muted-foreground">Canais externos</p>
            <p className="mt-1 text-2xl font-semibold">{summary.delivery}</p>
          </div>
        </section>

        <section className="flex flex-col gap-3 rounded-md border bg-white p-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant={sourceFilter === "todos" ? "default" : "outline"} onClick={() => setSourceFilter("todos")}>
              Todos
            </Button>
            <Button size="sm" variant={sourceFilter === "delivery" ? "default" : "outline"} onClick={() => setSourceFilter("delivery")}>
              <Truck className="mr-2 h-4 w-4" />
              Delivery, iFood e WhatsApp
            </Button>
            <Button size="sm" variant={sourceFilter === "salao" ? "default" : "outline"} onClick={() => setSourceFilter("salao")}>
              Salão e balcão
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
              <BellRing className="h-4 w-4" />
              Som
              <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} />
            </label>
            <Button size="sm" variant="outline" onClick={refresh} disabled={loading}>
              <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
              Atualizar
            </Button>
            <Button size="sm" variant="outline" onClick={requestFullscreen}>
              <Maximize2 className="mr-2 h-4 w-4" />
              Tela cheia
            </Button>
          </div>
        </section>

        {!canManageOrders && (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            Seu usuário pode visualizar a cozinha, mas precisa da permissão Gerenciar Pedidos para alterar status.
          </div>
        )}

        <section className="grid gap-4 xl:grid-cols-3">
          {columns.map((column) => {
            const Icon = column.icon;
            const columnOrders = filteredOrders.filter((order) => column.statuses.includes(order.status));

            return (
              <div key={column.id} className={cn("min-h-[480px] rounded-md border bg-muted/25", column.className)}>
                <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b bg-white/95 p-4 backdrop-blur">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="rounded-md bg-muted p-2">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="font-semibold">{column.title}</h2>
                      <p className="truncate text-xs text-muted-foreground">{column.description}</p>
                    </div>
                  </div>
                  <Badge variant="secondary">{columnOrders.length}</Badge>
                </div>

                <div className="space-y-3 p-3">
                  {loading && columnOrders.length === 0 ? (
                    <div className="flex items-center justify-center gap-2 rounded-md border bg-white p-6 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Carregando
                    </div>
                  ) : columnOrders.length === 0 ? (
                    <div className="rounded-md border border-dashed bg-white p-6 text-center text-sm text-muted-foreground">
                      Nenhum pedido nesta etapa
                    </div>
                  ) : (
                    columnOrders.map((order) => (
                      <KitchenOrderCard
                        key={order.id}
                        order={order}
                        now={now}
                        canManage={canManageOrders}
                        updating={updatingId === order.id}
                        onChangeStatus={handleStatus}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </section>
      </div>
    </DashboardLayout>
  );
};

export default Cozinha;
