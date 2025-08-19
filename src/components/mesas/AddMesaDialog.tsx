import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { CreateMesaData, Mesa } from "@/types/mesa";
import { Area } from "@/types/area";

interface AddMesaDialogProps {
  areas: Area[];
  onAdd: (data: Omit<CreateMesaData, 'restaurant_id'>) => Promise<Mesa>;
}

export function AddMesaDialog({ areas, onAdd }: AddMesaDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    number: "",
    area_id: "",
    capacity: 4,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.number.trim()) return;

    setLoading(true);
    try {
      await onAdd({
        number: formData.number.trim(),
        area_id: formData.area_id || undefined,
        capacity: formData.capacity,
      });
      
      setFormData({ number: "", area_id: "", capacity: 4 });
      setOpen(false);
    } catch (error) {
      console.error("Erro ao adicionar mesa:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nova Mesa
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Adicionar Nova Mesa</DialogTitle>
          <DialogDescription>
            Crie uma nova mesa para o seu restaurante.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="number">Número/Nome da Mesa *</Label>
            <Input
              id="number"
              value={formData.number}
              onChange={(e) => setFormData(prev => ({ ...prev, number: e.target.value }))}
              placeholder="Ex: 1, A1, Mesa VIP"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="area">Área (opcional)</Label>
            <Select
              value={formData.area_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, area_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma área" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Sem área específica</SelectItem>
                {areas.map((area) => (
                  <SelectItem key={area.id} value={area.id}>
                    {area.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="capacity">Capacidade</Label>
            <Input
              id="capacity"
              type="number"
              min="1"
              max="20"
              value={formData.capacity}
              onChange={(e) => setFormData(prev => ({ ...prev, capacity: parseInt(e.target.value) || 4 }))}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !formData.number.trim()}>
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}