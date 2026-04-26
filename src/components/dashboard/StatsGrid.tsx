
import { memo } from "react";
import { StatCard } from "./StatCard";
import { LucideIcon } from "lucide-react";

interface Stat {
  title: string;
  value: string;
  change: string;
  icon: LucideIcon;
  color: string;
}

interface StatsGridProps {
  stats: Stat[];
}

const StatsGridBase = ({ stats }: StatsGridProps) => {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <StatCard
          key={index}
          title={stat.title}
          value={stat.value}
          change={stat.change}
          icon={stat.icon}
          color={stat.color}
        />
      ))}
    </div>
  );
};

export const StatsGrid = memo(StatsGridBase);
