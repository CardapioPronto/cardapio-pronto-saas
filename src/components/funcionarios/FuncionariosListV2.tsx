
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Settings, User } from "lucide-react";
import { useEmployees } from "@/hooks/useEmployees";
import { AddFuncionarioDialog } from "./AddFuncionarioDialog";
import { EditPermissionsDialog } from "./EditPermissionsDialog";
import { EmployeeWithPermissions } from "@/types/employee";

export const FuncionariosListV2 = () => {
  const { employees, loading, toggleEmployeeActive } = useEmployees();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeWithPermissions | null>(null);

  const permissionLabels = {
    pdv_access: 'PDV',
    orders_view: 'Ver Pedidos',
    orders_manage: 'Gerenciar Pedidos',
    products_view: 'Ver Produtos',
    products_manage: 'Gerenciar Produtos',
    reports_view: 'Ver Relatórios',
    settings_view: 'Ver Configurações',
    settings_manage: 'Gerenciar Configurações',
    employees_manage: 'Gerenciar Funcionários'
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Funcionários</h2>
          <p className="text-muted-foreground">
            Gerencie os funcionários e suas permissões
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Adicionar Funcionário
        </Button>
      </div>

      <div className="grid gap-4">
        {employees.map((employee) => (
          <Card key={employee.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{employee.employee_name}</CardTitle>
                    <CardDescription>{employee.employee_email}</CardDescription>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={employee.is_active ? "default" : "secondary"}>
                    {employee.is_active ? "Ativo" : "Inativo"}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingEmployee(employee)}
                  >
                    <Settings className="h-4 w-4 mr-1" />
                    Permissões
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Permissões:</h4>
                  <div className="flex flex-wrap gap-2">
                    {employee.permissions.length > 0 ? (
                      employee.permissions.map((permission) => (
                        <Badge key={permission} variant="outline" className="text-xs">
                          {permissionLabels[permission] || permission}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        Nenhuma permissão atribuída
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-sm text-muted-foreground">
                    Funcionário ativo
                  </span>
                  <Switch
                    checked={employee.is_active}
                    onCheckedChange={(checked) => 
                      toggleEmployeeActive(employee.id, checked)
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {employees.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <User className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum funcionário cadastrado</h3>
              <p className="text-muted-foreground text-center mb-4">
                Adicione funcionários para sua equipe e defina suas permissões
              </p>
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Primeiro Funcionário
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <AddFuncionarioDialog 
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
      />

      <EditPermissionsDialog
        employee={editingEmployee}
        open={!!editingEmployee}
        onOpenChange={(open) => !open && setEditingEmployee(null)}
      />
    </div>
  );
};
