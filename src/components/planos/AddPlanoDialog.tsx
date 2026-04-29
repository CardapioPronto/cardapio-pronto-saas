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
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";

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
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Informe o nome do plano");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("plans").insert({
      name,
      description: description || null,
      price_monthly: Number(monthly),
      price_yearly: Number(yearly),
      trial_days: Number(trialDays) || 0,
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
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
