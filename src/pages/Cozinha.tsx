import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { NetworkStatusBadge } from "@/components/pwa/NetworkStatusBadge";
import { SupportContextButton } from "@/components/support/SupportContextButton";
import { Switch } from "@/components/ui/switch";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { usePermissionsV2 } from "@/hooks/usePermissionsV2";
import { useKitchenOrders } from "@/features/kitchen/useKitchenOrders";
import { supabase } from "@/integrations/supabase/client";
import type { KitchenOrder } from "@/features/kitchen/types";
import type { PedidoStatus } from "@/features/pdv/types";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  BellRing,
  CheckCircle2,
  ChefHat,
  Clock3,
  Loader2,
  Expand,
  Minimize,
  PackageCheck,
  RefreshCw,
  RotateCcw,
  Truck,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

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
              <Badge className={cn("h-6", sourceBadgeClass(order))}>{sourceLabel(order)}</Badge>
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
                  {item.addons.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {item.addons.map((addon, index) => (
                        <Badge key={`${addon.name}-${index}`} variant="secondary" className="font-normal">
                          {addon.quantity && addon.quantity > 1 ? `${addon.quantity}x ` : ""}
                          {addon.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {order.notes && (
          <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Obs. do pedido: {order.notes}
          </p>
        )}

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
  const navigate = useNavigate();
  const restaurantId = user?.restaurant_id;
  const canViewDashboard = hasPermission("dashboard_view");
  const canManageOrders = hasPermission("orders_manage");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("todos");
  const [now, setNow] = useState(Date.now());
  const [restaurantName, setRestaurantName] = useState("Pubfy");
  const [isFullscreen, setIsFullscreen] = useState(false);
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

  useEffect(() => {
    let active = true;

    const loadRestaurantName = async () => {
      if (!restaurantId) {
        setRestaurantName("Pubfy");
        return;
      }

      const { data, error } = await supabase
        .from("restaurants")
        .select("name")
        .eq("id", restaurantId)
        .maybeSingle();

      if (!active) return;
      if (!error && data?.name) setRestaurantName(data.name);
    };

    void loadRestaurantName();

    return () => {
      active = false;
    };
  }, [restaurantId]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const filteredOrders = useMemo(
    () => orders.filter((order) => orderMatchesSource(order, sourceFilter)),
    [orders, sourceFilter]
  );

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        return;
      }

      await document.exitFullscreen();
    } catch (error) {
      console.error("Erro ao alternar tela cheia:", error);
      toast.error("Não foi possível alternar a tela cheia neste navegador.");
    }
  };

  const handleStatus = (orderId: string, status: PedidoStatus) => {
    void changeStatus(orderId, status);
  };

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-zinc-50">
      <header className="shrink-0 border-b bg-background shadow-sm">
        <div className="flex flex-col gap-3 px-3 py-3 lg:flex-row lg:items-center lg:justify-between lg:px-5">
          <div className="flex min-w-0 items-center gap-3">
            {canViewDashboard && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => navigate("/dashboard")}
                aria-label="Voltar ao dashboard"
                title="Voltar ao dashboard"
                className="shrink-0"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <ChefHat className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <h1 className="truncate text-base font-semibold leading-tight sm:text-lg">
                  {restaurantName}
                </h1>
                <Badge variant="outline" className="hidden shrink-0 sm:inline-flex">
                  Cozinha
                </Badge>
              </div>
              <p className="truncate text-xs text-muted-foreground">
                Mural de produção em tempo real
              </p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 sm:flex sm:flex-wrap sm:items-center">
            <Badge variant="secondary" className="justify-center gap-1.5 py-1.5">
              <Clock3 className="h-3.5 w-3.5" />
              {summary.waiting}
              <span className="hidden sm:inline">entrada</span>
            </Badge>
            <Badge variant="secondary" className="justify-center gap-1.5 py-1.5">
              <ChefHat className="h-3.5 w-3.5" />
              {summary.preparing}
              <span className="hidden sm:inline">preparo</span>
            </Badge>
            <Badge variant="secondary" className="justify-center gap-1.5 py-1.5">
              <PackageCheck className="h-3.5 w-3.5" />
              {summary.ready}
              <span className="hidden sm:inline">pronto</span>
            </Badge>
            <Badge variant="outline" className="justify-center gap-1.5 py-1.5">
              <Truck className="h-3.5 w-3.5" />
              {summary.delivery}
              <span className="hidden sm:inline">externos</span>
            </Badge>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t px-3 py-3 lg:flex-row lg:items-center lg:justify-between lg:px-5">
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" variant={sourceFilter === "todos" ? "default" : "outline"} onClick={() => setSourceFilter("todos")}>
              Todos
            </Button>
            <Button type="button" size="sm" variant={sourceFilter === "delivery" ? "default" : "outline"} onClick={() => setSourceFilter("delivery")}>
              <Truck className="mr-2 h-4 w-4" />
              Delivery, iFood e WhatsApp
            </Button>
            <Button type="button" size="sm" variant={sourceFilter === "salao" ? "default" : "outline"} onClick={() => setSourceFilter("salao")}>
              Salão e balcão
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
              <BellRing className="h-4 w-4" />
              Som
              <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} />
            </label>
            <Button type="button" size="sm" variant="outline" onClick={refresh} disabled={loading}>
              <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
              Atualizar
            </Button>
            <NetworkStatusBadge />
            <SupportContextButton title="Cozinha" />
            <Button type="button" size="sm" variant="outline" onClick={toggleFullscreen}>
              {isFullscreen ? <Minimize className="mr-2 h-4 w-4" /> : <Expand className="mr-2 h-4 w-4" />}
              {isFullscreen ? "Sair" : "Tela cheia"}
            </Button>
          </div>
        </div>
      </header>

      <main className="dashboard-scrollbar min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-3 lg:p-5">
        {!canManageOrders && (
          <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            Seu usuário pode visualizar a cozinha, mas precisa da permissão Gerenciar Pedidos para alterar status.
          </div>
        )}

        <section className="mx-auto grid w-full max-w-[1800px] gap-4 xl:grid-cols-3">
          {columns.map((column) => {
            const Icon = column.icon;
            const columnOrders = filteredOrders.filter((order) => column.statuses.includes(order.status));

            return (
              <div key={column.id} className={cn("min-h-[520px] rounded-md border bg-muted/25", column.className)}>
                <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b bg-white/95 p-3 backdrop-blur lg:p-4">
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
      </main>
    </div>
  );
};

export default Cozinha;
