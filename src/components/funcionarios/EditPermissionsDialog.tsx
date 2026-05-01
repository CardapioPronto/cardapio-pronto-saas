import { useState, useEffect } from "react";
import { CheckedState } from "@radix-ui/react-checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { useEmployees } from "@/hooks/useEmployees";
import { EmployeeWithPermissions, PermissionType } from "@/types/employee";
import { PERMISSION_GROUPS, PermissionGroup } from "./permissions";

interface EditPermissionsDialogProps {
  employee: EmployeeWithPermissions | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

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

  const isChecked = (checked: CheckedState) => checked === true;

  const handlePermissionChange = (permission: PermissionType, checked: CheckedState) => {
    if (isChecked(checked)) {
      setSelectedPermissions(prev => [...prev, permission]);
    } else {
      setSelectedPermissions(prev => prev.filter(p => p !== permission));
    }
  };

  const handleGroupToggle = (group: PermissionGroup, checked: CheckedState) => {
    const groupValues = group.permissions.map(p => p.value);
    if (isChecked(checked)) {
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
          {PERMISSION_GROUPS.map((group, index) => (
            <div key={group.title}>
              {index > 0 && <Separator className="mb-4" />}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`group-${group.title}`}
                    checked={isGroupPartiallySelected(group) ? "indeterminate" : isGroupFullySelected(group)}
                    onCheckedChange={(checked) => handleGroupToggle(group, checked)}
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
                          handlePermissionChange(option.value, checked)
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
