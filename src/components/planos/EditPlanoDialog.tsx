
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PagarmePaymentMethod, Plano } from "@/types/plano";
import { supabase } from "@/lib/supabase";
import { toast } from "@/components/ui/sonner";

const PAYMENT_METHOD_OPTIONS: Array<{ value: PagarmePaymentMethod; label: string }> = [
  { value: "credit_card", label: "Cartão de crédito" },
  { value: "debit_card", label: "Cartão de débito" },
  { value: "boleto", label: "Boleto" },
  { value: "cash", label: "Dinheiro" },
];

interface EditPlanoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plano: Plano | null;
  onPlanoAtualizado: () => void;
}

export const EditPlanoDialog = ({
  open,
  onOpenChange,
  plano,
  onPlanoAtualizado,
}: EditPlanoDialogProps) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [monthly, setMonthly] = useState("");
  const [yearly, setYearly] = useState("");
  const [trialDays, setTrialDays] = useState("14");
  const [isActive, setIsActive] = useState(true);
  const [paymentMethods, setPaymentMethods] = useState<PagarmePaymentMethod[]>([
    "credit_card",
    "boleto",
  ]);
  const [emailCampaignsEnabled, setEmailCampaignsEnabled] = useState(false);
  const [emailCampaignMonthlyLimit, setEmailCampaignMonthlyLimit] = useState("0");
  const [emailCampaignContactLimit, setEmailCampaignContactLimit] = useState("0");
  const [emailCustomTemplatesEnabled, setEmailCustomTemplatesEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (plano) {
      setName(plano.name);
      setDescription(plano.description || "");
      setMonthly(String(plano.price_monthly));
      setYearly(String(plano.price_yearly));
      setTrialDays(String(plano.trial_days ?? 14));
      setIsActive(plano.is_active);
      setPaymentMethods(plano.pagarme_payment_methods?.length ? plano.pagarme_payment_methods : ["credit_card", "boleto"]);
      setEmailCampaignsEnabled(plano.email_campaigns_enabled ?? false);
      setEmailCampaignMonthlyLimit(String(plano.email_campaign_monthly_limit ?? 0));
      setEmailCampaignContactLimit(String(plano.email_campaign_contact_limit ?? 0));
      setEmailCustomTemplatesEnabled(plano.email_custom_templates_enabled ?? true);
    }
  }, [plano]);

  const togglePaymentMethod = (method: PagarmePaymentMethod) => {
    setPaymentMethods((current) =>
      current.includes(method)
        ? current.filter((item) => item !== method)
        : [...current, method],
    );
  };

  const handleUpdate = async () => {
    if (!plano) return;
    if (paymentMethods.length === 0) {
      toast.error("Selecione pelo menos um método de pagamento");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("plans")
      .update({
        name,
        description: description || null,
        price_monthly: Number(monthly),
        price_yearly: Number(yearly),
        trial_days: Number(trialDays) || 0,
        pagarme_payment_methods: paymentMethods,
        email_campaigns_enabled: emailCampaignsEnabled,
        email_campaign_monthly_limit: Number(emailCampaignMonthlyLimit) || 0,
        email_campaign_contact_limit: Number(emailCampaignContactLimit) || 0,
        email_custom_templates_enabled: emailCustomTemplatesEnabled,
        is_active: isActive,
      })
      .eq("id", plano.id);
    setSaving(false);

    if (!error) {
      toast.success("Plano atualizado. Sincronize com Pagar.me se necessário.");
      onPlanoAtualizado();
      onOpenChange(false);
    } else {
      toast.error("Erro ao atualizar plano: " + error.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Plano</DialogTitle>
          <DialogDescription>
            Atualize os dados do plano local.
          </DialogDescription>
        </DialogHeader>
        <Alert variant="default" className="border-warning/50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Alterar um plano <strong>não modifica automaticamente</strong> assinaturas já existentes no Pagar.me.
            Apenas novas assinaturas usarão os novos dados. Lembre de sincronizar com o Pagar.me após salvar.
          </AlertDescription>
        </Alert>
        <div className="space-y-3">
          <div>
            <Label>Nome do plano</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Preço mensal (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={monthly}
                onChange={(e) => setMonthly(e.target.value)}
              />
            </div>
            <div>
              <Label>Preço anual (R$/mês)</Label>
              <Input
                type="number"
                step="0.01"
                value={yearly}
                onChange={(e) => setYearly(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label>Dias de teste grátis</Label>
            <Input
              type="number"
              value={trialDays}
              onChange={(e) => setTrialDays(e.target.value)}
            />
          </div>
          <div className="space-y-2 rounded-md border p-3">
            <Label>Métodos de pagamento no Pagar.me</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {PAYMENT_METHOD_OPTIONS.map((option) => (
                <label key={option.value} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={paymentMethods.includes(option.value)}
                    onCheckedChange={() => togglePaymentMethod(option.value)}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-3 rounded-md border p-3">
            <Label>Recursos de e-mail por plano</Label>
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label>Campanhas de e-mail</Label>
                <p className="text-xs text-muted-foreground">Libera editor, seleção de público e botão de envio.</p>
              </div>
              <Switch checked={emailCampaignsEnabled} onCheckedChange={setEmailCampaignsEnabled} />
            </div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label>Templates personalizados</Label>
                <p className="text-xs text-muted-foreground">Permite copiar modelos autorizados do Pubfy para o restaurante.</p>
              </div>
              <Switch checked={emailCustomTemplatesEnabled} onCheckedChange={setEmailCustomTemplatesEnabled} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Envios/mês</Label>
                <Input
                  type="number"
                  min="0"
                  value={emailCampaignMonthlyLimit}
                  onChange={(e) => setEmailCampaignMonthlyLimit(e.target.value)}
                />
              </div>
              <div>
                <Label>Contatos/campanha</Label>
                <Input
                  type="number"
                  min="0"
                  value={emailCampaignContactLimit}
                  onChange={(e) => setEmailCampaignContactLimit(e.target.value)}
                />
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label>Plano ativo</Label>
              <p className="text-xs text-muted-foreground">
                Planos inativos não aparecem para novos clientes.
              </p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
          <Button onClick={handleUpdate} disabled={saving} className="w-full">
            {saving ? "Salvando..." : "Salvar alterações"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
