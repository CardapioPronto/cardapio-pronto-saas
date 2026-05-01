import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddMesaDialog } from "@/components/mesas/AddMesaDialog";
import { MesasList } from "@/components/mesas/MesasList";
import { AddAreaDialog } from "@/components/areas/AddAreaDialog";
import { AreasList } from "@/components/areas/AreasList";
import { useMesas } from "@/hooks/useMesas";
import { useAreas } from "@/hooks/useAreas";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { MapPin, TableIcon, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

const Mesas = () => {
  const { user } = useCurrentUser();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(location.pathname === "/areas" ? "areas" : "mesas");
  const restaurantId = user?.restaurant_id || "";
  
  const {
    mesas,
    loading: mesasLoading,
    createMesa,
    updateMesa,
    deleteMesa
  } = useMesas(restaurantId);

  const {
    areas,
    loading: areasLoading,
    createArea,
    updateArea,
    deleteArea
  } = useAreas(restaurantId);

  const loading = mesasLoading || areasLoading;
  const activeAreas = areas.filter((area) => area.is_active).length;

  const mesaStats = useMemo(() => {
    return mesas.reduce(
      (acc, mesa) => {
        acc.capacity += mesa.capacity || 0;
        acc[mesa.status] += 1;
        return acc;
      },
      {
        capacity: 0,
        livre: 0,
        ocupada: 0,
        reservada: 0,
        indisponivel: 0,
      }
    );
  }, [mesas]);

  return (
    <DashboardLayout title="Áreas e Mesas">
      <div className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                <TableIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Mesas ativas</p>
                <p className="text-2xl font-semibold leading-tight">{mesas.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600">
                <UsersRound className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Capacidade total</p>
                <p className="text-2xl font-semibold leading-tight">{mesaStats.capacity}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-amber-500/10 text-amber-600">
                <TableIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ocupadas</p>
                <p className="text-2xl font-semibold leading-tight">{mesaStats.ocupada}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-sky-500/10 text-sky-600">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Áreas ativas</p>
                <p className="text-2xl font-semibold leading-tight">{activeAreas}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <TabsList className="grid w-full grid-cols-2 sm:w-auto">
              <TabsTrigger value="mesas">Mesas</TabsTrigger>
              <TabsTrigger value="areas">Áreas</TabsTrigger>
            </TabsList>

            <div className="flex flex-col gap-2 sm:flex-row">
              {activeTab === "areas" ? (
                <AddAreaDialog onAdd={createArea} />
              ) : (
                <AddMesaDialog areas={areas} onAdd={createMesa} />
              )}
            </div>
          </div>

          <TabsContent value="mesas" className="mt-0">
            <MesasList
              mesas={mesas}
              areas={areas}
              onUpdate={updateMesa}
              onDelete={deleteMesa}
              loading={loading}
            />
          </TabsContent>

          <TabsContent value="areas" className="mt-0">
            <AreasList
              areas={areas}
              mesas={mesas}
              onUpdate={updateArea}
              onDelete={deleteArea}
              loading={areasLoading}
            />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Mesas;
