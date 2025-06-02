
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { FuncionariosList } from "@/components/funcionarios/FuncionariosList";
import { usePermissions } from "@/hooks/usePermissions";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";

const Funcionarios = () => {
  const { hasPermission, loading } = usePermissions();

  if (loading) {
    return (
      <DashboardLayout title="Funcionários">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!hasPermission('employees_manage')) {
    return (
      <DashboardLayout title="Funcionários">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ShieldAlert className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Acesso Negado</h3>
            <p className="text-muted-foreground text-center">
              Você não possui permissão para gerenciar funcionários.
            </p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Funcionários">
      <FuncionariosList />
    </DashboardLayout>
  );
};

export default Funcionarios;
