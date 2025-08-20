import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { MapPin, Users } from "lucide-react";
import { Mesa } from "@/types/mesa";
import { Area } from "@/types/area";
import { MesaStatusBadge } from "@/components/mesas/MesaStatusBadge";

interface MesaSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mesas: Mesa[];
  areas: Area[];
  mesaSelecionada: string;
  onMesaChange: (mesa: string) => void;
  tipoPedido: "mesa" | "balcao";
}

export function MesaSelectorModal({ 
  open,
  onOpenChange,
  mesas, 
  areas, 
  mesaSelecionada, 
  onMesaChange, 
  tipoPedido 
}: MesaSelectorModalProps) {
  const [areaFiltro, setAreaFiltro] = useState<string>("all");

  const getAreaName = (areaId: string | null | undefined) => {
    if (!areaId) return "Sem área";
    const area = areas.find(a => a.id === areaId);
    return area?.name || "Área não encontrada";
  };

  const mesasFiltradas = areaFiltro === "all" 
    ? mesas
    : mesas.filter(mesa => mesa.area_id === areaFiltro);

  const mesasDisponiveis = mesasFiltradas.filter(mesa => 
    mesa.status === 'livre' || mesa.status === 'reservada'
  );

  const handleMesaSelect = (mesaId: string) => {
    onMesaChange(mesaId);
    onOpenChange(false);
  };

  const getMesaInfo = (mesaId: string) => {
    const mesa = mesas.find(m => m.id === mesaId);
    return mesa ? `Mesa ${mesa.number}` : "Mesa não encontrada";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {tipoPedido === "mesa" ? "Selecionar Mesa" : "Mesa para Pedido no Balcão"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Filtro por área */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {tipoPedido === "balcao" ? "Área (opcional)" : "Filtrar por área"}
            </label>
            <Select value={areaFiltro} onValueChange={setAreaFiltro}>
              <SelectTrigger>
                <SelectValue placeholder="Todas as áreas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as áreas</SelectItem>
                {areas.map((area) => (
                  <SelectItem key={area.id} value={area.id}>
                    {area.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Mesa selecionada atualmente */}
          {mesaSelecionada && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium">Mesa selecionada:</p>
              <p className="text-lg">{getMesaInfo(mesaSelecionada)}</p>
            </div>
          )}

          {/* Grid de mesas */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-96 overflow-y-auto">
            {mesasDisponiveis.map((mesa) => (
              <Button
                key={mesa.id}
                variant={mesaSelecionada === mesa.id ? "default" : "outline"}
                className="h-auto p-3 flex flex-col items-start"
                onClick={() => handleMesaSelect(mesa.id)}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="font-medium">Mesa {mesa.number}</span>
                  <MesaStatusBadge status={mesa.status} />
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {getAreaName(mesa.area_id)}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="h-3 w-3" />
                  {mesa.capacity} pessoas
                </div>
              </Button>
            ))}
          </div>

          {mesasDisponiveis.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">Nenhuma mesa disponível</p>
              {areaFiltro !== "all" && (
                <p className="text-xs mt-1">
                  Tente selecionar uma área diferente
                </p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}