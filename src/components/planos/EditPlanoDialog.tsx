
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plano } from "@/types/plano";
import { supabase } from "@/lib/supabase";

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
  const [monthly, setMonthly] = useState("");
  const [yearly, setYearly] = useState("");

  useEffect(() => {
    if (plano) {
      setName(plano.name);
      setMonthly(String(plano.price_monthly));
      setYearly(String(plano.price_yearly));
    }
  }, [plano]);

  const handleUpdate = async () => {
    if (!plano) return;

    const { error } = await supabase
      .from("plans")
      .update({
        name,
        price_monthly: Number(monthly),
        price_yearly: Number(yearly),
      })
      .eq("id", plano.id);

    if (!error) {
      onPlanoAtualizado();
      onOpenChange(false);
    } else {
      console.error("Erro ao atualizar plano:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Plano</DialogTitle>
          <DialogDescription>
            Edição de Plano.
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
          <Button onClick={handleUpdate}>Salvar alterações</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
