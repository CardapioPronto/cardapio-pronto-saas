import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, MapPin } from "lucide-react";
import { Area } from "@/types/area";
import { EditAreaDialog } from "./EditAreaDialog";
import { DeleteAreaDialog } from "./DeleteAreaDialog";

interface AreasListProps {
  areas: Area[];
  onUpdate: (id: string, data: any) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  loading?: boolean;
}

export function AreasList({ areas, onUpdate, onDelete, loading }: AreasListProps) {
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [deletingArea, setDeletingArea] = useState<Area | null>(null);

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
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-muted-foreground mb-2">
            Nenhuma área cadastrada
          </h3>
          <p className="text-sm text-muted-foreground text-center">
            Crie áreas para organizar melhor as mesas do seu restaurante.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {areas.map((area) => (
          <Card key={area.id} className="relative">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{area.name}</CardTitle>
                  <CardDescription>
                    {area.description || "Sem descrição"}
                  </CardDescription>
                </div>
                <Badge variant={area.is_active ? "default" : "secondary"}>
                  {area.is_active ? "Ativa" : "Inativa"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingArea(area)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeletingArea(area)}
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