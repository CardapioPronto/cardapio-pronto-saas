import { WifiOff } from "lucide-react";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

export function OfflineStatusBanner() {
  const { isOnline } = useNetworkStatus();
  const browserOffline =
    typeof navigator !== "undefined" && navigator.onLine === false;

  // O banner segue o estado do navegador (offline/online). O probe HTTP em
  // useNetworkStatus continua guiando filas e sync; evita falso positivo quando
  // /auth/v1/health falha no preview/CI com navigator.onLine === true.
  if (!browserOffline || isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-3 bottom-3 z-[60] rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 shadow-lg sm:left-auto sm:w-[360px]"
    >
      <div className="flex items-start gap-3">
        <WifiOff className="mt-0.5 h-4 w-4 flex-shrink-0" />
        <div>
          <div className="font-semibold">Sem conexão com a internet</div>
          <div className="text-xs text-red-700">
            O app pode continuar aberto, mas pedidos, pagamentos e salvamentos exigem conexão.
          </div>
        </div>
      </div>
    </div>
  );
}
