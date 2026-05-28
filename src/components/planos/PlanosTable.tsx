// PlanosTable.tsx
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AdminTable } from "@/components/admin/AdminTable";
import { Pencil, ListPlus, RefreshCw, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Plano } from "@/types/plano";
import { DeletePlanoDialog } from "./DeletePlanoDialog";
import { DEFAULT_TRIAL_DAYS, formatTrialDurationText } from "@/lib/trialDays";

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  credit_card: "Crédito",
  debit_card: "Débito",
  boleto: "Boleto",
  pix: "PIX",
  cash: "Dinheiro",
};

interface PlanosTableProps {
  data: Plano[] | null;
  isLoading: boolean;
  onRemove: (id: string) => void;
  onEdit: (plano: Plano) => void;
  onManageFeatures: (plano: Plano) => void;
  onSync: (plano: Plano) => void;
  syncingId?: string | null;
}

function dateTimeToMinute(value: string): number {
  const date = new Date(value);
  date.setSeconds(0, 0);
  return date.getTime();
}

function needsSync(p: Plano): boolean {
  if (p.pagarme_sync_status === "error") return true;
  if (p.pagarme_sync_status !== "synced") return true;
  if (!p.pagarme_synced_at) return true;
  if (p.updated_at && dateTimeToMinute(p.updated_at) > dateTimeToMinute(p.pagarme_synced_at)) return true;
  if (!p.pagarme_plan_id_monthly || !p.pagarme_plan_id_yearly) return true;
  return false;
}

export const PlanosTable = ({
  data,
  isLoading,
  onRemove,
  onEdit,
  onManageFeatures,
  onSync,
  syncingId,
}: PlanosTableProps) => {
  const columns = [
    {
      header: "Nome",
      accessorKey: "name" as keyof Plano,
    },
    {
      header: "Mensal",
      accessorKey: (row: Plano) => formatCurrency(row.price_monthly),
    },
    {
      header: "Anual (R$/mês)",
      accessorKey: (row: Plano) => formatCurrency(row.price_yearly),
    },
    {
      header: "Trial",
      accessorKey: (row: Plano) => formatTrialDurationText(row.trial_days ?? DEFAULT_TRIAL_DAYS),
    },
    {
      header: "Pagamento",
      accessorKey: (row: Plano) =>
        (row.pagarme_payment_methods?.length ? row.pagarme_payment_methods : ["credit_card", "boleto"])
          .map((method) => PAYMENT_METHOD_LABELS[method] ?? method)
          .join(", "),
    },
    {
      header: "E-mail",
      accessorKey: (row: Plano) =>
        row.email_campaigns_enabled
          ? `${row.email_campaign_monthly_limit ?? 0}/mês · ${row.email_campaign_contact_limit ?? 0}/campanha`
          : "Transacional",
    },
    {
      header: "Ativo",
      accessorKey: (row: Plano) => (row.is_active ? "✅" : "❌"),
    },
    {
      header: "Pagar.me",
      accessorKey: (row: Plano) => {
        const status = row.pagarme_sync_status ?? "pending";
        const stale = needsSync(row);
        if (status === "error") {
          return (
            <Badge variant="destructive" className="gap-1" title={row.pagarme_sync_error || ""}>
              <AlertCircle className="w-3 h-3" /> Erro
            </Badge>
          );
        }
        if (status === "synced" && !stale) {
          return (
            <Badge variant="secondary" className="gap-1 bg-green-500/15 text-green-700 dark:text-green-400">
              <CheckCircle2 className="w-3 h-3" /> Sincronizado
            </Badge>
          );
        }
        return (
          <Badge variant="outline" className="gap-1">
            <Clock className="w-3 h-3" /> Pendente
          </Badge>
        );
      },
    },
    {
      header: "Ações",
      accessorKey: (row: Plano) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => onSync(row)}
            disabled={!needsSync(row) || syncingId === row.id}
            title={needsSync(row) ? "Sincronizar com Pagar.me" : "Já sincronizado"}
          >
            <RefreshCw className={`w-4 h-4 ${syncingId === row.id ? "animate-spin" : ""}`} />
          </Button>
          <Button variant="outline" size="icon" onClick={() => onEdit(row)} title="Editar plano">
            <Pencil className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => onManageFeatures(row)} title="Gerenciar funcionalidades">
            <ListPlus className="w-4 h-4" />
          </Button>
          <DeletePlanoDialog plano={row} onDelete={onRemove} />
        </div>
      ),
    },
  ];

  return (
    <AdminTable
      data={data}
      isLoading={isLoading}
      columns={columns}
      emptyMessage="Nenhum plano encontrado."
    />
  );
};
