
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useEmployees } from "@/hooks/useEmployees";
import { PermissionType } from "@/types/employee";

interface AddFuncionarioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddFuncionarioDialog = ({ open, onOpenChange }: AddFuncionarioDialogProps) => {
  const { createEmployee } = useEmployees();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    employee_name: '',
    employee_email: '',
    password: '',
    permissions: [] as PermissionType[]
  });

  const permissionOptions = [
    { value: 'pdv_access' as const, label: 'Acesso ao PDV' },
    { value: 'orders_view' as const, label: 'Ver Pedidos' },
    { value: 'orders_manage' as const, label: 'Gerenciar Pedidos' },
    { value: 'products_view' as const, label: 'Ver Produtos' },
    { value: 'products_manage' as const, label: 'Gerenciar Produtos' },
    { value: 'reports_view' as const, label: 'Ver Relatórios' },
    { value: 'settings_view' as const, label: 'Ver Configurações' },
    { value: 'settings_manage' as const, label: 'Gerenciar Configurações' }
  ];

  const defaultPermissions: PermissionType[] = [
    'pdv_access',
    'orders_view',
    'orders_manage',
    'products_view'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const permissionsToUse = formData.permissions.length > 0 
        ? formData.permissions 
        : defaultPermissions;

      const result = await createEmployee({
        ...formData,
        permissions: permissionsToUse
      });

      if (result.success) {
        setFormData({
          employee_name: '',
          employee_email: '',
          password: '',
          permissions: []
        });
        onOpenChange(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionChange = (permission: PermissionType, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        permissions: [...prev.permissions, permission]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        permissions: prev.permissions.filter(p => p !== permission)
      }));
    }
  };

  const setDefaultPermissions = () => {
    setFormData(prev => ({
      ...prev,
      permissions: defaultPermissions
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Adicionar Funcionário</DialogTitle>
          <DialogDescription>
            Crie uma conta para um novo funcionário e defina suas permissões
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4">
            <div>
              <Label htmlFor="employee_name">Nome do Funcionário</Label>
              <Input
                id="employee_name"
                value={formData.employee_name}
                onChange={(e) => setFormData(prev => ({ ...prev, employee_name: e.target.value }))}
                placeholder="Nome completo"
                required
              />
            </div>

            <div>
              <Label htmlFor="employee_email">Email</Label>
              <Input
                id="employee_email"
                type="email"
                value={formData.employee_email}
                onChange={(e) => setFormData(prev => ({ ...prev, employee_email: e.target.value }))}
                placeholder="email@exemplo.com"
                required
              />
            </div>

            <div>
              <Label htmlFor="password">Senha Temporária</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Senha para acesso inicial"
                required
                minLength={6}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <Label>Permissões</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={setDefaultPermissions}
                >
                  Usar Padrão (Salão/Caixa)
                </Button>
              </div>
              <div className="space-y-3">
                {permissionOptions.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={option.value}
                      checked={formData.permissions.includes(option.value)}
                      onCheckedChange={(checked) => 
                        handlePermissionChange(option.value, checked as boolean)
                      }
                    />
                    <Label htmlFor={option.value}>{option.label}</Label>
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Se nenhuma permissão for selecionada, serão aplicadas as permissões padrão para funcionários de salão/caixa.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Criando...' : 'Criar Funcionário'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
