import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit, Trash2, Users, MapPin, Search, TableIcon } from "lucide-react";
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
  const [search, setSearch] = useState("");
  const [areaFilter, setAreaFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const getAreaName = (areaId: string | null | undefined) => {
    if (!areaId) return "Sem área";
    const area = areas.find(a => a.id === areaId);
    return area?.name || "Área não encontrada";
  };

  const filteredMesas = mesas.filter((mesa) => {
    const searchText = `${mesa.number} ${mesa.name || ""} ${getAreaName(mesa.area_id)}`.toLowerCase();
    const matchesSearch = searchText.includes(search.trim().toLowerCase());
    const matchesArea =
      areaFilter === "all" ||
      (areaFilter === "without-area" ? !mesa.area_id : mesa.area_id === areaFilter);
    const matchesStatus = statusFilter === "all" || mesa.status === statusFilter;

    return matchesSearch && matchesArea && matchesStatus;
  });

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
      <div className="flex flex-col gap-3 rounded-md border bg-card p-3 lg:flex-row">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por número, nome ou área"
            className="pl-9"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:w-[440px]">
          <Select value={areaFilter} onValueChange={setAreaFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por área" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as áreas</SelectItem>
              <SelectItem value="without-area">Sem área</SelectItem>
              {areas.map((area) => (
                <SelectItem key={area.id} value={area.id}>
                  {area.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="livre">Livre</SelectItem>
              <SelectItem value="ocupada">Ocupada</SelectItem>
              <SelectItem value="reservada">Reservada</SelectItem>
              <SelectItem value="indisponivel">Indisponível</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredMesas.length === 0 ? (
        <Card className="mt-4">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <TableIcon className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold text-muted-foreground">
              Nenhuma mesa encontrada
            </h3>
            <p className="text-center text-sm text-muted-foreground">
              Ajuste os filtros para visualizar outras mesas cadastradas.
            </p>
          </CardContent>
        </Card>
      ) : (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredMesas.map((mesa) => (
          <Card key={mesa.id} className="relative overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <CardTitle className="truncate text-lg" title={`Mesa ${mesa.number}`}>
                    Mesa {mesa.number}
                  </CardTitle>
                  <CardDescription className="mt-1 flex items-center gap-1">
                    <MapPin className="h-3 w-3 shrink-0" />
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
                  {mesa.capacity || 0} pessoas
                </span>
              </div>
              
              <div className="flex justify-end gap-2 border-t pt-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setEditingMesa(mesa)}
                  title="Editar mesa"
                  aria-label={`Editar mesa ${mesa.number}`}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setDeletingMesa(mesa)}
                  title="Remover mesa"
                  aria-label={`Remover mesa ${mesa.number}`}
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      )}

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
