// src/pages/AddPlanoDialog.tsx
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
  const [monthly, setMonthly] = useState("");
  const [yearly, setYearly] = useState("");

  const handleSave = async () => {
    const { error } = await supabase.from("plans").insert({
      name,
      price_monthly: Number(monthly),
      price_yearly: Number(yearly),
      is_active: true,
    });

    if (!error) {
      onPlanoAdicionado();
      onOpenChange(false);
      setName("");
      setMonthly("");
      setYearly("");
    } else {
      console.error("Erro ao criar plano:", error.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo Plano</DialogTitle>
          <DialogDescription>
            Adicione um novo plano.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            placeholder="Nome do plano"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            placeholder="Preço mensal"
            value={monthly}
            onChange={(e) => setMonthly(e.target.value)}
          />
          <Input
            placeholder="Preço anual"
            value={yearly}
            onChange={(e) => setYearly(e.target.value)}
          />
          <Button onClick={handleSave}>Salvar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
