import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Database,
  Download,
  Laptop,
  PackageCheck,
  RefreshCw,
  Smartphone,
  UserRound,
  Wifi,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { usePWAInstallPrompt } from "@/hooks/usePWAInstallPrompt";
import { useServiceWorkerStatus } from "@/hooks/useServiceWorkerStatus";
import {
  getPDVOfflineCatalogFreshness,
  readPDVOfflineCatalog,
  type PDVOfflineCatalogSnapshot,
} from "@/features/pdv/services/pdvOfflineCatalogService";
import {
  readPDVOfflineOrderQueue,
  type PDVOfflineOrder,
} from "@/features/pdv/services/pdvOfflineOrderQueueService";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { getLocalDeviceInfo, getShortDeviceId, type LocalDeviceInfo } from "@/lib/localDevice";
import { cn } from "@/lib/utils";

interface PWAInstallDiagnosticCardProps {
  restaurantId: string | null;
}

type DiagnosticTileProps = {
  icon: typeof Wifi;
  label: string;
  value: string;
  detail: string;
  tone?: "success" | "warning" | "danger" | "muted";
};

const toneClasses = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  danger: "border-red-200 bg-red-50 text-red-900",
  muted: "border-border bg-muted/30 text-muted-foreground",
};

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return "Sem registro";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sem registro";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const DiagnosticTile = ({
  icon: Icon,
  label,
  value,
  detail,
  tone = "muted",
}: DiagnosticTileProps) => (
  <div className={cn("min-h-32 rounded-md border p-4", toneClasses[tone])}>
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="rounded-md bg-white/80 p-2 shadow-sm">
        <Icon className="h-4 w-4" />
      </div>
      {tone === "success" && <CheckCircle2 className="h-4 w-4 text-emerald-700" />}
      {tone === "danger" && <AlertTriangle className="h-4 w-4 text-red-700" />}
    </div>
    <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">{label}</p>
    <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
    <p className="mt-1 text-xs leading-5">{detail}</p>
  </div>
);

