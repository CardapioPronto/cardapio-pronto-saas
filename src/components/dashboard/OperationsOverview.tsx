import { Link } from "react-router-dom";
import type { ComponentType } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  MessageCircle,
  PackageCheck,
  QrCode,
  ShoppingBasket,
  TableIcon,
  Tags,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardOverview } from "@/services/dashboardService";
import { cn } from "@/lib/utils";

interface OperationsOverviewProps {
  overview: DashboardOverview | null;
}

type StatusTone = "success" | "warning" | "danger" | "muted";

const toneClasses: Record<StatusTone, string> = {
  success: "border-green/30 bg-green/10 text-green-dark",
  warning: "border-orange/30 bg-orange/10 text-orange-dark",
  danger: "border-destructive/30 bg-destructive/10 text-destructive",
  muted: "border-border bg-muted/40 text-muted-foreground",
};

const OperationTile = ({
  icon: Icon,
  label,
  value,
  detail,
  tone,
  href,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  detail: string;
  tone: StatusTone;
  href: string;
}) => (
  <Link
    to={href}
    className={cn(
      "group flex min-h-32 flex-col justify-between rounded-md border p-4 transition-colors hover:bg-background",
      toneClasses[tone]
    )}
  >
    <div className="flex items-start justify-between gap-3">
      <div className="rounded-md bg-white/75 p-2 shadow-sm">
        <Icon className="h-4 w-4" />
      </div>
      <ArrowRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
    </div>
    <div>
      <p className="text-sm font-medium text-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
      <p className="mt-1 text-xs">{detail}</p>
    </div>
  </Link>
);

