
import { memo } from "react";
import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  title: string;
  value: string;
  change: string;
  icon: LucideIcon;
  color: string;
}

const StatCardBase = ({ title, value, change, icon: Icon, color }: StatCardProps) => {
  const changeTone = change.startsWith("-")
    ? "text-destructive"
    : change.startsWith("+")
      ? "text-green"
      : "text-muted-foreground";

  return (
    <Card>
      <CardContent className="flex min-h-32 items-center justify-between gap-4 p-5">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{title}</p>
          <h3 className="mt-1 truncate text-2xl font-bold">{value}</h3>
          <p className={`mt-2 text-xs ${changeTone}`}>{change}</p>
        </div>
        <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
};

export const StatCard = memo(StatCardBase);
