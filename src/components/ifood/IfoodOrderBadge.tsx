import { Badge } from '@/components/ui/badge';

interface IfoodOrderBadgeProps {
  className?: string;
}

export function IfoodOrderBadge({ className }: IfoodOrderBadgeProps) {
  return (
    <Badge 
      variant="outline"
      className={`border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-50 ${className || ''}`}
    >
      iFood
    </Badge>
  );
}