export const OperationsOverview = ({ overview }: OperationsOverviewProps) => {
  if (!overview) return null;

  const menuIsReady = overview.menuThemeConfigured && overview.totalCategories > 0 && overview.availableProducts > 0;
  const publicMenuDisabled = overview.isRestaurantActive === false;
  const whatsappReady = overview.whatsappInstances > 0 && overview.whatsappNeedsAttention === 0;
  const tablesInUse = overview.occupiedTables + overview.reservedTables;
  const tableDetail = overview.totalTables > 0
    ? `${overview.occupiedTables} ocupadas, ${overview.reservedTables} reservadas`
    : "Nenhuma mesa cadastrada";
  const menuDetail = overview.totalCategories > 0
    ? `${overview.availableProducts}/${overview.totalProducts} produtos ativos em ${overview.totalCategories} categorias`
    : "Cadastre categorias para organizar o cardápio";
  const ordersDetail = overview.overdueOpenOrders > 0
    ? `${overview.openOrdersToday} hoje, ${overview.overdueOpenOrders} de dias anteriores`
    : `${overview.openOrdersToday} aberto${overview.openOrdersToday === 1 ? "" : "s"} hoje`;

  const actionItems = [
    publicMenuDisabled && {
      label: "Restaurante desativado no cardápio público",
      href: "/configuracoes",
      tone: "danger" as StatusTone,
    },
    overview.overdueOpenOrders > 0 && {
      label: `${overview.overdueOpenOrders} pedido${overview.overdueOpenOrders === 1 ? "" : "s"} aberto${overview.overdueOpenOrders === 1 ? "" : "s"} de dias anteriores`,
      href: "/pedidos",
      tone: "danger" as StatusTone,
    },
    overview.totalCategories === 0 && {
      label: "Nenhuma categoria cadastrada",
      href: "/categorias",
      tone: "warning" as StatusTone,
    },
    overview.availableProducts === 0 && {
      label: "Nenhum produto ativo no cardápio",
      href: "/produtos",
      tone: "warning" as StatusTone,
    },
    overview.openOrdersToday > 0 && {
      label: `${overview.openOrdersToday} pedido${overview.openOrdersToday === 1 ? "" : "s"} em aberto hoje`,
      href: "/pedidos",
      tone: "warning" as StatusTone,
    },
    overview.unavailableProducts > 0 && {
      label: `${overview.unavailableProducts} produto${overview.unavailableProducts === 1 ? "" : "s"} indisponível${overview.unavailableProducts === 1 ? "" : "eis"}`,
      href: "/produtos",
      tone: "warning" as StatusTone,
    },
    !overview.menuThemeConfigured && {
      label: "Tema do cardápio pendente",
      href: "/cardapio",
      tone: "muted" as StatusTone,
    },
    overview.whatsappNeedsAttention > 0 && {
      label: "WhatsApp precisa de atenção",
      href: "/atendimento",
      tone: "danger" as StatusTone,
    },
    overview.expiringCoupons > 0 && {
      label: `${overview.expiringCoupons} cupom${overview.expiringCoupons === 1 ? "" : "s"} vencendo em até 7 dias`,
      href: "/cardapio",
      tone: "warning" as StatusTone,
    },
  ].filter(Boolean) as Array<{ label: string; href: string; tone: StatusTone }>;

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-lg">Resumo operacional</CardTitle>
              <CardDescription>{overview.restaurantName}</CardDescription>
            </div>
            <Badge variant={menuIsReady ? "secondary" : "outline"} className="w-fit">
              {publicMenuDisabled ? "Cardápio público desativado" : menuIsReady ? "Cardápio configurado" : "Cardápio incompleto"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <OperationTile
              icon={QrCode}
              label="Cardápio"
              value={menuIsReady ? "Online" : "Revisar"}
              detail={menuDetail}
              tone={menuIsReady ? "success" : "warning"}
              href="/cardapio"
            />
            <OperationTile
              icon={ShoppingBasket}
              label="Pedidos"
              value={String(overview.openOrdersToday)}
              detail={ordersDetail}
              tone={overview.overdueOpenOrders > 0 ? "danger" : overview.openOrdersToday > 0 ? "warning" : "success"}
              href="/pedidos"
            />
            <OperationTile
              icon={TableIcon}
              label="Mesas"
              value={overview.totalTables > 0 ? `${tablesInUse}/${overview.totalTables}` : "0"}
              detail={tableDetail}
              tone={overview.unavailableTables > 0 ? "danger" : tablesInUse > 0 ? "warning" : overview.totalTables > 0 ? "success" : "muted"}
              href="/mesas"
            />
            <OperationTile
              icon={MessageCircle}
              label="WhatsApp"
              value={overview.whatsappInstances > 0 ? `${overview.whatsappConnectedInstances}/${overview.whatsappInstances}` : "0"}
              detail={`${overview.waitingHuman} aguardando, ${overview.unreadMessages} não lidas`}
              tone={whatsappReady ? "success" : overview.whatsappInstances > 0 ? "danger" : "muted"}
              href="/atendimento"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Ações rápidas</CardTitle>
          <CardDescription>Prioridades do momento</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-md border bg-muted/30 p-3">
              <Tags className="mb-2 h-4 w-4 text-orange" />
              <p className="text-xl font-semibold">{overview.activeCoupons}</p>
              <p className="text-xs text-muted-foreground">Cupons ativos</p>
            </div>
            <div className="rounded-md border bg-muted/30 p-3">
              <PackageCheck className="mb-2 h-4 w-4 text-green" />
              <p className="text-xl font-semibold">{overview.activePromotions}</p>
              <p className="text-xs text-muted-foreground">Promoções ativas</p>
            </div>
          </div>

          {actionItems.length > 0 ? (
            <div className="space-y-2">
              {actionItems.slice(0, 4).map((item) => (
                <Button
                  key={item.label}
                  asChild
                  variant="outline"
                  className="h-auto w-full justify-between whitespace-normal py-2 text-left"
                >
                  <Link to={item.href}>
                    <span className="flex min-w-0 items-center gap-2">
                      {item.tone === "danger" ? (
                        <AlertTriangle className="h-4 w-4 flex-shrink-0 text-destructive" />
                      ) : (
                        <ArrowRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      )}
                      <span className="truncate">{item.label}</span>
                    </span>
                  </Link>
                </Button>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-md border bg-green/10 p-3 text-green-dark">
              <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
              <p className="text-sm font-medium">Operação sem pendências críticas</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
