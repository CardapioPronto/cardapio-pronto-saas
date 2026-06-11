import { Loader2, Wifi, WifiOff } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { cn } from "@/lib/utils";

interface NetworkStatusBadgeProps {
  className?: string;
  hideStableStateOnMobile?: boolean;
  isChecking?: boolean;
  isOnline?: boolean;
}

export function NetworkStatusBadge({
  className,
  hideStableStateOnMobile = false,
  isChecking: isCheckingOverride,
  isOnline: isOnlineOverride,
}: NetworkStatusBadgeProps) {
  const networkStatus = useNetworkStatus();
  const isChecking = isCheckingOverride ?? networkStatus.isChecking;
  const isOnline = isOnlineOverride ?? networkStatus.isOnline;
  const label = isChecking ? "Verificando" : isOnline ? "Online" : "Offline";
  const shouldHideOnMobile = hideStableStateOnMobile && (isChecking || isOnline);

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 py-1",
        isChecking
          ? "border-amber-200 bg-amber-50 text-amber-700"
          : isOnline
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-red-200 bg-red-50 text-red-700",
        shouldHideOnMobile && "hidden sm:inline-flex",
        className,
      )}
      aria-live="polite"
      title={`Status da conexão: ${label}`}
    >
      {isChecking
        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
        : isOnline
          ? <Wifi className="h-3.5 w-3.5" />
          : <WifiOff className="h-3.5 w-3.5" />}
      {label}
    </Badge>
  );
}
