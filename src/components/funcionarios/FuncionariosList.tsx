import { useMemo, useState } from "react";
import { Eye, KeyRound, Plus, Search, UserRound } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEmployees } from "@/hooks/useEmployees";
import { AddFuncionarioDialog } from "./AddFuncionarioDialog";
import { EditPermissionsDialog } from "./EditPermissionsDialog";
import { FuncionarioDetailsDialog } from "./FuncionarioDetailsDialog";
import { EmployeeWithPermissions } from "@/types/employee";
import { getEmployeeInitials, PERMISSION_LABELS, USER_TYPE_LABELS } from "./permissions";

export const FuncionariosList = () => {
  const { employees, loading, toggleEmployeeActive } = useEmployees();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [detailsEmployeeId, setDetailsEmployeeId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filteredEmployees = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return employees;

    return employees.filter((employee) => {
      const searchable = `${employee.employee_name} ${employee.employee_email} ${employee.user_type}`.toLowerCase();
      return searchable.includes(normalizedSearch);
    });
  }, [employees, search]);

  const activeEmployees = employees.filter((employee) => employee.is_active).length;
  const managers = employees.filter((employee) => employee.user_type === "manager").length;
  const editingEmployee = employees.find((employee) => employee.id === editingEmployeeId) ?? null;
  const detailsEmployee = employees.find((employee) => employee.id === detailsEmployeeId) ?? null;

  const handleEditPermissions = (employee: EmployeeWithPermissions) => {
    setDetailsEmployeeId(null);
    setEditingEmployeeId(employee.id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-10">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Funcionarios</h2>
          <p className="text-muted-foreground">Controle acessos, cargos e status da equipe.</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Adicionar funcionario
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-md border bg-background p-4">
          <p className="text-sm text-muted-foreground">Total cadastrado</p>
          <p className="mt-1 text-2xl font-semibold">{employees.length}</p>
        </div>
        <div className="rounded-md border bg-background p-4">
          <p className="text-sm text-muted-foreground">Acessos ativos</p>
          <p className="mt-1 text-2xl font-semibold">{activeEmployees}</p>
        </div>
        <div className="rounded-md border bg-background p-4">
          <p className="text-sm text-muted-foreground">Gerentes</p>
          <p className="mt-1 text-2xl font-semibold">{managers}</p>
        </div>
      </div>

      <div className="flex max-w-md items-center gap-2">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nome, email ou cargo"
            className="pl-9"
          />
        </div>
      </div>

      {employees.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <UserRound className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-medium">Nenhum funcionario cadastrado</h3>
            <p className="mb-4 max-w-md text-muted-foreground">
              Adicione sua equipe para vender no PDV, atender pedidos e acessar somente as areas necessarias.
            </p>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar primeiro funcionario
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[260px]">Funcionario</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Permissoes</TableHead>
                <TableHead className="w-[140px] text-right">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border">
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {getEmployeeInitials(employee.employee_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{employee.employee_name}</p>
                        <p className="truncate text-xs text-muted-foreground">{employee.employee_email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{USER_TYPE_LABELS[employee.user_type]}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={employee.is_active}
                        onCheckedChange={(checked) => toggleEmployeeActive(employee.id, checked)}
                        aria-label={`Alterar status de ${employee.employee_name}`}
                      />
                      <span className="text-sm text-muted-foreground">{employee.is_active ? "Ativo" : "Inativo"}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex max-w-[360px] flex-wrap gap-1.5">
                      {employee.permissions.slice(0, 3).map((permission) => (
                        <Badge key={permission} variant="secondary" className="font-normal">
                          {PERMISSION_LABELS[permission]}
                        </Badge>
                      ))}
                      {employee.permissions.length > 3 && (
                        <Badge variant="outline" className="font-normal">
                          +{employee.permissions.length - 3}
                        </Badge>
                      )}
                      {employee.permissions.length === 0 && (
                        <span className="text-sm text-muted-foreground">Sem permissoes</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="icon" onClick={() => setDetailsEmployeeId(employee.id)} title="Ver detalhes">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => handleEditPermissions(employee)} title="Editar permissoes">
                        <KeyRound className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredEmployees.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Nenhum funcionario encontrado para a busca atual.
            </div>
          )}
        </div>
      )}

      <AddFuncionarioDialog open={showAddDialog} onOpenChange={setShowAddDialog} />

      <FuncionarioDetailsDialog
        employee={detailsEmployee}
        open={!!detailsEmployeeId}
        onOpenChange={(open) => !open && setDetailsEmployeeId(null)}
        onEditPermissions={handleEditPermissions}
      />

      <EditPermissionsDialog
        employee={editingEmployee}
        open={!!editingEmployeeId}
        onOpenChange={(open) => !open && setEditingEmployeeId(null)}
      />
    </div>
  );
};
