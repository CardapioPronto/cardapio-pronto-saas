import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { endOfDay, format, startOfDay, subDays } from "date-fns";
import {
  Building2,
  CheckCircle2,
  Copy,
  Loader2,
  Network,
  Plus,
  RefreshCw,
  Save,
  ShoppingBasket,
  Store,
  TrendingUp,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useRestaurantAccess } from "@/hooks/useRestaurantAccess";
import { usePermissionsV2 } from "@/hooks/usePermissionsV2";
import {
  createRestaurantUnit,
  getMultiunitConsolidatedReport,
  setRestaurantGroupMenuMatrix,
  syncRestaurantGroupMenu,
} from "@/services/multiunitService";
import type { MultiunitConsolidatedReport, RestaurantAccess } from "@/types/multiunit";
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
  const groups = useMemo(() => uniqueGroups(restaurants), [restaurants]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const selectedGroup = groups.find((group) => group.id === selectedGroupId) ?? groups[0] ?? null;
  const groupRestaurants = restaurants.filter((restaurant) => restaurant.group_id === selectedGroup?.id);
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
  const canSyncMenu = canManageGroupCatalog && Boolean(matrixRestaurantId) && syncableRestaurants.length > 0;

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

  useEffect(() => {
    if (!accessLoading && selectedRestaurantIds.length > 0) {
      void loadReport();
    }
  }, [accessLoading, loadReport, selectedRestaurantIds.length]);

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

  const summary = report?.summary;
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
