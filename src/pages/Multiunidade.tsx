import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { endOfDay, format, startOfDay, subDays } from "date-fns";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Loader2,
  Network,
  Plus,
  RefreshCw,
  Save,
  ShoppingBasket,
  Store,
  TrendingUp,
  UsersRound,
  Wallet,
} from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useRestaurantAccess } from "@/hooks/useRestaurantAccess";
import { usePermissionsV2 } from "@/hooks/usePermissionsV2";
import {
  applyRestaurantGroupStaffAccess,
  createRestaurantUnit,
  getRestaurantGroupReadiness,
  getRestaurantGroupStaff,
  getMultiunitConsolidatedReport,
  setRestaurantGroupMenuMatrix,
  syncRestaurantGroupMenu,
} from "@/services/multiunitService";
import type {
  MultiunitConsolidatedReport,
  MultiunitReadiness,
  MultiunitReadinessStatus,
  MultiunitStaffMember,
  RestaurantAccess,
} from "@/types/multiunit";
import { toast } from "sonner";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const number = new Intl.NumberFormat("pt-BR");

const accessLabel: Record<RestaurantAccess["access_type"], string> = {
  owner: "Dono",
  manager: "Gerente",
  employee: "Equipe",
  viewer: "Leitura",
};

const readinessLabel: Record<MultiunitReadinessStatus, string> = {
  ready: "Pronta",
  attention: "Atenção",
  critical: "Crítica",
};

const readinessBadgeClassName: Record<MultiunitReadinessStatus, string> = {
  ready: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50",
  attention: "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50",
  critical: "border-red-200 bg-red-50 text-red-700 hover:bg-red-50",
};

const uniqueGroups = (restaurants: RestaurantAccess[]) => {
  const map = new Map<string, { id: string; name: string }>();
  restaurants.forEach((restaurant) => {
    if (restaurant.group_id) {
      map.set(restaurant.group_id, {
        id: restaurant.group_id,
        name: restaurant.group_name || "Rede Pubfy",
      });
    }
  });
  return Array.from(map.values());
};

type UnitFormState = {
  name: string;
  phone: string;
  address: string;
  cnpj: string;
  category: string;
  email: string;
};

const emptyUnitForm: UnitFormState = {
  name: "",
  phone: "",
  address: "",
  cnpj: "",
  category: "",
  email: "",
};

