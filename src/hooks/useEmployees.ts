
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "./useCurrentUser";
import { Database } from "@/integrations/supabase/types";
import { Employee, EmployeePermission, EmployeeWithPermissions, PermissionType } from "@/types/employee";
import { toast } from "sonner";

type EmployeeWithPermissionRows = Employee & {
  employee_permissions: Pick<EmployeePermission, "permission">[] | null;
};

type CreateEmployeeResult = {
  success?: boolean;
  error?: string;
};

type EmployeePermissionInsert = Database["public"]["Tables"]["employee_permissions"]["Insert"];

export const useEmployees = () => {
  const { user } = useCurrentUser();
  const [employees, setEmployees] = useState<EmployeeWithPermissions[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchEmployees = useCallback(async () => {
    if (!user?.restaurant_id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*, employee_permissions(permission)')
        .eq('restaurant_id', user.restaurant_id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const employeesData = (data ?? []) as EmployeeWithPermissionRows[];
      const employeesWithPermissions = employeesData.map(({ employee_permissions, ...employee }) => ({
        ...employee,
        permissions: employee_permissions?.map((permissionRow) => permissionRow.permission) ?? [],
      }));

      setEmployees(employeesWithPermissions);
    } catch (error) {
      console.error('Erro ao buscar funcionários:', error);
      toast.error('Erro ao carregar funcionários');
    } finally {
      setLoading(false);
    }
  }, [user?.restaurant_id]);

  const createEmployee = async (employeeData: {
    employee_name: string;
    employee_email: string;
    password: string;
    permissions?: PermissionType[];
    user_type?: 'employee' | 'manager';
  }) => {
    if (!user?.restaurant_id || !user?.id) return { success: false };

    try {
      // Usar Edge Function para criar funcionário
      const { data: result, error } = await supabase.functions.invoke<CreateEmployeeResult>('create-employee', {
        body: {
          employee_name: employeeData.employee_name,
          employee_email: employeeData.employee_email,
          password: employeeData.password,
          restaurant_id: user.restaurant_id,
          created_by: user.id,
          user_type: employeeData.user_type || 'employee',
          permissions: employeeData.permissions || [
            'pdv_access',
            'orders_view', 
            'orders_manage',
            'products_view'
          ]
        }
      });

      if (error) {
        console.error('Erro ao criar funcionário:', error);
        throw error;
      }

      if (!result?.success) {
        throw new Error(result?.error || 'Erro desconhecido ao criar funcionário');
      }

      toast.success('Funcionário criado com sucesso!');
      await fetchEmployees();
      return { success: true };
    } catch (error) {
      console.error('Erro ao criar funcionário:', error);
      toast.error('Erro ao criar funcionário. Verifique se o email já não está em uso.');
      return { success: false };
    }
  };

  const updateEmployeePermissions = async (employeeId: string, permissions: PermissionType[]) => {
    if (!user?.id) return { success: false };

    try {
      // Remover permissões existentes
      const { error: deleteError } = await supabase
        .from('employee_permissions')
        .delete()
        .eq('employee_id', employeeId);

      if (deleteError) throw deleteError;

      // Adicionar novas permissões
      if (permissions.length > 0) {
        const permissionsToInsert: EmployeePermissionInsert[] = permissions.map((permission) => ({
          employee_id: employeeId,
          permission,
          granted_by: user.id
        }));

        const { error: insertError } = await supabase
          .from('employee_permissions')
          .insert(permissionsToInsert);

        if (insertError) throw insertError;
      }

      toast.success('Permissões atualizadas com sucesso!');
      await fetchEmployees();
      return { success: true };
    } catch (error) {
      console.error('Erro ao atualizar permissões:', error);
      toast.error('Erro ao atualizar permissões');
      return { success: false };
    }
  };

  const toggleEmployeeActive = async (employeeId: string, isActive: boolean) => {
    if (!user?.restaurant_id) return { success: false };

    try {
      const { error } = await supabase
        .from('employees')
        .update({ is_active: isActive })
        .eq('id', employeeId)
        .eq('restaurant_id', user.restaurant_id);

      if (error) throw error;

      toast.success(`Funcionário ${isActive ? 'ativado' : 'desativado'} com sucesso!`);
      await fetchEmployees();
      return { success: true };
    } catch (error) {
      console.error('Erro ao alterar status do funcionário:', error);
      toast.error('Erro ao alterar status do funcionário');
      return { success: false };
    }
  };

  const updateEmployeeProfile = async (employee: EmployeeWithPermissions, employeeName: string) => {
    if (!user?.restaurant_id) return { success: false };

    const trimmedName = employeeName.trim();
    if (!trimmedName) {
      toast.error('Informe o nome do funcionário');
      return { success: false };
    }

    try {
      const { error: employeeError } = await supabase
        .from('employees')
        .update({ employee_name: trimmedName })
        .eq('id', employee.id)
        .eq('restaurant_id', user.restaurant_id);

      if (employeeError) throw employeeError;

      const { error: userError } = await supabase
        .from('users')
        .update({ name: trimmedName })
        .eq('id', employee.user_id)
        .eq('restaurant_id', user.restaurant_id);

      if (userError) throw userError;

      toast.success('Dados do funcionário atualizados com sucesso!');
      await fetchEmployees();
      return { success: true };
    } catch (error) {
      console.error('Erro ao atualizar funcionário:', error);
      toast.error('Erro ao atualizar dados do funcionário');
      return { success: false };
    }
  };

  useEffect(() => {
    if (user?.restaurant_id) {
      void fetchEmployees();
    }
  }, [fetchEmployees, user?.restaurant_id]);

  return {
    employees,
    loading,
    createEmployee,
    updateEmployeePermissions,
    toggleEmployeeActive,
    updateEmployeeProfile,
    refetch: fetchEmployees
  };
};
