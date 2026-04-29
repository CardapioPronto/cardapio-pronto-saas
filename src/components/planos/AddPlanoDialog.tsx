// src/pages/AddPlanoDialog.tsx
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { PagarmePaymentMethod } from "@/types/plano";

const PAYMENT_METHOD_OPTIONS: Array<{ value: PagarmePaymentMethod; label: string }> = [
  { value: "credit_card", label: "Cartão de crédito" },
  { value: "debit_card", label: "Cartão de débito" },
  { value: "boleto", label: "Boleto" },
  { value: "cash", label: "Dinheiro" },
];

interface AddPlanoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPlanoAdicionado: () => void;
}

export function AddPlanoDialog({
  open,
  onOpenChange,
  onPlanoAdicionado,
}: AddPlanoDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [monthly, setMonthly] = useState("");
  const [yearly, setYearly] = useState("");
  const [trialDays, setTrialDays] = useState("14");
  const [paymentMethods, setPaymentMethods] = useState<PagarmePaymentMethod[]>([
    "credit_card",
    "boleto",
  ]);
  const [saving, setSaving] = useState(false);

  const togglePaymentMethod = (method: PagarmePaymentMethod) => {
    setPaymentMethods((current) =>
      current.includes(method)
        ? current.filter((item) => item !== method)
        : [...current, method],
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Informe o nome do plano");
      return;
    }
    if (paymentMethods.length === 0) {
      toast.error("Selecione pelo menos um método de pagamento");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("plans").insert({
      name,
      description: description || null,
      price_monthly: Number(monthly),
      price_yearly: Number(yearly),
      trial_days: Number(trialDays) || 0,
      pagarme_payment_methods: paymentMethods,
      is_active: true,
      pagarme_sync_status: "pending",
    });
    setSaving(false);

    if (!error) {
      toast.success("Plano criado. Sincronize com o Pagar.me na listagem.");
      onPlanoAdicionado();
      onOpenChange(false);
      setName("");
      setDescription("");
      setMonthly("");
      setYearly("");
      setTrialDays("14");
      setPaymentMethods(["credit_card", "boleto"]);
    } else {
      toast.error("Erro ao criar plano: " + error.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo Plano</DialogTitle>
          <DialogDescription>
            Adicione um novo plano. Após criar, use "Sincronizar com Pagar.me" para criar os planos mensal e anual no gateway.
          </DialogDescription>
        </DialogHeader>
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
              placeholder="Ex: Assinatura única do Pubfy com todos os recursos."
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
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
