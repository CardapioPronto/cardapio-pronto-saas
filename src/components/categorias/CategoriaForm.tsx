
import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface CategoriaFormProps {
  onSubmit: (name: string) => Promise<boolean>;
  initialValues: {
    name: string;
  };
}

export const CategoriaForm = ({ onSubmit, initialValues }: CategoriaFormProps) => {
  const [name, setName] = useState(initialValues.name);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setIsSubmitting(true);
    await onSubmit(name);
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="name">Nome da Categoria</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome da categoria"
          required
        />
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting || !name.trim()}>
          {isSubmitting ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </form>
  );
};
