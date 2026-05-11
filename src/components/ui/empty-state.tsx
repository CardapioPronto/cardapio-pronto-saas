import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center rounded-lg border border-dashed bg-muted/30",
        compact ? "px-4 py-8 gap-2" : "px-6 py-12 gap-3",
        className,
      )}
      role="status"
    >
      {Icon ? (
        <div
          className={cn(
            "flex items-center justify-center rounded-full bg-muted text-muted-foreground",
            compact ? "h-10 w-10" : "h-12 w-12",
          )}
          aria-hidden="true"
        >
          <Icon className={compact ? "h-5 w-5" : "h-6 w-6"} />
        </div>
      ) : null}
      <div className="space-y-1">
        <p className={cn("font-medium text-foreground", compact ? "text-sm" : "text-base")}>
          {title}
        </p>
        {description ? (
          <p className={cn("text-muted-foreground", compact ? "text-xs" : "text-sm")}>
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  );
}
