import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { useEmployees } from "@/hooks/useEmployees";
import { EmployeeWithPermissions, PermissionType } from "@/types/employee";

interface EditPermissionsDialogProps {
  employee: EmployeeWithPermissions | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PermissionGroup {
  title: string;
  permissions: { value: PermissionType; label: string; description: string }[];
}

const permissionGroups: PermissionGroup[] = [
  {
    title: "Geral",
    permissions: [
      { value: 'dashboard_view', label: 'Ver Dashboard', description: 'Visualizar o painel principal' },
      { value: 'subscription_view', label: 'Ver Assinatura', description: 'Visualizar informações da assinatura' },
      { value: 'pdv_access', label: 'Acesso ao PDV', description: 'Permite usar o sistema de PDV' },
    ],
  },
  {
    title: "Pedidos",
    permissions: [
      { value: 'orders_view', label: 'Ver Pedidos', description: 'Visualizar lista de pedidos' },
      { value: 'orders_manage', label: 'Gerenciar Pedidos', description: 'Criar, editar e cancelar pedidos' },
    ],
  },
  {
    title: "Produtos",
    permissions: [
      { value: 'products_view', label: 'Ver Produtos', description: 'Visualizar catálogo de produtos' },
      { value: 'products_manage', label: 'Gerenciar Produtos', description: 'Criar, editar e remover produtos' },
    ],
  },
  {
    title: "Sistema",
    permissions: [
      { value: 'reports_view', label: 'Ver Relatórios', description: 'Acessar relatórios e estatísticas' },
      { value: 'settings_view', label: 'Ver Configurações', description: 'Visualizar configurações do sistema' },
      { value: 'settings_manage', label: 'Gerenciar Configurações', description: 'Alterar configurações do sistema' },
      { value: 'employees_manage', label: 'Gerenciar Funcionários', description: 'Adicionar e gerenciar colaboradores' },
    ],
  },
  {
    title: "WhatsApp & Atendimento",
    permissions: [
      { value: 'whatsapp_manage', label: 'Acessar Módulo WhatsApp', description: 'Acesso geral ao módulo de atendimento' },
      { value: 'whatsapp_manage_instances', label: 'Gerenciar Instâncias', description: 'Criar, conectar e apagar instâncias WhatsApp' },
      { value: 'whatsapp_take_conversations', label: 'Assumir Conversas', description: 'Pode assumir atendimento de conversas' },
      { value: 'whatsapp_reply_as_human', label: 'Responder como Humano', description: 'Enviar mensagens como atendente humano' },
      { value: 'whatsapp_view_all_conversations', label: 'Ver Todas as Conversas', description: 'Visualizar conversas de todos os atendentes' },
      { value: 'whatsapp_configure_automation', label: 'Configurar Automação', description: 'Alterar configurações de IA e automação' },
    ],
  },
];

export const EditPermissionsDialog = ({ employee, open, onOpenChange }: EditPermissionsDialogProps) => {
  const { updateEmployeePermissions } = useEmployees();
  const [loading, setLoading] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<PermissionType[]>([]);

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

  const handleGroupToggle = (group: PermissionGroup, checked: boolean) => {
    const groupValues = group.permissions.map(p => p.value);
    if (checked) {
      setSelectedPermissions(prev => [...new Set([...prev, ...groupValues])]);
    } else {
      setSelectedPermissions(prev => prev.filter(p => !groupValues.includes(p)));
    }
  };

  const isGroupFullySelected = (group: PermissionGroup) => {
    return group.permissions.every(p => selectedPermissions.includes(p.value));
  };

  const isGroupPartiallySelected = (group: PermissionGroup) => {
    return group.permissions.some(p => selectedPermissions.includes(p.value)) && !isGroupFullySelected(group);
  };

  if (!employee) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerenciar Permissões</DialogTitle>
          <DialogDescription>
            Defina quais funcionalidades <strong>{employee.employee_name}</strong> pode acessar
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {permissionGroups.map((group, index) => (
            <div key={group.title}>
              {index > 0 && <Separator className="mb-4" />}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`group-${group.title}`}
                    checked={isGroupFullySelected(group)}
                    ref={(el) => {
                      if (el) {
                        (el as any).indeterminate = isGroupPartiallySelected(group);
                      }
                    }}
                    onCheckedChange={(checked) => handleGroupToggle(group, checked as boolean)}
                  />
                  <Label htmlFor={`group-${group.title}`} className="font-semibold text-sm">
                    {group.title}
                  </Label>
                </div>
                <div className="ml-6 space-y-3">
                  {group.permissions.map((option) => (
                    <div key={option.value} className="flex items-start space-x-3">
                      <Checkbox
                        id={option.value}
                        checked={selectedPermissions.includes(option.value)}
                        onCheckedChange={(checked) => 
                          handlePermissionChange(option.value, checked as boolean)
                        }
                        className="mt-0.5"
                      />
                      <div className="flex-1">
                        <Label htmlFor={option.value} className="font-medium text-sm">
                          {option.label}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {option.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}

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
