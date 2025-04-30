
import React from 'react';
import { Badge } from '@/components/ui/badge';

interface IfoodOrderBadgeProps {
  className?: string;
}

export function IfoodOrderBadge({ className }: IfoodOrderBadgeProps) {
  return (
    <Badge 
      className={`bg-orange text-white hover:bg-orange/90 ${className || ''}`}
    >
      iFood
    </Badge>
  );
}
