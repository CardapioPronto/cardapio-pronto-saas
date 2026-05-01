import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Mail, ShieldCheck, UserRound } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useEmployees } from "@/hooks/useEmployees";
import { EmployeeWithPermissions } from "@/types/employee";
import { getEmployeeInitials, PERMISSION_LABELS, USER_TYPE_LABELS } from "./permissions";

interface FuncionarioDetailsDialogProps {
  employee: EmployeeWithPermissions | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEditPermissions: (employee: EmployeeWithPermissions) => void;
}

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export const FuncionarioDetailsDialog = ({
  employee,
  open,
  onOpenChange,
  onEditPermissions,
}: FuncionarioDetailsDialogProps) => {
  const { toggleEmployeeActive, updateEmployeeProfile } = useEmployees();
  const [employeeName, setEmployeeName] = useState("");
  const [saving, setSaving] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);

  useEffect(() => {
    setEmployeeName(employee?.employee_name ?? "");
  }, [employee]);

  const hasNameChanged = useMemo(
    () => employeeName.trim() !== (employee?.employee_name ?? ""),
    [employee?.employee_name, employeeName]
  );

  if (!employee) return null;

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const result = await updateEmployeeProfile(employee, employeeName);
      if (result.success) {
        onOpenChange(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (checked: boolean) => {
    setStatusSaving(true);
    try {
      await toggleEmployeeActive(employee.id, checked);
    } finally {
      setStatusSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px]">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <Avatar className="h-12 w-12 border">
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {getEmployeeInitials(employee.employee_name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle>{employee.employee_name}</DialogTitle>
              <DialogDescription>{employee.employee_email}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-md border p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <UserRound className="h-3.5 w-3.5" />
                Cargo
              </div>
              <p className="mt-1 font-medium">{USER_TYPE_LABELS[employee.user_type]}</p>
            </div>
            <div className="rounded-md border p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5" />
                Permissoes
              </div>
              <p className="mt-1 font-medium">{employee.permissions.length}</p>
            </div>
            <div className="rounded-md border p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5" />
                Criado em
              </div>
              <p className="mt-1 font-medium">{dateFormatter.format(new Date(employee.created_at))}</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="employee-detail-name">Nome</Label>
              <Input
                id="employee-detail-name"
                value={employeeName}
                onChange={(event) => setEmployeeName(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="employee-detail-email">Email de acesso</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="employee-detail-email" value={employee.employee_email} readOnly className="pl-9 bg-muted/40" />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="text-sm font-medium">Acesso ao sistema</p>
              <p className="text-xs text-muted-foreground">
                Funcionarios inativos nao conseguem acessar as areas protegidas.
              </p>
            </div>
            <Switch checked={employee.is_active} disabled={statusSaving} onCheckedChange={handleStatusChange} />
          </div>

          <Separator />

          <div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Permissoes atuais</p>
                <p className="text-xs text-muted-foreground">Resumo dos acessos liberados para este colaborador.</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => onEditPermissions(employee)}>
                Editar permissoes
              </Button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {employee.permissions.length > 0 ? (
                employee.permissions.map((permission) => (
                  <Badge key={permission} variant="secondary">
                    {PERMISSION_LABELS[permission]}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">Nenhuma permissao liberada.</span>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button type="button" onClick={handleSaveProfile} disabled={saving || !hasNameChanged}>
            {saving ? "Salvando..." : "Salvar dados"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
