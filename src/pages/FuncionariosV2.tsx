
import DashboardLayoutV2 from "@/components/dashboard/DashboardLayoutV2";
import { FuncionariosListV2 } from "@/components/funcionarios/FuncionariosListV2";
import { ProtectedRoute } from "@/components/ProtectedRoute";

const FuncionariosV2 = () => {
  return (
    <ProtectedRoute requiredPermissions={['employees_manage']}>
      <DashboardLayoutV2 title="Funcionários">
        <FuncionariosListV2 />
      </DashboardLayoutV2>
    </ProtectedRoute>
  );
};

export default FuncionariosV2;
