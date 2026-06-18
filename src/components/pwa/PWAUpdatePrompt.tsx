import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useServiceWorkerStatus } from "@/hooks/useServiceWorkerStatus";

export function PWAUpdatePrompt() {
  const {
    updateAvailable,
    activatingUpdate,
    activateUpdate,
  } = useServiceWorkerStatus();

  if (!updateAvailable) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-3 bottom-24 z-[60] rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 shadow-lg sm:left-auto sm:w-[380px]"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="font-semibold">Nova versão disponível</div>
          <div className="text-xs text-emerald-800">
            Atualize para carregar os arquivos mais recentes do Pubfy.
          </div>
        </div>
        <Button
          size="sm"
          className="flex-shrink-0 gap-2"
          onClick={activateUpdate}
          disabled={activatingUpdate}
        >
          <RefreshCw className={activatingUpdate ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          Atualizar
        </Button>
      </div>
    </div>
  );
}
