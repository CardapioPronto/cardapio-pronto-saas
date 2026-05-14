import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Edit, Trash2, MapPin, TableIcon } from "lucide-react";
import { Area, UpdateAreaData } from "@/types/area";
import { Mesa } from "@/types/mesa";
import { EditAreaDialog } from "./EditAreaDialog";
import { DeleteAreaDialog } from "./DeleteAreaDialog";

interface AreasListProps {
  areas: Area[];
  mesas?: Mesa[];
  onUpdate: (id: string, data: UpdateAreaData) => Promise<Area>;
  onDelete: (id: string) => Promise<void>;
  loading?: boolean;
}

export function AreasList({ areas, mesas = [], onUpdate, onDelete, loading }: AreasListProps) {
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [deletingArea, setDeletingArea] = useState<Area | null>(null);

  const getMesaCount = (areaId: string) => mesas.filter((mesa) => mesa.area_id === areaId).length;

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-3 bg-muted rounded w-full mb-2"></div>
              <div className="h-3 bg-muted rounded w-2/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (areas.length === 0) {
    return (
      <EmptyState
        icon={MapPin}
        title="Nenhuma área cadastrada"
        description="Crie áreas para organizar melhor as mesas do seu restaurante."
      />
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {areas.map((area) => (
          <Card key={area.id} className="relative overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="min-w-0 space-y-1">
                  <CardTitle className="truncate text-lg" title={area.name}>
                    {area.name}
                  </CardTitle>
                  <CardDescription className="line-clamp-2 min-h-10">
                    {area.description || "Sem descrição"}
                  </CardDescription>
                </div>
                <Badge
                  variant="outline"
                  className={`ml-3 shrink-0 ${
                    area.is_active
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-slate-50 text-slate-700"
                  }`}
                >
                  {area.is_active ? "Ativa" : "Inativa"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TableIcon className="h-4 w-4" />
                <span>
                  {getMesaCount(area.id)} {getMesaCount(area.id) === 1 ? "mesa vinculada" : "mesas vinculadas"}
                </span>
              </div>
              <div className="flex justify-end gap-2 border-t pt-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setEditingArea(area)}
                  title="Editar área"
                  aria-label={`Editar área ${area.name}`}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setDeletingArea(area)}
                  title="Remover área"
                  aria-label={`Remover área ${area.name}`}
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <EditAreaDialog
        area={editingArea}
        open={!!editingArea}
        onOpenChange={(open) => !open && setEditingArea(null)}
        onUpdate={onUpdate}
      />

      <DeleteAreaDialog
        area={deletingArea}
        open={!!deletingArea}
        onOpenChange={(open) => !open && setDeletingArea(null)}
        onDelete={onDelete}
      />
    </>
  );
}
