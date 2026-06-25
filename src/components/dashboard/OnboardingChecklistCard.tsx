import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Circle,
  Headphones,
  Loader2,
  Package,
  QrCode,
  RotateCcw,
  ShoppingCart,
  Store,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { DashboardOverview } from "@/services/dashboardService";
import {
  buildOnboardingChecklist,
  listRestaurantOnboardingProgress,
  saveRestaurantOnboardingStep,
  type OnboardingHealthStatus,
  type OnboardingStepId,
  type RestaurantOnboardingProgress,
} from "@/services/onboardingProgressService";

interface OnboardingChecklistCardProps {
  restaurantId: string | null;
  currentUserId?: string | null;
  overview: DashboardOverview | null;
  canAccessPDV: boolean;
  canManageProducts: boolean;
  canManageSettings: boolean;
  canManageOnboarding: boolean;
}

const stepIcons: Record<OnboardingStepId, typeof Store> = {
  "restaurant-profile": Store,
  "menu-products": Package,
  "public-menu": QrCode,
  "test-order": ShoppingCart,
  "team-training": Users,
  "support-handoff": Headphones,
};

const healthTone: Record<OnboardingHealthStatus, string> = {
  blocked: "border-red-200 bg-red-50 text-red-700",
  at_risk: "border-amber-200 bg-amber-50 text-amber-800",
  active: "border-sky-200 bg-sky-50 text-sky-800",
  ready_to_sell: "border-green/30 bg-green/10 text-green",
};

export const OnboardingChecklistCard = ({
  restaurantId,
  currentUserId,
  overview,
  canAccessPDV,
  canManageProducts,
  canManageSettings,
  canManageOnboarding,
}: OnboardingChecklistCardProps) => {
  const [progressRows, setProgressRows] = useState<RestaurantOnboardingProgress[]>([]);
  const [loadingProgress, setLoadingProgress] = useState(false);
  const [savingStepId, setSavingStepId] = useState<OnboardingStepId | null>(null);

  useEffect(() => {
    if (!restaurantId) {
      setProgressRows([]);
      return;
    }

    let active = true;

    const loadProgress = async () => {
      setLoadingProgress(true);
      try {
        const rows = await listRestaurantOnboardingProgress(restaurantId);
        if (active) setProgressRows(rows);
      } catch (error) {
        console.warn("Nao foi possivel carregar progresso de onboarding:", error);
      } finally {
        if (active) setLoadingProgress(false);
      }
    };

    void loadProgress();

    return () => {
      active = false;
    };
  }, [restaurantId]);

  const checklist = useMemo(() => {
    if (!overview) return null;

    return buildOnboardingChecklist(overview, progressRows, {
      canAccessPDV,
      canManageProducts,
      canManageSettings,
    });
  }, [canAccessPDV, canManageProducts, canManageSettings, overview, progressRows]);

  if (!overview || !checklist || checklist.items.length === 0) return null;

  const handleStatus = async (
    stepId: OnboardingStepId,
    status: "pending" | "done" | "skipped",
  ) => {
    if (!restaurantId) return;

    setSavingStepId(stepId);
    try {
      const saved = await saveRestaurantOnboardingStep({
        restaurantId,
        stepId,
        status,
        userId: currentUserId,
      });
      setProgressRows((current) => [
        saved,
        ...current.filter((row) => row.step_id !== stepId),
      ]);
      toast.success(status === "pending" ? "Etapa reaberta." : "Checklist atualizado.");
    } catch (error) {
      console.error("Erro ao salvar etapa de onboarding:", error);
      toast.error("Nao foi possivel atualizar o checklist.");
    } finally {
      setSavingStepId(null);
    }
  };

  return (
    <Card data-testid="onboarding-checklist-card">
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
          <div className="flex flex-wrap items-center gap-2">
            {loadingProgress && (
              <Badge variant="outline" className="gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Salvando estado
              </Badge>
            )}
            <Badge className={cn("w-fit border", healthTone[checklist.health.status])}>
              Saude: {checklist.health.label}
            </Badge>
            <Badge variant={checklist.progressPercent === 100 ? "secondary" : "outline"} className="w-fit">
              {checklist.completed}/{checklist.total} concluido{checklist.completed === 1 ? "" : "s"}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-medium">{checklist.progressPercent}% pronto</span>
            <span className="text-muted-foreground">
              {checklist.nextItem ? `Proximo passo: ${checklist.nextItem.title}` : "Operacao pronta para piloto"}
            </span>
          </div>
          <Progress value={checklist.progressPercent} className="h-2" />
          <div className="flex items-start gap-2 rounded-md border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{checklist.health.description}</span>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-3 2xl:grid-cols-6">
          {checklist.items.map((item) => {
            const Icon = stepIcons[item.id];
            const saving = savingStepId === item.id;
            const resolved = item.done || item.skipped;

            return (
              <div
                key={item.id}
                className={cn(
                  "flex min-h-44 flex-col justify-between rounded-md border p-4",
                  item.done ? "border-green/30 bg-green/10" : item.skipped ? "border-slate-200 bg-slate-50" : "bg-muted/20"
                )}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="rounded-md bg-background p-2 shadow-sm">
                      <Icon className="h-4 w-4" />
                    </div>
                    {item.done ? (
                      <CheckCircle2 className="h-5 w-5 text-green" />
                    ) : item.skipped ? (
                      <Circle className="h-5 w-5 text-slate-400" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-medium">{item.title}</h3>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.description}</p>
                    {item.manualOnly && (
                      <Badge variant="outline" className="mt-2">
                        Validacao manual
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <Button asChild variant={resolved ? "outline" : "default"} size="sm" className="w-full justify-between">
                    <Link to={item.href}>
                      {item.actionLabel}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>

                  {canManageOnboarding && (
                    resolved && !item.automaticDone ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="w-full justify-between"
                        disabled={saving}
                        onClick={() => void handleStatus(item.id, "pending")}
                      >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                        Reabrir
                      </Button>
                    ) : !resolved && item.manualOnly ? (
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={saving}
                          onClick={() => void handleStatus(item.id, "done")}
                        >
                          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Concluir"}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={saving}
                          onClick={() => void handleStatus(item.id, "skipped")}
                        >
                          Dispensar
                        </Button>
                      </div>
                    ) : !resolved ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full"
                        disabled={saving}
                        onClick={() => void handleStatus(item.id, "done")}
                      >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Concluir manualmente"}
                      </Button>
                    ) : null
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
