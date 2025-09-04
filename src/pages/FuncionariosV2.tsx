
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { FuncionariosList } from "@/components/funcionarios/FuncionariosList";
import { ProtectedRoute } from "@/components/ProtectedRoute";

const FuncionariosV2 = () => {
  return (
    <ProtectedRoute requiredPermissions={['employees_manage']}>
      <DashboardLayout title="Funcionários">
        <FuncionariosList />
      </DashboardLayout>
    </ProtectedRoute>
  );
};

export default FuncionariosV2;
