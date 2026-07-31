import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner-toast";
import { ImportarClientesDialog } from "@/components/clientes/ImportarClientesDialog";
import { formatPhone } from "@/utils/phoneValidation";
import {
  getCrmCustomerDetail,
  listCrmCustomers,
  updateCrmCustomerProfile,
} from "@/services/crmService";
import { CrmCustomer, CrmCustomerDetail, CrmCustomersResponse, CrmSegment } from "@/types/crm";
import {
  CalendarClock,
  Mail,
  RefreshCw,
  Search,
  Send,
  Tags,
  TrendingUp,
  UserRound,
  Users,
} from "lucide-react";

const SEGMENT_LABELS: Record<CrmSegment, string> = {
  all: "Todos",
  new: "Novos",
  recurring: "Recorrentes",
  inactive: "Inativos",
  high_ticket: "Alto ticket",
  marketing: "Opt-in",
  no_orders: "Sem pedidos",
};

const SOURCE_LABELS: Record<string, string> = {
  app: "PDV",
  pdv: "PDV",
  cardapio: "Cardápio",
  ifood: "iFood",
  whatsapp: "WhatsApp",
  mesa: "Mesa",
  balcao: "Balcão",
  delivery: "Delivery",
  manual: "Manual",
  pedido: "Pedido",
};

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function displayPhone(phone: string) {
  const localPhone = phone.startsWith("55") && phone.length > 11 ? phone.slice(2) : phone;
  return formatPhone(localPhone);
}

function displayDate(value?: string | null) {
  if (!value) return "Sem pedido";
  return new Date(value).toLocaleDateString("pt-BR");
}

function normalizeTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function displaySource(value?: string | null) {
  if (!value) return "Pedido";
  return SOURCE_LABELS[value] || value;
}

function getCustomerSourceLabels(customer: CrmCustomer) {
  const values = [
    customer.source,
    customer.last_source,
    ...(Array.isArray(customer.sources) ? customer.sources : []),
  ].filter(Boolean) as string[];

  return Array.from(new Set(values.map(displaySource))).slice(0, 3);
}

const emptyResponse: CrmCustomersResponse = {
  total: 0,
  customers: [],
  metrics: {
    total_customers: 0,
    with_marketing_opt_in: 0,
    recurring_customers: 0,
    inactive_customers: 0,
    total_spent: 0,
    average_ticket: 0,
  },
};

