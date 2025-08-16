import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AddAreaDialog } from "@/components/areas/AddAreaDialog";
import { AreasList } from "@/components/areas/AreasList";
import { useAreas } from "@/hooks/useAreas";
import { useCurrentUser } from "@/hooks/useCurrentUser";

const Areas = () => {
  const { user } = useCurrentUser();
  const restaurantId = user?.restaurant_id || "";
  
  const {
    areas,
    loading,
    createArea,
    updateArea,
    deleteArea
  } = useAreas(restaurantId);

  return (
    <DashboardLayout title="Gerenciar Áreas">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Áreas do Restaurante</CardTitle>
                <CardDescription>
                  Organize as mesas do seu restaurante criando áreas personalizadas
                </CardDescription>
              </div>
              <AddAreaDialog onAdd={createArea} />
            </div>
          </CardHeader>
        </Card>

        <AreasList
          areas={areas}
          onUpdate={updateArea}
          onDelete={deleteArea}
          loading={loading}
        />
      </div>
    </DashboardLayout>
  );
};

export default Areas;