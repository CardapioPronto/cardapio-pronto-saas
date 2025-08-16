import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Users } from "lucide-react";
import { Mesa } from "@/types/mesa";
import { Area } from "@/types/area";
import { MesaStatusBadge } from "@/components/mesas/MesaStatusBadge";

interface MesaSelectorProps {
  mesas: Mesa[];
  areas: Area[];
  mesaSelecionada: string;
  onMesaChange: (mesa: string) => void;
  tipoPedido: "mesa" | "balcao";
}

export function MesaSelector({ 
  mesas, 
  areas, 
  mesaSelecionada, 
  onMesaChange, 
  tipoPedido 
}: MesaSelectorProps) {
  const [areaFiltro, setAreaFiltro] = useState<string>("");

  const getAreaName = (areaId: string | undefined) => {
    if (!areaId) return "Sem área";
    const area = areas.find(a => a.id === areaId);
    return area?.name || "Área não encontrada";
  };

  const mesasFiltradas = areaFiltro 
    ? mesas.filter(mesa => mesa.area_id === areaFiltro)
    : mesas;

  const mesasDisponiveis = mesasFiltradas.filter(mesa => 
    mesa.status === 'livre' || mesa.status === 'reservada'
  );

  if (tipoPedido === "balcao") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Mesa para Pedido no Balcão
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Área (opcional)</label>
            <Select value={areaFiltro} onValueChange={setAreaFiltro}>
              <SelectTrigger>
                <SelectValue placeholder="Todas as áreas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas as áreas</SelectItem>
                {areas.map((area) => (
                  <SelectItem key={area.id} value={area.id}>
                    {area.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
            {mesasDisponiveis.map((mesa) => (
              <Button
                key={mesa.id}
                variant={mesaSelecionada === mesa.id ? "default" : "outline"}
                className="h-auto p-3 flex flex-col items-start"
                onClick={() => onMesaChange(mesa.id)}
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
            <div className="text-center py-4 text-muted-foreground">
              <p className="text-sm">Nenhuma mesa disponível</p>
              {areaFiltro && (
                <p className="text-xs mt-1">
                  Tente selecionar uma área diferente
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">
          Selecionar Mesa
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Filtrar por área</label>
          <Select value={areaFiltro} onValueChange={setAreaFiltro}>
            <SelectTrigger>
              <SelectValue placeholder="Todas as áreas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todas as áreas</SelectItem>
              {areas.map((area) => (
                <SelectItem key={area.id} value={area.id}>
                  {area.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
          {mesasDisponiveis.map((mesa) => (
            <Button
              key={mesa.id}
              variant={mesaSelecionada === mesa.id ? "default" : "outline"}
              className="h-auto p-3 flex flex-col items-start"
              onClick={() => onMesaChange(mesa.id)}
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
          <div className="text-center py-4 text-muted-foreground">
            <p className="text-sm">Nenhuma mesa disponível</p>
            {areaFiltro && (
              <p className="text-xs mt-1">
                Tente selecionar uma área diferente
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}