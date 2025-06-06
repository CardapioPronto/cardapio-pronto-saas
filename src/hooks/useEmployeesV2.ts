
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useCurrentUserV2 } from "./useCurrentUserV2";
import { Employee, EmployeeWithPermissions, PermissionType } from "@/types/employee";
import { toast } from "sonner";

export const useEmployeesV2 = () => {
  const { user } = useCurrentUserV2();
  const [employees, setEmployees] = useState<EmployeeWithPermissions[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchEmployees = async () => {
    if (!user?.restaurant_id) {
      console.log('No restaurant_id found for user:', user?.id);
      return;
    }

    setLoading(true);
    try {
      console.log('Fetching employees for restaurant:', user.restaurant_id);
      
      // Buscar funcionários
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select('*')
        .eq('restaurant_id', user.restaurant_id)
        .order('created_at', { ascending: false });

      if (employeesError) throw employeesError;

      console.log('Employees found:', employeesData?.length || 0);

      // Buscar permissões para cada funcionário
      const employeesWithPermissions: EmployeeWithPermissions[] = [];
      
      for (const employee of employeesData || []) {
        const { data: permissionsData, error: permissionsError } = await supabase
          .from('employee_permissions')
          .select('permission')
          .eq('employee_id', employee.id);

        if (permissionsError) {
          console.error('Error fetching permissions for employee:', employee.id, permissionsError);
          // Continue mesmo com erro nas permissões
        }

        employeesWithPermissions.push({
          ...employee,
          permissions: permissionsData?.map(p => p.permission) || []
        });
      }

      setEmployees(employeesWithPermissions);
    } catch (error) {
      console.error('Erro ao buscar funcionários:', error);
      toast.error('Erro ao carregar funcionários');
    } finally {
      setLoading(false);
    }
  };

  const createEmployee = async (employeeData: {
    employee_name: string;
    employee_email: string;
    password: string;
    permissions?: PermissionType[];
  }) => {
    if (!user?.restaurant_id || !user?.id) {
      toast.error('Dados do usuário incompletos');
      return { success: false };
    }

    try {
      console.log('Creating employee:', {
        name: employeeData.employee_name,
        email: employeeData.employee_email,
        restaurant_id: user.restaurant_id
      });

      // Usar Edge Function para criar funcionário
      const { data: result, error } = await supabase.functions.invoke('create-employee', {
        body: {
          employee_name: employeeData.employee_name,
          employee_email: employeeData.employee_email,
          password: employeeData.password,
          restaurant_id: user.restaurant_id,
          created_by: user.id,
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
        const permissionsToInsert = permissions.map(permission => ({
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
    try {
      const { error } = await supabase
        .from('employees')
        .update({ is_active: isActive })
        .eq('id', employeeId);

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

  useEffect(() => {
    if (user?.restaurant_id) {
      fetchEmployees();
    }
  }, [user?.restaurant_id]);

  return {
    employees,
    loading,
    createEmployee,
    updateEmployeePermissions,
    toggleEmployeeActive,
    refetch: fetchEmployees
  };
};
