
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useEmployees } from "@/hooks/useEmployees";
import { EmployeeWithPermissions, PermissionType } from "@/types/employee";

interface EditPermissionsDialogProps {
  employee: EmployeeWithPermissions | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EditPermissionsDialog = ({ employee, open, onOpenChange }: EditPermissionsDialogProps) => {
  const { updateEmployeePermissions } = useEmployees();
  const [loading, setLoading] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<PermissionType[]>([]);

  const permissionOptions = [
    { value: 'pdv_access' as const, label: 'Acesso ao PDV', description: 'Permite usar o sistema de PDV' },
    { value: 'orders_view' as const, label: 'Ver Pedidos', description: 'Visualizar lista de pedidos' },
    { value: 'orders_manage' as const, label: 'Gerenciar Pedidos', description: 'Criar, editar e cancelar pedidos' },
    { value: 'products_view' as const, label: 'Ver Produtos', description: 'Visualizar catálogo de produtos' },
    { value: 'products_manage' as const, label: 'Gerenciar Produtos', description: 'Criar, editar e remover produtos' },
    { value: 'reports_view' as const, label: 'Ver Relatórios', description: 'Acessar relatórios e estatísticas' },
    { value: 'settings_view' as const, label: 'Ver Configurações', description: 'Visualizar configurações do sistema' },
    { value: 'settings_manage' as const, label: 'Gerenciar Configurações', description: 'Alterar configurações do sistema' }
  ];

  useEffect(() => {
    if (employee) {
      setSelectedPermissions(employee.permissions);
    }
  }, [employee]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;

    setLoading(true);
    try {
      const result = await updateEmployeePermissions(employee.id, selectedPermissions);
      if (result.success) {
        onOpenChange(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionChange = (permission: PermissionType, checked: boolean) => {
    if (checked) {
      setSelectedPermissions(prev => [...prev, permission]);
    } else {
      setSelectedPermissions(prev => prev.filter(p => p !== permission));
    }
  };

  if (!employee) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Gerenciar Permissões</DialogTitle>
          <DialogDescription>
            Defina quais funcionalidades {employee.employee_name} pode acessar
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            {permissionOptions.map((option) => (
              <div key={option.value} className="flex items-start space-x-3">
                <Checkbox
                  id={option.value}
                  checked={selectedPermissions.includes(option.value)}
                  onCheckedChange={(checked) => 
                    handlePermissionChange(option.value, checked as boolean)
                  }
                  className="mt-1"
                />
                <div className="flex-1">
                  <Label htmlFor={option.value} className="font-medium">
                    {option.label}
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {option.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar Permissões'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