const Clientes = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<CrmCustomersResponse>(emptyResponse);
  const [segment, setSegment] = useState<CrmSegment>("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [detail, setDetail] = useState<CrmCustomerDetail | null>(null);
  const [profileForm, setProfileForm] = useState({
    name: "",
    email: "",
    birth_date: "",
    tagsText: "",
    notes: "",
    accepts_marketing: false,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await listCrmCustomers({ search, segment });
      setData(response);
    } catch (error) {
      console.error("Erro ao carregar CRM:", error);
      toast.error("Erro ao carregar clientes");
    } finally {
      setLoading(false);
    }
  }, [search, segment]);

  useEffect(() => {
    void load();
  }, [load]);

  const metrics = data.metrics;
  const metricCards = useMemo(() => [
    {
      label: "Clientes",
      value: metrics.total_customers.toLocaleString("pt-BR"),
      icon: Users,
    },
    {
      label: "Recorrentes",
      value: metrics.recurring_customers.toLocaleString("pt-BR"),
      icon: TrendingUp,
    },
    {
      label: "Opt-in marketing",
      value: metrics.with_marketing_opt_in.toLocaleString("pt-BR"),
      icon: Mail,
    },
    {
      label: "Ticket médio",
      value: money.format(metrics.average_ticket || 0),
      icon: CalendarClock,
    },
  ], [metrics]);

  const openDetail = async (customer: CrmCustomer) => {
    setDetailOpen(true);
    setDetail(null);
    setDetailLoading(true);
    try {
      const response = await getCrmCustomerDetail(customer.phone_normalized);
      setDetail(response);
      setProfileForm({
        name: response.customer.name || "",
        email: response.customer.email || "",
        birth_date: response.customer.birth_date || "",
        tagsText: (response.customer.tags || []).join(", "),
        notes: response.customer.notes || "",
        accepts_marketing: !!response.customer.accepts_marketing,
      });
    } catch (error) {
      console.error("Erro ao carregar cliente:", error);
      toast.error("Erro ao abrir cliente");
    } finally {
      setDetailLoading(false);
    }
  };

  const saveProfile = async () => {
    if (!detail?.customer.phone_normalized) return;
    setSavingProfile(true);
    try {
      await updateCrmCustomerProfile(detail.customer.phone_normalized, {
        name: profileForm.name || null,
        email: profileForm.email || null,
        birth_date: profileForm.birth_date || null,
        tags: normalizeTags(profileForm.tagsText),
        notes: profileForm.notes || null,
        accepts_marketing: profileForm.accepts_marketing,
        source: "manual",
      });
      const refreshed = await getCrmCustomerDetail(detail.customer.phone_normalized);
      setDetail(refreshed);
      await load();
      toast.success("Cliente atualizado");
    } catch (error) {
      console.error("Erro ao salvar cliente:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao salvar cliente");
    } finally {
      setSavingProfile(false);
    }
  };

  const openCampaigns = () => {
    const audience = segment === "marketing" ? "marketing_opt_in" : "recent_customers";
    navigate(`/email-integracao?tab=campaigns&audience=${audience}&create=1`);
  };

  return (
    <DashboardLayout title="Clientes">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {metricCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card key={card.label}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{card.label}</CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{card.value}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle>Base de clientes</CardTitle>
                <CardDescription>
                  Leads e clientes consolidados por telefone a partir de pedidos, contatos e enriquecimento manual.
                </CardDescription>
              </div>
              <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
                <ImportarClientesDialog onImported={load} />
                <Button variant="outline" onClick={openCampaigns} className="w-full lg:w-auto">
                  <Send className="mr-2 h-4 w-4" />
                  Criar campanha
                </Button>
                <Button variant="outline" onClick={load} disabled={loading} className="w-full lg:w-auto">
                  <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                  Atualizar
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <Tabs value={segment} onValueChange={(value) => setSegment(value as CrmSegment)}>
                <TabsList className="h-auto flex-wrap justify-start">
                  {(Object.keys(SEGMENT_LABELS) as CrmSegment[]).map((key) => (
                    <TabsTrigger key={key} value={key}>
                      {SEGMENT_LABELS[key]}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>

              <div className="flex w-full gap-2 xl:max-w-md">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") setSearch(searchInput);
                    }}
                    placeholder="Buscar nome, telefone, e-mail ou tag"
                    className="pl-9"
                  />
                </div>
                <Button variant="outline" onClick={() => setSearch(searchInput)}>
                  Buscar
                </Button>
              </div>
            </div>

            {data.customers.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Último pedido</TableHead>
                      <TableHead className="text-right">Pedidos</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Tags</TableHead>
                      <TableHead className="w-[110px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.customers.map((customer) => (
                      <TableRow key={customer.phone_normalized}>
                        <TableCell>
                          <div className="font-medium">{customer.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {displayPhone(customer.phone_normalized)}
                            {customer.email ? ` · ${customer.email}` : ""}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>{displayDate(customer.last_order_at)}</div>
                          <div className="text-xs text-muted-foreground">
                            {displaySource(customer.last_source || customer.source)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{customer.orders_count}</TableCell>
                        <TableCell className="text-right">{money.format(customer.total_spent || 0)}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {getCustomerSourceLabels(customer).map((source) => (
                              <Badge key={source} variant="outline" className="border-sky-200 bg-sky-50 text-sky-700">
                                {source}
                              </Badge>
                            ))}
                            {customer.accepts_marketing && (
                              <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                                Opt-in
                              </Badge>
                            )}
                            {customer.tags.slice(0, 3).map((tag) => (
                              <Badge key={tag} variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline" onClick={() => openDetail(customer)}>
                            Abrir
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <EmptyState
                icon={UserRound}
                title="Nenhum cliente encontrado"
                description="A base será alimentada por pedidos com telefone e contatos capturados nas campanhas."
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{detail?.customer.name || "Cliente"}</DialogTitle>
            <DialogDescription>
              {detail?.customer.phone_normalized ? displayPhone(detail.customer.phone_normalized) : "Carregando..."}
            </DialogDescription>
          </DialogHeader>

          {detailLoading ? (
            <div className="grid min-h-64 place-items-center text-sm text-muted-foreground">
              Carregando cliente...
            </div>
          ) : detail ? (
            <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">Pedidos</p>
                    <p className="text-xl font-semibold">{detail.customer.orders_count}</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">Total finalizado</p>
                    <p className="text-xl font-semibold">{money.format(detail.customer.total_spent || 0)}</p>
                  </div>
                </div>

                <div className="space-y-3 rounded-md border p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Nome</Label>
                      <Input
                        value={profileForm.name}
                        onChange={(event) => setProfileForm((current) => ({ ...current, name: event.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>E-mail</Label>
                      <Input
                        value={profileForm.email}
                        onChange={(event) => setProfileForm((current) => ({ ...current, email: event.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-[180px,1fr]">
                    <div className="space-y-2">
                      <Label>Aniversário</Label>
                      <Input
                        type="date"
                        value={profileForm.birth_date}
                        onChange={(event) => setProfileForm((current) => ({ ...current, birth_date: event.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tags</Label>
                      <Input
                        value={profileForm.tagsText}
                        onChange={(event) => setProfileForm((current) => ({ ...current, tagsText: event.target.value }))}
                        placeholder="vip, família, almoço"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Anotações</Label>
                    <Textarea
                      rows={4}
                      value={profileForm.notes}
                      onChange={(event) => setProfileForm((current) => ({ ...current, notes: event.target.value }))}
                    />
                  </div>

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={profileForm.accepts_marketing}
                      onChange={(event) => setProfileForm((current) => ({ ...current, accepts_marketing: event.target.checked }))}
                      className="h-4 w-4 rounded border-muted"
                    />
                    Aceita marketing
                  </label>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Tags className="h-4 w-4" />
                  Histórico de pedidos
                </div>
                {detail.orders.length ? (
                  <div className="space-y-3">
                    {detail.orders.map((order) => (
                      <div key={order.id} className="rounded-md border p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium">#{order.order_number}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(order.created_at).toLocaleString("pt-BR")} · {order.source || order.order_type}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
                              {order.status}
                            </Badge>
                            <p className="mt-1 text-sm font-semibold">{money.format(order.total)}</p>
                          </div>
                        </div>
                        <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                          {order.items.map((item) => (
                            <div key={item.id} className="flex justify-between gap-3">
                              <span>{item.quantity}x {item.product_name}</span>
                              <span>{money.format(item.price)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={UserRound}
                    title="Sem pedidos vinculados"
                    description="Este contato ainda não tem pedidos associados ao telefone."
                    compact
                  />
                )}
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>
              Fechar
            </Button>
            <Button onClick={saveProfile} disabled={!detail || savingProfile}>
              {savingProfile ? "Salvando..." : "Salvar cliente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Clientes;