const Multiunidade = () => {
  const {
    restaurants,
    activeRestaurantId,
    loading: accessLoading,
    refresh: refreshAccess,
    switchRestaurant,
  } = useRestaurantAccess();
  const { hasAnyPermission, isSuperAdmin } = usePermissionsV2();
  const canViewFinancials = hasAnyPermission(["orders_metrics_view", "reports_view"]);
  const [dateFrom, setDateFrom] = useState(() => subDays(new Date(), 29));
  const [dateTo, setDateTo] = useState(() => new Date());
  const [selectedRestaurantIds, setSelectedRestaurantIds] = useState<string[]>([]);
  const [report, setReport] = useState<MultiunitConsolidatedReport | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [savingMatrix, setSavingMatrix] = useState(false);
  const [creatingUnit, setCreatingUnit] = useState(false);
  const [unitDialogOpen, setUnitDialogOpen] = useState(false);
  const [unitForm, setUnitForm] = useState<UnitFormState>(emptyUnitForm);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [syncingMenu, setSyncingMenu] = useState(false);
  const [syncTargetRestaurantIds, setSyncTargetRestaurantIds] = useState<string[]>([]);
  const [overwriteExistingMenu, setOverwriteExistingMenu] = useState(true);
  const [staffDialogOpen, setStaffDialogOpen] = useState(false);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [staffMembers, setStaffMembers] = useState<MultiunitStaffMember[]>([]);
  const [selectedStaffEmployeeId, setSelectedStaffEmployeeId] = useState("");
  const [staffTargetRestaurantIds, setStaffTargetRestaurantIds] = useState<string[]>([]);
  const [applyingStaffAccess, setApplyingStaffAccess] = useState(false);
  const [readiness, setReadiness] = useState<MultiunitReadiness | null>(null);
  const [loadingReadiness, setLoadingReadiness] = useState(false);
  const [readinessError, setReadinessError] = useState<string | null>(null);
  const groups = useMemo(() => uniqueGroups(restaurants), [restaurants]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const selectedGroup = groups.find((group) => group.id === selectedGroupId) ?? groups[0] ?? null;
  const groupRestaurants = useMemo(
    () => restaurants.filter((restaurant) => restaurant.group_id === selectedGroup?.id),
    [restaurants, selectedGroup?.id],
  );
  const currentMaster = groupRestaurants.find((restaurant) => restaurant.is_group_master) ?? groupRestaurants[0] ?? null;
  const currentMasterRestaurantId = currentMaster?.restaurant_id ?? "";
  const currentMasterMenuSyncEnabled = currentMaster?.menu_sync_enabled ?? false;
  const [matrixRestaurantId, setMatrixRestaurantId] = useState("");
  const [menuSyncEnabled, setMenuSyncEnabled] = useState(false);
  const syncableRestaurants = groupRestaurants.filter(
    (restaurant) => restaurant.restaurant_id !== matrixRestaurantId,
  );
  const canManageGroupCatalog = Boolean(selectedGroup) && (
    isSuperAdmin()
    || groupRestaurants.some((restaurant) => restaurant.access_type === "owner")
    || hasAnyPermission(["settings_manage", "products_manage"])
  );
  const canCreateUnit = Boolean(selectedGroup) && (
    isSuperAdmin()
    || groupRestaurants.some((restaurant) => restaurant.access_type === "owner")
    || hasAnyPermission(["settings_manage", "settings_establishment_manage"])
  );
  const canManageGroupStaff = Boolean(selectedGroup) && (
    isSuperAdmin()
    || groupRestaurants.some((restaurant) => restaurant.access_type === "owner")
    || hasAnyPermission(["employees_manage", "settings_manage"])
  );
  const canSyncMenu = canManageGroupCatalog && Boolean(matrixRestaurantId) && syncableRestaurants.length > 0;
  const selectedStaffMember = staffMembers.find(
    (member) => member.source_employee_id === selectedStaffEmployeeId,
  ) ?? null;
  const staffTargetRestaurants = selectedStaffMember
    ? groupRestaurants.filter((restaurant) => restaurant.restaurant_id !== selectedStaffMember.source_restaurant_id)
    : groupRestaurants;

  useEffect(() => {
    if (restaurants.length > 0 && selectedRestaurantIds.length === 0) {
      setSelectedRestaurantIds(restaurants.map((restaurant) => restaurant.restaurant_id));
    }
  }, [restaurants, selectedRestaurantIds.length]);

  useEffect(() => {
    if (!selectedGroupId && groups.length > 0) {
      setSelectedGroupId(groups[0].id);
    }
  }, [groups, selectedGroupId]);

  useEffect(() => {
    if (!currentMasterRestaurantId) return;
    setMatrixRestaurantId(currentMasterRestaurantId);
    setMenuSyncEnabled(currentMasterMenuSyncEnabled);
  }, [currentMasterMenuSyncEnabled, currentMasterRestaurantId]);

  const loadReport = useCallback(async () => {
    if (selectedRestaurantIds.length === 0) return;

    setLoadingReport(true);
    setReportError(null);

    try {
      const data = await getMultiunitConsolidatedReport({
        restaurantIds: selectedRestaurantIds,
        from: startOfDay(dateFrom),
        to: endOfDay(dateTo),
        includeFinancials: canViewFinancials,
      });
      setReport(data);
    } catch (error) {
      setReportError(error instanceof Error ? error.message : "Erro ao carregar consolidado");
    } finally {
      setLoadingReport(false);
    }
  }, [canViewFinancials, dateFrom, dateTo, selectedRestaurantIds]);

  const loadReadiness = useCallback(async () => {
    if (!selectedGroup) {
      setReadiness(null);
      return;
    }

    setLoadingReadiness(true);
    setReadinessError(null);

    try {
      const data = await getRestaurantGroupReadiness(selectedGroup.id);
      setReadiness(data);
    } catch (error) {
      setReadinessError(error instanceof Error ? error.message : "Erro ao carregar prontidão das unidades");
    } finally {
      setLoadingReadiness(false);
    }
  }, [selectedGroup]);

  useEffect(() => {
    if (!accessLoading && selectedRestaurantIds.length > 0) {
      void loadReport();
    }
  }, [accessLoading, loadReport, selectedRestaurantIds.length]);

  useEffect(() => {
    if (!accessLoading && selectedGroup) {
      void loadReadiness();
    }
  }, [accessLoading, loadReadiness, selectedGroup]);

  const toggleRestaurant = (restaurantId: string, checked: boolean) => {
    setSelectedRestaurantIds((current) => {
      if (checked) return Array.from(new Set([...current, restaurantId]));
      return current.filter((id) => id !== restaurantId);
    });
  };

  const handleSetActive = async (restaurantId: string) => {
    try {
      await switchRestaurant(restaurantId);
      toast.success("Unidade ativa alterada.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível trocar a unidade.");
    }
  };

  const updateUnitForm = (field: keyof UnitFormState, value: string) => {
    setUnitForm((current) => ({ ...current, [field]: value }));
  };

  const handleUnitDialogOpenChange = (open: boolean) => {
    if (creatingUnit) return;
    setUnitDialogOpen(open);
    if (!open) setUnitForm(emptyUnitForm);
  };

  const handleCreateUnit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedGroup) {
      toast.error("Selecione uma rede para cadastrar a unidade.");
      return;
    }

    const unitName = unitForm.name.trim();
    if (!unitName) {
      toast.error("Informe o nome da unidade.");
      return;
    }

    setCreatingUnit(true);
    try {
      const created = await createRestaurantUnit({
        groupId: selectedGroup.id,
        name: unitName,
        phone: unitForm.phone,
        address: unitForm.address,
        cnpj: unitForm.cnpj,
        category: unitForm.category,
        email: unitForm.email,
      });

      await refreshAccess();
      await loadReadiness();
      setSelectedRestaurantIds((current) => Array.from(new Set([...current, created.restaurant_id])));
      setUnitForm(emptyUnitForm);
      setUnitDialogOpen(false);
      toast.success(`${created.restaurant_name} cadastrada na rede.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível cadastrar a unidade.");
    } finally {
      setCreatingUnit(false);
    }
  };

  const handleSaveMatrix = async () => {
    if (!selectedGroup || !matrixRestaurantId) return;

    setSavingMatrix(true);
    try {
      await setRestaurantGroupMenuMatrix({
        groupId: selectedGroup.id,
        masterRestaurantId: matrixRestaurantId,
        menuSyncEnabled,
      });
      await refreshAccess();
      toast.success("Cardápio matriz atualizado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar a matriz.");
    } finally {
      setSavingMatrix(false);
    }
  };

  const handleSyncDialogOpenChange = (open: boolean) => {
    if (syncingMenu) return;
    setSyncDialogOpen(open);

    if (open) {
      setSyncTargetRestaurantIds(syncableRestaurants.map((restaurant) => restaurant.restaurant_id));
      setOverwriteExistingMenu(true);
    }
  };

  const toggleSyncTarget = (restaurantId: string, checked: boolean) => {
    setSyncTargetRestaurantIds((current) => {
      if (checked) return Array.from(new Set([...current, restaurantId]));
      return current.filter((id) => id !== restaurantId);
    });
  };

  const handleSyncMenu = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedGroup) {
      toast.error("Selecione uma rede para sincronizar.");
      return;
    }

    if (syncTargetRestaurantIds.length === 0) {
      toast.error("Selecione pelo menos uma filial para receber o cardápio.");
      return;
    }

    setSyncingMenu(true);
    try {
      const result = await syncRestaurantGroupMenu({
        groupId: selectedGroup.id,
        targetRestaurantIds: syncTargetRestaurantIds,
        overwriteExisting: overwriteExistingMenu,
      });

      setSyncDialogOpen(false);
      await loadReport();
      await loadReadiness();
      toast.success(
        `Cardápio sincronizado em ${number.format(result.units_synced)} unidade(s): `
        + `${number.format(result.products_created)} produto(s) criado(s), `
        + `${number.format(result.products_updated)} atualizado(s).`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível sincronizar o cardápio.");
    } finally {
      setSyncingMenu(false);
    }
  };

  const getDefaultStaffTargetIds = useCallback((member: MultiunitStaffMember | null) => {
    if (!member) return [];
    return groupRestaurants
      .filter((restaurant) => restaurant.restaurant_id !== member.source_restaurant_id)
      .map((restaurant) => restaurant.restaurant_id);
  }, [groupRestaurants]);

  const loadGroupStaff = useCallback(async () => {
    if (!selectedGroup || !canManageGroupStaff) return;

    setLoadingStaff(true);
    try {
      const data = await getRestaurantGroupStaff(selectedGroup.id);
      const nextStaff = data.staff;
      const nextSelected = nextStaff.find(
        (member) => member.source_employee_id === selectedStaffEmployeeId,
      ) ?? nextStaff[0] ?? null;

      setStaffMembers(nextStaff);
      setSelectedStaffEmployeeId(nextSelected?.source_employee_id ?? "");
      setStaffTargetRestaurantIds(getDefaultStaffTargetIds(nextSelected));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível carregar a equipe da rede.");
    } finally {
      setLoadingStaff(false);
    }
  }, [canManageGroupStaff, selectedGroup, selectedStaffEmployeeId, getDefaultStaffTargetIds]);

  const handleStaffDialogOpenChange = (open: boolean) => {
    if (applyingStaffAccess) return;
    setStaffDialogOpen(open);
    if (open) {
      void loadGroupStaff();
    }
  };

  const handleStaffMemberChange = (sourceEmployeeId: string) => {
    const member = staffMembers.find((item) => item.source_employee_id === sourceEmployeeId) ?? null;
    setSelectedStaffEmployeeId(sourceEmployeeId);
    setStaffTargetRestaurantIds(getDefaultStaffTargetIds(member));
  };

  const toggleStaffTarget = (restaurantId: string, checked: boolean) => {
    setStaffTargetRestaurantIds((current) => {
      if (checked) return Array.from(new Set([...current, restaurantId]));
      return current.filter((id) => id !== restaurantId);
    });
  };

  const handleApplyStaffAccess = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedGroup || !selectedStaffMember) {
      toast.error("Selecione um colaborador para aplicar acesso.");
      return;
    }

    if (staffTargetRestaurantIds.length === 0) {
      toast.error("Selecione pelo menos uma filial para receber o acesso.");
      return;
    }

    setApplyingStaffAccess(true);
    try {
      const result = await applyRestaurantGroupStaffAccess({
        groupId: selectedGroup.id,
        sourceEmployeeId: selectedStaffMember.source_employee_id,
        targetRestaurantIds: staffTargetRestaurantIds,
        isActive: true,
      });

      await loadGroupStaff();
      await loadReadiness();
      toast.success(
        `Acesso aplicado em ${number.format(result.targets_count)} unidade(s): `
        + `${number.format(result.employees_created)} criado(s), `
        + `${number.format(result.employees_updated)} atualizado(s).`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível aplicar o acesso nas unidades.");
    } finally {
      setApplyingStaffAccess(false);
    }
  };

  const summary = report?.summary;
  const readinessSummary = readiness?.summary;
  const readinessActionUnits = (readinessSummary?.attention_units ?? 0) + (readinessSummary?.critical_units ?? 0);
  const periodoInvalido = dateFrom > dateTo;

  return (
    <DashboardLayout title="Rede e unidades">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unidades</CardTitle>
              <Network className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{number.format(summary?.units ?? restaurants.length)}</div>
              <p className="text-xs text-muted-foreground">{selectedRestaurantIds.length} selecionada(s)</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Faturamento</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{money.format(summary?.revenue ?? 0)}</div>
              <p className="text-xs text-muted-foreground">Pedidos finalizados no período</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pedidos</CardTitle>
              <ShoppingBasket className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{number.format(summary?.totalOrders ?? 0)}</div>
              <p className="text-xs text-muted-foreground">
                {number.format(summary?.openOrders ?? 0)} aberto(s) agora
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ticket médio</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{money.format(summary?.averageTicket ?? 0)}</div>
              <p className="text-xs text-muted-foreground">
                {number.format(summary?.activeProducts ?? 0)} produto(s) ativo(s)
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Consolidado operacional
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
                <div className="space-y-2">
                  <Label htmlFor="multiunit-date-from">Data inicial</Label>
                  <Input
                    id="multiunit-date-from"
                    type="date"
                    value={format(dateFrom, "yyyy-MM-dd")}
                    onChange={(event) => event.target.value && setDateFrom(new Date(`${event.target.value}T12:00:00`))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="multiunit-date-to">Data final</Label>
                  <Input
                    id="multiunit-date-to"
                    type="date"
                    value={format(dateTo, "yyyy-MM-dd")}
                    onChange={(event) => event.target.value && setDateTo(new Date(`${event.target.value}T12:00:00`))}
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={() => void loadReport()}
                  disabled={loadingReport || periodoInvalido || selectedRestaurantIds.length === 0}
                >
                  {loadingReport ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                  Atualizar
                </Button>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {restaurants.map((restaurant) => (
                  <label
                    key={restaurant.restaurant_id}
                    className="flex min-h-14 items-center gap-3 rounded-md border px-3 py-2 text-sm"
                  >
                    <Checkbox
                      checked={selectedRestaurantIds.includes(restaurant.restaurant_id)}
                      onCheckedChange={(checked) => toggleRestaurant(restaurant.restaurant_id, checked === true)}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{restaurant.restaurant_name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {accessLabel[restaurant.access_type]}
                      </span>
                    </span>
                  </label>
                ))}
              </div>

              {periodoInvalido && (
                <Alert variant="destructive">
                  <AlertDescription>A data inicial deve ser anterior ou igual à data final.</AlertDescription>
                </Alert>
              )}

              {reportError && (
                <Alert variant="destructive">
                  <AlertDescription>{reportError}</AlertDescription>
                </Alert>
              )}

              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Unidade</TableHead>
                      <TableHead className="text-right">Faturamento</TableHead>
                      <TableHead className="text-right">Pedidos</TableHead>
                      <TableHead className="text-right">Ticket</TableHead>
                      <TableHead className="text-right">Abertos</TableHead>
                      <TableHead className="text-right">Produtos</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(report?.units ?? []).map((unit) => (
                      <TableRow key={unit.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{unit.name}</span>
                            {unit.id === activeRestaurantId && (
                              <Badge variant="secondary" className="text-xs">Ativa</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{money.format(unit.revenue)}</TableCell>
                        <TableCell className="text-right">{number.format(unit.totalOrders)}</TableCell>
                        <TableCell className="text-right">{money.format(unit.averageTicket)}</TableCell>
                        <TableCell className="text-right">{number.format(unit.openOrders)}</TableCell>
                        <TableCell className="text-right">{number.format(unit.activeProducts)}</TableCell>
                      </TableRow>
                    ))}
                    {(report?.units ?? []).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                          Nenhum dado consolidado no período.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Dialog open={unitDialogOpen} onOpenChange={handleUnitDialogOpenChange}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    Nova unidade
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Cadastre filiais da rede sem criar outro acesso de dono ou perder o consolidado multiunidade.
                  </p>
                  <DialogTrigger asChild>
                    <Button className="w-full" disabled={!canCreateUnit || !selectedGroup}>
                      <Plus className="mr-2 h-4 w-4" />
                      Cadastrar unidade
                    </Button>
                  </DialogTrigger>
                  {!canCreateUnit && (
                    <p className="text-xs text-muted-foreground">
                      Apenas donos, super admins ou gestores com permissão de configurações podem cadastrar unidades.
                    </p>
                  )}
                </CardContent>
              </Card>

              <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                  <DialogTitle>Nova unidade da rede</DialogTitle>
                  <DialogDescription>
                    {selectedGroup?.name ?? "A rede selecionada"} receberá esta unidade no consolidado e no seletor.
                  </DialogDescription>
                </DialogHeader>

                <form id="multiunit-create-unit-form" className="space-y-4" onSubmit={handleCreateUnit}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="unit-name">Nome da unidade</Label>
                      <Input
                        id="unit-name"
                        value={unitForm.name}
                        onChange={(event) => updateUnitForm("name", event.target.value)}
                        placeholder="Ex.: Pubfy Centro"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="unit-phone">Telefone/WhatsApp</Label>
                      <Input
                        id="unit-phone"
                        value={unitForm.phone}
                        onChange={(event) => updateUnitForm("phone", event.target.value)}
                        placeholder="(11) 99999-9999"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="unit-cnpj">CNPJ</Label>
                      <Input
                        id="unit-cnpj"
                        value={unitForm.cnpj}
                        onChange={(event) => updateUnitForm("cnpj", event.target.value)}
                        placeholder="00.000.000/0001-00"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="unit-category">Categoria</Label>
                      <Input
                        id="unit-category"
                        value={unitForm.category}
                        onChange={(event) => updateUnitForm("category", event.target.value)}
                        placeholder="Restaurante"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="unit-email">E-mail operacional</Label>
                      <Input
                        id="unit-email"
                        type="email"
                        value={unitForm.email}
                        onChange={(event) => updateUnitForm("email", event.target.value)}
                        placeholder="unidade@restaurante.com"
                      />
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="unit-address">Endereço</Label>
                      <Textarea
                        id="unit-address"
                        value={unitForm.address}
                        onChange={(event) => updateUnitForm("address", event.target.value)}
                        placeholder="Rua, número, bairro, cidade/UF"
                        rows={3}
                      />
                    </div>
                  </div>
                </form>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleUnitDialogOpenChange(false)}
                    disabled={creatingUnit}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" form="multiunit-create-unit-form" disabled={creatingUnit}>
                    {creatingUnit ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                    Cadastrar unidade
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={staffDialogOpen} onOpenChange={handleStaffDialogOpenChange}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UsersRound className="h-5 w-5" />
                    Equipe da rede
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Aplique o acesso de um colaborador nas filiais mantendo cargo e permissões por unidade.
                  </p>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full" disabled={!canManageGroupStaff || !selectedGroup}>
                      <UsersRound className="mr-2 h-4 w-4" />
                      Gerenciar acessos
                    </Button>
                  </DialogTrigger>
                  {!canManageGroupStaff && (
                    <p className="text-xs text-muted-foreground">
                      Apenas donos, super admins ou usuários com permissão de funcionários podem gerenciar acessos da rede.
                    </p>
                  )}
                </CardContent>
              </Card>

              <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                  <DialogTitle>Acesso da equipe por unidade</DialogTitle>
                  <DialogDescription>
                    Copie o cargo e as permissões do colaborador de origem para as filiais selecionadas.
                  </DialogDescription>
                </DialogHeader>

                <form id="multiunit-staff-access-form" className="space-y-4" onSubmit={handleApplyStaffAccess}>
                  <div className="space-y-2">
                    <Label>Colaborador de origem</Label>
                    <Select
                      value={selectedStaffEmployeeId}
                      onValueChange={handleStaffMemberChange}
                      disabled={loadingStaff || staffMembers.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={loadingStaff ? "Carregando equipe..." : "Selecionar colaborador"} />
                      </SelectTrigger>
                      <SelectContent>
                        {staffMembers.map((member) => (
                          <SelectItem key={member.source_employee_id} value={member.source_employee_id}>
                            {member.employee_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedStaffMember && (
                    <div className="rounded-md border bg-muted/30 p-3 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{selectedStaffMember.employee_name}</span>
                        <Badge variant="outline">{accessLabel[selectedStaffMember.user_type]}</Badge>
                        <Badge variant="secondary">
                          {number.format(selectedStaffMember.permissions.length)} permissão(ões)
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{selectedStaffMember.employee_email}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Origem: {selectedStaffMember.source_restaurant_name}
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Filiais de destino</Label>
                    <div className="grid max-h-56 gap-2 overflow-y-auto rounded-md border p-2">
                      {staffTargetRestaurants.map((restaurant) => {
                        const existingUnit = selectedStaffMember?.units.find(
                          (unit) => unit.restaurant_id === restaurant.restaurant_id && unit.is_active,
                        );

                        return (
                          <label
                            key={restaurant.restaurant_id}
                            className="flex min-h-12 items-center gap-3 rounded-md px-2 py-1 text-sm hover:bg-muted"
                          >
                            <Checkbox
                              checked={staffTargetRestaurantIds.includes(restaurant.restaurant_id)}
                              onCheckedChange={(checked) => toggleStaffTarget(restaurant.restaurant_id, checked === true)}
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-medium">{restaurant.restaurant_name}</span>
                              <span className="block truncate text-xs text-muted-foreground">
                                {existingUnit ? `Já possui acesso como ${accessLabel[existingUnit.user_type]}` : "Sem acesso ativo"}
                              </span>
                            </span>
                          </label>
                        );
                      })}

                      {!loadingStaff && staffTargetRestaurants.length === 0 && (
                        <p className="px-2 py-4 text-center text-sm text-muted-foreground">
                          Adicione outra unidade à rede para aplicar acessos.
                        </p>
                      )}
                    </div>
                  </div>

                  <Alert>
                    <AlertDescription>
                      Esta ação não remove acessos existentes em unidades que ficarem desmarcadas.
                    </AlertDescription>
                  </Alert>
                </form>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleStaffDialogOpenChange(false)}
                    disabled={applyingStaffAccess}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    form="multiunit-staff-access-form"
                    disabled={
                      applyingStaffAccess
                      || loadingStaff
                      || !selectedStaffMember
                      || staffTargetRestaurantIds.length === 0
                    }
                  >
                    {applyingStaffAccess ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UsersRound className="mr-2 h-4 w-4" />}
                    Aplicar acesso
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardCheck className="h-5 w-5" />
                    Prontidão das unidades
                  </CardTitle>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => void loadReadiness()}
                    disabled={loadingReadiness || !selectedGroup}
                    aria-label="Atualizar prontidão das unidades"
                  >
                    {loadingReadiness ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="rounded-md border px-3 py-2">
                    <p className="text-xs text-muted-foreground">Prontas</p>
                    <p className="font-semibold">
                      {number.format(readinessSummary?.ready_units ?? 0)}/{number.format(readinessSummary?.units ?? 0)}
                    </p>
                  </div>
                  <div className="rounded-md border px-3 py-2">
                    <p className="text-xs text-muted-foreground">Média</p>
                    <p className="font-semibold">{number.format(readinessSummary?.average_score ?? 0)}%</p>
                  </div>
                  <div className="rounded-md border px-3 py-2">
                    <p className="text-xs text-muted-foreground">Ações</p>
                    <p className="flex items-center gap-1 font-semibold">
                      {readinessActionUnits > 0 && <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />}
                      {number.format(readinessActionUnits)}
                    </p>
                  </div>
                </div>

                <Progress value={readinessSummary?.average_score ?? 0} className="h-2" />

                {readinessError && (
                  <Alert variant="destructive">
                    <AlertDescription>{readinessError}</AlertDescription>
                  </Alert>
                )}

                {loadingReadiness && !readiness && (
                  <div className="flex items-center justify-center rounded-md border py-6 text-sm text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Carregando prontidão...
                  </div>
                )}

                {!loadingReadiness && readiness?.units.length === 0 && (
                  <div className="rounded-md border py-6 text-center text-sm text-muted-foreground">
                    Nenhuma unidade ativa nesta rede.
                  </div>
                )}

                <div className="space-y-2">
                  {readiness?.units.map((unit) => {
                    const visibleMissing = unit.missing.slice(0, 2);
                    const extraMissing = Math.max(unit.missing.length - visibleMissing.length, 0);

                    return (
                      <div key={unit.restaurant_id} className="rounded-md border px-3 py-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{unit.restaurant_name}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {visibleMissing.length > 0
                                ? `${visibleMissing.join(", ")}${extraMissing > 0 ? ` +${extraMissing}` : ""}`
                                : "Sem pendências críticas."}
                            </p>
                          </div>
                          <Badge variant="outline" className={readinessBadgeClassName[unit.status]}>
                            {readinessLabel[unit.status]}
                          </Badge>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <Progress value={unit.score} className="h-1.5 flex-1" />
                          <span className="w-10 text-right text-xs text-muted-foreground">
                            {number.format(unit.score)}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="h-5 w-5" />
                  Unidades da rede
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {restaurants.map((restaurant) => (
                  <div
                    key={restaurant.restaurant_id}
                    className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{restaurant.restaurant_name}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {accessLabel[restaurant.access_type]}
                        </Badge>
                        {restaurant.is_group_master && (
                          <Badge className="bg-primary/15 text-primary hover:bg-primary/20">
                            Matriz
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      variant={restaurant.restaurant_id === activeRestaurantId ? "secondary" : "outline"}
                      size="sm"
                      onClick={() => void handleSetActive(restaurant.restaurant_id)}
                      disabled={restaurant.restaurant_id === activeRestaurantId}
                    >
                      {restaurant.restaurant_id === activeRestaurantId ? (
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                      ) : (
                        <Building2 className="mr-2 h-4 w-4" />
                      )}
                      {restaurant.restaurant_id === activeRestaurantId ? "Ativa" : "Usar"}
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="h-5 w-5" />
                  Cardápio matriz
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {groups.length > 1 && (
                  <div className="space-y-2">
                    <Label>Rede</Label>
                    <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {groups.map((group) => (
                          <SelectItem key={group.id} value={group.id}>
                            {group.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Unidade matriz</Label>
                  <Select value={matrixRestaurantId} onValueChange={setMatrixRestaurantId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar unidade" />
                    </SelectTrigger>
                    <SelectContent>
                      {groupRestaurants.map((restaurant) => (
                        <SelectItem key={restaurant.restaurant_id} value={restaurant.restaurant_id}>
                          {restaurant.restaurant_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between rounded-md border px-3 py-2">
                  <Label htmlFor="menu-sync-enabled" className="text-sm font-medium">
                    Matriz ativa
                  </Label>
                  <Switch
                    id="menu-sync-enabled"
                    checked={menuSyncEnabled}
                    onCheckedChange={setMenuSyncEnabled}
                  />
                </div>

                <Button
                  onClick={() => void handleSaveMatrix()}
                  disabled={!selectedGroup || !matrixRestaurantId || savingMatrix}
                  className="w-full"
                >
                  {savingMatrix ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Salvar matriz
                </Button>

                <Dialog open={syncDialogOpen} onOpenChange={handleSyncDialogOpenChange}>
                  <DialogTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      disabled={!canSyncMenu}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Sincronizar filiais
                    </Button>
                  </DialogTrigger>

                  <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                      <DialogTitle>Sincronizar cardápio matriz</DialogTitle>
                      <DialogDescription>
                        {currentMaster?.restaurant_name ?? "A matriz"} será usada como base para as filiais selecionadas.
                      </DialogDescription>
                    </DialogHeader>

                    <form id="multiunit-sync-menu-form" className="space-y-4" onSubmit={handleSyncMenu}>
                      <div className="space-y-2">
                        <Label>Filiais de destino</Label>
                        <div className="grid max-h-56 gap-2 overflow-y-auto rounded-md border p-2">
                          {syncableRestaurants.map((restaurant) => (
                            <label
                              key={restaurant.restaurant_id}
                              className="flex min-h-12 items-center gap-3 rounded-md px-2 py-1 text-sm hover:bg-muted"
                            >
                              <Checkbox
                                checked={syncTargetRestaurantIds.includes(restaurant.restaurant_id)}
                                onCheckedChange={(checked) => toggleSyncTarget(restaurant.restaurant_id, checked === true)}
                              />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate font-medium">{restaurant.restaurant_name}</span>
                                <span className="block truncate text-xs text-muted-foreground">
                                  {accessLabel[restaurant.access_type]}
                                </span>
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between rounded-md border px-3 py-2">
                        <div className="space-y-0.5">
                          <Label htmlFor="overwrite-existing-menu" className="text-sm font-medium">
                            Atualizar itens existentes
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Itens locais fora da matriz serão preservados.
                          </p>
                        </div>
                        <Switch
                          id="overwrite-existing-menu"
                          checked={overwriteExistingMenu}
                          onCheckedChange={setOverwriteExistingMenu}
                        />
                      </div>

                      <Alert>
                        <AlertDescription>
                          O saldo de estoque das filiais não será copiado da matriz.
                        </AlertDescription>
                      </Alert>
                    </form>

                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleSyncDialogOpenChange(false)}
                        disabled={syncingMenu}
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        form="multiunit-sync-menu-form"
                        disabled={syncingMenu || syncTargetRestaurantIds.length === 0}
                      >
                        {syncingMenu ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Copy className="mr-2 h-4 w-4" />}
                        Sincronizar
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {!canSyncMenu && (
                  <p className="text-xs text-muted-foreground">
                    Configure uma matriz e mantenha pelo menos uma filial na rede para sincronizar.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Multiunidade;
