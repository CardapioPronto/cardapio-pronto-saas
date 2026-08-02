import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, CalendarClock, CheckCircle2, Circle, Clock3 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import type { DashboardOverview } from "@/services/dashboardService";
import { buildFirstWeekFollowUp, type FollowUpTaskStatus } from "@/lib/onboardingFollowUp";
import { cn } from "@/lib/utils";

interface FollowUpFirstWeekCardProps {
  restaurantId: string | null;
  overview: DashboardOverview | null;
}

const STATUS_STYLE: Record<FollowUpTaskStatus, { label: string; className: string }> = {
  done: { label: "Concluido", className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
  today: { label: "Hoje", className: "bg-primary/10 text-primary border-primary/30" },
  late: { label: "Atrasado", className: "bg-destructive/10 text-destructive border-destructive/30" },
  upcoming: { label: "Proximo", className: "bg-muted text-muted-foreground border-border" },
};

export function FollowUpFirstWeekCard({ restaurantId, overview }: FollowUpFirstWeekCardProps) {
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [teamCount, setTeamCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!restaurantId) {
        setLoading(false);
        return;
      }
      setLoading(true);

      const [restaurantResult, employeesResult] = await Promise.all([
        supabase.from("restaurants").select("created_at").eq("id", restaurantId).maybeSingle(),
        supabase
          .from("employees")
          .select("id", { count: "exact", head: true })
          .eq("restaurant_id", restaurantId),
      ]);

      if (!active) return;
      setCreatedAt((restaurantResult.data as { created_at?: string } | null)?.created_at ?? null);
      setTeamCount(employeesResult.count ?? 0);
      setLoading(false);
    };

    void load();
    return () => {
      active = false;
    };
  }, [restaurantId]);

  const plan = useMemo(() => {
    if (!createdAt || !overview) return null;
    return buildFirstWeekFollowUp(createdAt, {
      profileCompleted: overview.restaurantProfileCompleted,
      hasProducts: overview.availableProducts > 0,
      publicMenuActive: Boolean(overview.publicMenuSlug) && overview.isRestaurantActive,
      hasAnyOrder: overview.totalOrders > 0,
      teamTrained: teamCount > 0,
      extraChannelReady: overview.whatsappConnectedInstances > 0,
      hasRecentOrders: overview.ordersToday > 0 || overview.totalOrders > 1,
    });
  }, [createdAt, overview, teamCount]);

  if (loading || !plan) return null;
  // Depois de 14 dias o acompanhamento assistido deixa de ser util no painel.
  if (plan.dayIndex > 14 && plan.completed === plan.total) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarClock className="h-5 w-5 text-primary" />
              Acompanhamento dos primeiros 7 dias
            </CardTitle>
            <CardDescription>{plan.summary}</CardDescription>
          </div>
          <Badge variant="outline" className="whitespace-nowrap">
            {plan.completed}/{plan.total} etapas
          </Badge>
        </div>
        <Progress value={plan.progressPercent} className="mt-3 h-2" />
      </CardHeader>
      <CardContent className="space-y-2">
        {plan.tasks.map((task) => {
          const style = STATUS_STYLE[task.status];
          return (
            <div
              key={task.id}
              className={cn(
                "flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3",
                task.status === "late" && "border-destructive/30",
              )}
            >
              <div className="flex min-w-0 items-start gap-3">
                {task.done ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                ) : task.status === "late" ? (
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                ) : task.status === "today" ? (
                  <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                ) : (
                  <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{task.title}</p>
                  <p className="text-xs text-muted-foreground">{task.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={style.className}>
                  {style.label}
                </Badge>
                {!task.done && (
                  <Button asChild size="sm" variant="ghost">
                    <Link to={task.href}>{task.action}</Link>
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
