
import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useEmployees } from "@/hooks/useEmployees";
import { EmployeeRole, PermissionType, ROLE_PRESETS } from "@/types/employee";
import { PERMISSION_GROUPS } from "./permissions";

interface AddFuncionarioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddFuncionarioDialog = ({ open, onOpenChange }: AddFuncionarioDialogProps) => {
  const { createEmployee } = useEmployees();
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<EmployeeRole>("cashier");
  const [formData, setFormData] = useState({
    employee_name: "",
    employee_email: "",
    password: "",
    permissions: (ROLE_PRESETS.find((p) => p.id === "cashier")?.permissions ?? []) as PermissionType[],
  });

  const currentPreset = useMemo(
    () => ROLE_PRESETS.find((p) => p.id === selectedRole) ?? ROLE_PRESETS[0],
    [selectedRole]
  );

  const handleRoleChange = (role: EmployeeRole) => {
    setSelectedRole(role);
    const preset = ROLE_PRESETS.find((p) => p.id === role);
    if (preset && role !== "custom") {
      setFormData((prev) => ({ ...prev, permissions: [...preset.permissions] }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await createEmployee({
        employee_name: formData.employee_name,
        employee_email: formData.employee_email,
        password: formData.password,
        permissions: formData.permissions,
        user_type: currentPreset.user_type,
      });

      if (result.success) {
        setSelectedRole("cashier");
        setFormData({
          employee_name: "",
          employee_email: "",
          password: "",
          permissions: ROLE_PRESETS.find((p) => p.id === "cashier")?.permissions ?? [],
        });
        onOpenChange(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionChange = (permission: PermissionType, checked: boolean) => {
    setSelectedRole("custom");
    setFormData((prev) => ({
      ...prev,
      permissions: checked
        ? [...prev.permissions, permission]
        : prev.permissions.filter((p) => p !== permission),
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Adicionar Funcionário ou Gerente</DialogTitle>
          <DialogDescription>
            Escolha um cargo predefinido ou personalize as permissões individualmente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <ScrollArea className="flex-1 pr-4 -mr-4">
            <div className="grid gap-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
              <Label htmlFor="employee_name">Nome do Funcionário</Label>
              <Input
                id="employee_name"
                value={formData.employee_name}
                onChange={(e) => setFormData((prev) => ({ ...prev, employee_name: e.target.value }))}
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
                onChange={(e) => setFormData((prev) => ({ ...prev, employee_email: e.target.value }))}
                placeholder="email@exemplo.com"
                required
              />
              </div>
            </div>

            <div>
              <Label htmlFor="password">Senha Temporária</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                placeholder="Obrigatória apenas se o e-mail for novo (mínimo 8 caracteres)"
                minLength={8}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Se o e-mail já possui conta no Pubfy, a senha é ignorada.
              </p>
            </div>

            <Separator />

            <div>
              <Label>Cargo</Label>
              <Select value={selectedRole} onValueChange={(v) => handleRoleChange(v as EmployeeRole)}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_PRESETS.map((preset) => (
                    <SelectItem key={preset.id} value={preset.id}>
                      <div className="flex items-center gap-2">
                        <span>{preset.label}</span>
                        {preset.user_type === "manager" && (
                          <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700 text-xs">
                            Gerente
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1.5">{currentPreset.description}</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Permissões {selectedRole === "custom" && <span className="text-xs text-muted-foreground">(personalizado)</span>}</Label>
                <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
                  {formData.permissions.length} selecionada(s)
                </Badge>
              </div>
              <div className="space-y-4 rounded-md border p-3 bg-muted/30">
                {PERMISSION_GROUPS.map((group) => (
                  <div key={group.title}>
                    <div className="mb-2">
                      <p className="text-sm font-semibold">{group.title}</p>
                      <p className="text-xs text-muted-foreground">{group.description}</p>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-2 pl-1">
                      {group.permissions.map((option) => (
                        <div key={option.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={option.value}
                            checked={formData.permissions.includes(option.value)}
                            onCheckedChange={(checked) =>
                              handlePermissionChange(option.value, checked as boolean)
                            }
                          />
                          <Label htmlFor={option.value} className="text-sm font-normal cursor-pointer">
                            {option.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Cargos pré-definidos aplicam permissões automaticamente. Marcar/desmarcar manualmente troca para "Personalizado".
              </p>
            </div>
            </div>
          </ScrollArea>

          <DialogFooter className="mt-4 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Criando..." : `Criar ${currentPreset.user_type === "manager" ? "Gerente" : "Funcionário"}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
