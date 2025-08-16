import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AddMesaDialog } from "@/components/mesas/AddMesaDialog";
import { MesasList } from "@/components/mesas/MesasList";
import { useMesas } from "@/hooks/useMesas";
import { useAreas } from "@/hooks/useAreas";
import { useCurrentUser } from "@/hooks/useCurrentUser";

const Mesas = () => {
  const { user } = useCurrentUser();
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
    loading: areasLoading
  } = useAreas(restaurantId);

  const loading = mesasLoading || areasLoading;

  return (
    <DashboardLayout title="Gerenciar Mesas">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Mesas do Restaurante</CardTitle>
                <CardDescription>
                  Configure e gerencie todas as mesas do seu estabelecimento
                </CardDescription>
              </div>
              <AddMesaDialog areas={areas} onAdd={createMesa} />
            </div>
          </CardHeader>
        </Card>

        <MesasList
          mesas={mesas}
          areas={areas}
          onUpdate={updateMesa}
          onDelete={deleteMesa}
          loading={loading}
        />
      </div>
    </DashboardLayout>
  );
};

export default Mesas;