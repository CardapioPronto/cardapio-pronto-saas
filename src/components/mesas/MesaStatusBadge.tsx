import { Badge } from "@/components/ui/badge";
import { MesaStatus } from "@/types/mesa";

interface MesaStatusBadgeProps {
  status: MesaStatus;
}

export function MesaStatusBadge({ status }: MesaStatusBadgeProps) {
  const getStatusConfig = (status: MesaStatus) => {
    switch (status) {
      case 'livre':
        return { label: 'Livre', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' };
      case 'ocupada':
        return { label: 'Ocupada', className: 'border-amber-200 bg-amber-50 text-amber-700' };
      case 'reservada':
        return { label: 'Reservada', className: 'border-sky-200 bg-sky-50 text-sky-700' };
      case 'indisponivel':
        return { label: 'Indisponível', className: 'border-slate-200 bg-slate-50 text-slate-700' };
      default:
        return { label: 'Desconhecido', className: 'border-slate-200 bg-slate-50 text-slate-700' };
    }
  };

  const config = getStatusConfig(status);

  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}
