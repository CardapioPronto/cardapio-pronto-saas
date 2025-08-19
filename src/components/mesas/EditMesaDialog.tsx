import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mesa, UpdateMesaData } from "@/types/mesa";
import { Area } from "@/types/area";

interface EditMesaDialogProps {
  mesa: Mesa | null;
  areas: Area[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (id: string, data: UpdateMesaData) => Promise<Mesa>;
}

export function EditMesaDialog({ mesa, areas, open, onOpenChange, onUpdate }: EditMesaDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    number: "",
    area_id: "none",
    capacity: 4,
    status: "livre" as Mesa['status'],
  });

  useEffect(() => {
    if (mesa) {
      setFormData({
        number: mesa.number,
        area_id: mesa.area_id || "none",
        capacity: mesa.capacity || 4,
        status: mesa.status,
      });
    }
  }, [mesa]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mesa || !formData.number.trim()) return;

    setLoading(true);
    try {
      await onUpdate(mesa.id, {
        number: formData.number.trim(),
        area_id: formData.area_id === "none" ? undefined : formData.area_id || undefined,
        capacity: formData.capacity,
        status: formData.status,
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao atualizar mesa:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Mesa</DialogTitle>
          <DialogDescription>
            Atualize as informações da mesa.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-number">Número/Nome da Mesa *</Label>
            <Input
              id="edit-number"
              value={formData.number}
              onChange={(e) => setFormData(prev => ({ ...prev, number: e.target.value }))}
              placeholder="Número da mesa"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="edit-area">Área</Label>
            <Select
              value={formData.area_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, area_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma área" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem área específica</SelectItem>
                {areas.map((area) => (
                  <SelectItem key={area.id} value={area.id}>
                    {area.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-capacity">Capacidade</Label>
            <Input
              id="edit-capacity"
              type="number"
              min="1"
              max="20"
              value={formData.capacity}
              onChange={(e) => setFormData(prev => ({ ...prev, capacity: parseInt(e.target.value) || 4 }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as Mesa['status'] }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="livre">Livre</SelectItem>
                <SelectItem value="ocupada">Ocupada</SelectItem>
                <SelectItem value="reservada">Reservada</SelectItem>
                <SelectItem value="indisponivel">Indisponível</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !formData.number.trim()}>
              {loading ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}