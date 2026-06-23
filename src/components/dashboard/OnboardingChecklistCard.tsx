import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Circle,
  Package,
  QrCode,
  ShoppingCart,
  Store,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { DashboardOverview } from "@/services/dashboardService";

interface OnboardingChecklistCardProps {
  overview: DashboardOverview | null;
  canAccessPDV: boolean;
  canManageProducts: boolean;
  canManageSettings: boolean;
}

type ChecklistItem = {
  id: string;
  title: string;
  description: string;
  done: boolean;
  href: string;
  actionLabel: string;
  icon: typeof Store;
};

export const OnboardingChecklistCard = ({
  overview,
  canAccessPDV,
  canManageProducts,
  canManageSettings,
}: OnboardingChecklistCardProps) => {
  if (!overview) return null;

  const menuReady = overview.isRestaurantActive === true &&
    overview.menuThemeConfigured &&
    overview.totalCategories > 0 &&
    overview.availableProducts > 0;

  const items: ChecklistItem[] = [
    {
      id: "restaurant-profile",
      title: "Completar dados do restaurante",
      description: "Nome, contato, endereco e cardapio publico ativo.",
      done: overview.restaurantProfileCompleted,
      href: "/configuracoes",
      actionLabel: "Abrir configuracoes",
      icon: Store,
    },
    {
      id: "menu-products",
      title: "Cadastrar categorias e produtos",
      description: `${overview.availableProducts}/${overview.totalProducts} produtos ativos em ${overview.totalCategories} categoria${overview.totalCategories === 1 ? "" : "s"}.`,
      done: overview.totalCategories > 0 && overview.availableProducts > 0,
      href: overview.totalCategories > 0 ? "/produtos" : "/categorias",
      actionLabel: overview.totalCategories > 0 ? "Abrir produtos" : "Abrir categorias",
      icon: Package,
    },
    {
      id: "public-menu",
      title: "Publicar QR Code e link rastreavel",
      description: "Gerar QR Code, link para bio e material de divulgacao.",
      done: menuReady,
      href: "/cardapio?tab=qrcode",
      actionLabel: "Abrir QR Code",
      icon: QrCode,
    },
    {
      id: "test-order",
      title: "Fazer um pedido de teste",
      description: "Validar o fluxo do cliente ate PDV, pedidos e cozinha.",
      done: overview.totalOrders > 0,
      href: "/pdv",
      actionLabel: "Abrir PDV",
      icon: ShoppingCart,
    },
  ].filter((item) => {
    if (item.id === "restaurant-profile") return canManageSettings;
    if (item.id === "menu-products" || item.id === "public-menu") return canManageProducts;
    if (item.id === "test-order") return canAccessPDV;
    return false;
  });

  if (items.length === 0) return null;

  const completed = items.filter((item) => item.done).length;
  const progress = Math.round((completed / items.length) * 100);
  const nextItem = items.find((item) => !item.done);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ClipboardCheck className="h-5 w-5 text-primary" />
              Implantacao guiada
            </CardTitle>
            <CardDescription>
              Progresso para deixar o restaurante pronto para vender pelo canal proprio.
            </CardDescription>
          </div>
          <Badge variant={progress === 100 ? "secondary" : "outline"} className="w-fit">
            {completed}/{items.length} concluido{completed === 1 ? "" : "s"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-medium">{progress}% pronto</span>
            <span className="text-muted-foreground">
              {nextItem ? `Proximo passo: ${nextItem.title}` : "Operacao pronta para piloto"}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="grid gap-3 lg:grid-cols-4">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className={cn(
                  "flex min-h-44 flex-col justify-between rounded-md border p-4",
                  item.done ? "border-green/30 bg-green/10" : "bg-muted/20"
                )}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="rounded-md bg-background p-2 shadow-sm">
                      <Icon className="h-4 w-4" />
                    </div>
                    {item.done ? (
                      <CheckCircle2 className="h-5 w-5 text-green" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-medium">{item.title}</h3>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.description}</p>
                  </div>
                </div>

                <Button asChild variant={item.done ? "outline" : "default"} size="sm" className="mt-4 justify-between">
                  <Link to={item.href}>
                    {item.actionLabel}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