export function PWAInstallDiagnosticCard({ restaurantId }: PWAInstallDiagnosticCardProps) {
  const { canInstall, installed, promptInstall } = usePWAInstallPrompt();
  const networkStatus = useNetworkStatus();
  const serviceWorker = useServiceWorkerStatus();
  const { user } = useCurrentUser();
  const [queue, setQueue] = useState<PDVOfflineOrder[]>([]);
  const [catalog, setCatalog] = useState<PDVOfflineCatalogSnapshot | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<LocalDeviceInfo | null>(null);

  const refreshLocalDiagnostics = useCallback(() => {
    setDeviceInfo(getLocalDeviceInfo());

    if (!restaurantId) {
      setQueue([]);
      setCatalog(null);
      return;
    }

    setQueue(readPDVOfflineOrderQueue(restaurantId));
    setCatalog(readPDVOfflineCatalog(restaurantId));
  }, [restaurantId]);

  useEffect(() => {
    refreshLocalDiagnostics();

    const handleQueueChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ restaurantId?: string }>).detail;
      if (!detail?.restaurantId || detail.restaurantId === restaurantId) {
        refreshLocalDiagnostics();
      }
    };

    window.addEventListener("storage", refreshLocalDiagnostics);
    window.addEventListener("pdv-offline-queue:changed", handleQueueChanged);

    return () => {
      window.removeEventListener("storage", refreshLocalDiagnostics);
      window.removeEventListener("pdv-offline-queue:changed", handleQueueChanged);
    };
  }, [refreshLocalDiagnostics, restaurantId]);

  const queueSummary = useMemo(() => {
    const errorCount = queue.filter((order) => order.status === "error").length;
    const reviewCount = queue.filter((order) => order.status === "review").length;
    const pendingCount = queue.filter((order) => order.status === "pending" || order.status === "syncing").length;
    const lastAttemptAt = queue
      .map((order) => order.lastAttemptAt)
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1);
    const lastOrder = [...queue].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).at(-1) ?? null;

    return {
      errorCount,
      reviewCount,
      pendingCount,
      totalCount: queue.length,
      lastAttemptAt,
      lastOrder,
    };
  }, [queue]);

  const catalogFreshness = getPDVOfflineCatalogFreshness(catalog?.syncedAt ?? null);
  const catalogTone = catalogFreshness.isExpired
    ? "danger"
    : catalogFreshness.isStale
      ? "warning"
      : catalog?.syncedAt
        ? "success"
        : "muted";
  const operatorLabel = user?.name || user?.email || "Operador nao identificado";

  const handleInstall = async () => {
    const outcome = await promptInstall();

    if (outcome === "accepted") {
      toast.success("Instalação iniciada.");
    } else if (outcome === "dismissed") {
      toast.info("Instalação adiada.");
    } else {
      toast.info("Instalação indisponível neste navegador agora.");
    }
  };

  const handleRefresh = () => {
    refreshLocalDiagnostics();
    void serviceWorker.refreshStatus();
  };

  const serviceWorkerValue = serviceWorker.registered
    ? serviceWorker.controlled
      ? "Ativo"
      : "Registrado"
    : serviceWorker.supported
      ? "Pendente"
      : "Indisponível";

  const serviceWorkerTone = serviceWorker.controlled
    ? "success"
    : serviceWorker.supported
      ? "warning"
      : "danger";

  const queueTone = queueSummary.errorCount > 0
    ? "danger"
    : queueSummary.reviewCount > 0 || queueSummary.pendingCount > 0
      ? "warning"
      : "success";

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Smartphone className="h-5 w-5 text-primary" />
              App e offline
            </CardTitle>
            <CardDescription>
              Estado do PWA, cache local e fila offline neste dispositivo.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={installed ? "secondary" : "outline"}>
              {installed ? "Instalado" : canInstall ? "Instalação liberada" : "Navegador"}
            </Badge>
            {serviceWorker.pwaStatus?.serviceWorkerVersion && (
              <Badge variant="outline">
                SW {serviceWorker.pwaStatus.serviceWorkerVersion}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            {installed
              ? "Abrindo em modo app neste dispositivo."
              : canInstall
                ? "Instalação disponível para este navegador."
                : "A instalação aparece quando o navegador libera o prompt."}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={canInstall ? "default" : "outline"}
              size="sm"
              className="gap-2"
              onClick={handleInstall}
              disabled={!canInstall || installed}
            >
              <Download className="h-4 w-4" />
              Instalar app
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4" />
              Atualizar status
            </Button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <DiagnosticTile
            icon={Wifi}
            label="Conexão"
            value={networkStatus.isChecking ? "Verificando" : networkStatus.isOnline ? "Online" : "Offline"}
            detail={`Último teste: ${formatDateTime(networkStatus.lastCheckedAt)}`}
            tone={networkStatus.isChecking ? "warning" : networkStatus.isOnline ? "success" : "danger"}
          />
          <DiagnosticTile
            icon={PackageCheck}
            label="Service worker"
            value={serviceWorkerValue}
            detail={serviceWorker.pwaStatus?.appShellCache ?? "Cache ainda não informado"}
            tone={serviceWorkerTone}
          />
          <DiagnosticTile
            icon={Laptop}
            label="Dispositivo"
            value={deviceInfo?.label ?? "Nao identificado"}
            detail={`ID ${getShortDeviceId(deviceInfo?.id)} · ${operatorLabel}`}
            tone={deviceInfo ? "success" : "muted"}
          />
          <DiagnosticTile
            icon={Database}
            label="Fila PDV"
            value={`${queueSummary.totalCount} pedido${queueSummary.totalCount === 1 ? "" : "s"}`}
            detail={`${queueSummary.pendingCount} pendente${queueSummary.pendingCount === 1 ? "" : "s"}, ${queueSummary.reviewCount} em revisao, ${queueSummary.errorCount} com erro`}
            tone={queueTone}
          />
          <DiagnosticTile
            icon={Clock3}
            label="Última sincronização"
            value={formatDateTime(catalog?.syncedAt)}
            detail={`${catalogFreshness.label}. Tentativa: ${formatDateTime(queueSummary.lastAttemptAt)}`}
            tone={catalogTone}
          />
        </div>

        {queueSummary.lastOrder && (
          <div className="flex flex-col gap-2 rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span className="flex min-w-0 items-center gap-2">
              <UserRound className="h-4 w-4 shrink-0" />
              <span className="truncate">
                Ultimo pedido local: {queueSummary.lastOrder.operatorName || queueSummary.lastOrder.operatorEmail || "operador nao registrado"}
              </span>
            </span>
            <span className="flex min-w-0 items-center gap-2">
              <Laptop className="h-4 w-4 shrink-0" />
              <span className="truncate">
                {queueSummary.lastOrder.deviceLabel || "dispositivo sem ID"} · {formatDateTime(queueSummary.lastOrder.createdAt)}
              </span>
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
