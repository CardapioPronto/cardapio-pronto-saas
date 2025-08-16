import { Badge } from "@/components/ui/badge";
import { MesaStatus } from "@/types/mesa";

interface MesaStatusBadgeProps {
  status: MesaStatus;
}

export function MesaStatusBadge({ status }: MesaStatusBadgeProps) {
  const getStatusConfig = (status: MesaStatus) => {
    switch (status) {
      case 'livre':
        return { label: 'Livre', variant: 'default' as const };
      case 'ocupada':
        return { label: 'Ocupada', variant: 'destructive' as const };
      case 'reservada':
        return { label: 'Reservada', variant: 'secondary' as const };
      case 'indisponivel':
        return { label: 'Indisponível', variant: 'outline' as const };
      default:
        return { label: 'Desconhecido', variant: 'outline' as const };
    }
  };

  const config = getStatusConfig(status);

  return (
    <Badge variant={config.variant}>
      {config.label}
    </Badge>
  );
}