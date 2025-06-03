
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useCurrentUser } from "./useCurrentUser";
import { Employee, EmployeeWithPermissions, PermissionType } from "@/types/employee";
import { toast } from "sonner";

export const useEmployees = () => {
  const { user } = useCurrentUser();
  const [employees, setEmployees] = useState<EmployeeWithPermissions[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchEmployees = async () => {
    if (!user?.restaurant_id) return;

    setLoading(true);
    try {
      // Buscar funcionários
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select('*')
        .eq('restaurant_id', user.restaurant_id)
        .order('created_at', { ascending: false });

      if (employeesError) throw employeesError;

      // Buscar permissões para cada funcionário
      const employeesWithPermissions: EmployeeWithPermissions[] = [];
      
      for (const employee of employeesData || []) {
        const { data: permissionsData, error: permissionsError } = await supabase
          .from('employee_permissions')
          .select('permission')
          .eq('employee_id', employee.id);

        if (permissionsError) throw permissionsError;

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
    if (!user?.restaurant_id || !user?.id) return { success: false };

    try {
      // Criar usuário no auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: employeeData.employee_email,
        password: employeeData.password,
        email_confirm: true,
        user_metadata: {
          name: employeeData.employee_name,
          user_type: 'employee'
        }
      });

      if (authError) throw authError;

      if (!authData.user) throw new Error('Falha ao criar usuário');

      // Criar registro na tabela users
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: employeeData.employee_email,
          name: employeeData.employee_name,
          restaurant_id: user.restaurant_id,
          user_type: 'employee'
        });

      if (userError) throw userError;

      // Criar registro do funcionário
      const { data: employeeRecord, error: employeeError } = await supabase
        .from('employees')
        .insert({
          user_id: authData.user.id,
          restaurant_id: user.restaurant_id,
          employee_name: employeeData.employee_name,
          employee_email: employeeData.employee_email,
          created_by: user.id
        })
        .select()
        .single();

      if (employeeError) throw employeeError;

      // Criar permissões (padrão ou customizadas)
      if (employeeData.permissions && employeeData.permissions.length > 0) {
        const permissionsToInsert = employeeData.permissions.map(permission => ({
          employee_id: employeeRecord.id,
          permission,
          granted_by: user.id
        }));

        const { error: permissionsError } = await supabase
          .from('employee_permissions')
          .insert(permissionsToInsert);

        if (permissionsError) throw permissionsError;
      } else {
        // Usar função para criar permissões padrão
        const { error: defaultPermissionsError } = await supabase
          .rpc('create_default_employee_permissions', {
            employee_id_param: employeeRecord.id,
            granted_by_param: user.id
          });

        if (defaultPermissionsError) throw defaultPermissionsError;
      }

      toast.success('Funcionário criado com sucesso!');
      await fetchEmployees();
      return { success: true };
    } catch (error) {
      console.error('Erro ao criar funcionário:', error);
      toast.error('Erro ao criar funcionário');
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
