import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Edit, Trash2, Users, MapPin } from "lucide-react";
import { Mesa } from "@/types/mesa";
import { Area } from "@/types/area";
import { MesaStatusBadge } from "./MesaStatusBadge";
import { EditMesaDialog } from "./EditMesaDialog";
import { DeleteMesaDialog } from "./DeleteMesaDialog";

interface MesasListProps {
  mesas: Mesa[];
  areas: Area[];
  onUpdate: (id: string, data: any) => Promise<Mesa>;
  onDelete: (id: string) => Promise<void>;
  loading?: boolean;
}

export function MesasList({ mesas, areas, onUpdate, onDelete, loading }: MesasListProps) {
  const [editingMesa, setEditingMesa] = useState<Mesa | null>(null);
  const [deletingMesa, setDeletingMesa] = useState<Mesa | null>(null);

  const getAreaName = (areaId: string | null | undefined) => {
    if (!areaId) return "Sem área";
    const area = areas.find(a => a.id === areaId);
    return area?.name || "Área não encontrada";
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-3 bg-muted rounded w-full mb-2"></div>
              <div className="h-8 bg-muted rounded w-full"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (mesas.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-muted-foreground mb-2">
            Nenhuma mesa cadastrada
          </h3>
          <p className="text-sm text-muted-foreground text-center">
            Crie mesas para organizar o atendimento do seu restaurante.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {mesas.map((mesa) => (
          <Card key={mesa.id} className="relative">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">Mesa {mesa.number}</CardTitle>
                  <CardDescription className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {getAreaName(mesa.area_id)}
                  </CardDescription>
                </div>
                <MesaStatusBadge status={mesa.status} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-4">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {mesa.capacity} pessoas
                </span>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingMesa(mesa)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeletingMesa(mesa)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <EditMesaDialog
        mesa={editingMesa}
        areas={areas}
        open={!!editingMesa}
        onOpenChange={(open) => !open && setEditingMesa(null)}
        onUpdate={onUpdate}
      />

      <DeleteMesaDialog
        mesa={deletingMesa}
        open={!!deletingMesa}
        onOpenChange={(open) => !open && setDeletingMesa(null)}
        onDelete={onDelete}
      />
    </>
  );
}