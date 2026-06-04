import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit2, Loader2, MessageSquareQuote, Save, Search, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/sonner-toast";
import { listSystemSettings, updateSystemSetting } from "@/services/adminService";
import {
  AdminLandingTestimonial,
  AdminTestimonialPayload,
  listAdminLandingTestimonials,
  saveAdminLandingTestimonial,
  searchTestimonialClients,
  TestimonialClientOption,
} from "@/services/landingTestimonialsService";

const LANDING_TESTIMONIALS_VISIBLE_KEY = "landing_testimonials_visible";

const emptyForm: AdminTestimonialPayload = {
  id: null,
  restaurantId: null,
  message: "",
  authorName: "",
  authorRole: "",
  rating: 5,
  source: "super_admin",
  status: "published",
  isFeatured: false,
  displayOrder: 0,
  publicNote: "",
  internalNotes: "",
};

const statusLabel: Record<string, string> = {
  pending: "Em análise",
  published: "Publicado",
  rejected: "Rejeitado",
  archived: "Arquivado",
};

const sourceLabel: Record<string, string> = {
  app: "App",
  super_admin: "Super Admin",
  external: "Externo",
  imported: "Importado",
};

const readBooleanSetting = (value: unknown, fallback = true) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value === "true";
  return fallback;
};

export const LandingTestimonialsAdmin = () => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("todos");
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<TestimonialClientOption | null>(null);
  const [form, setForm] = useState<AdminTestimonialPayload>(emptyForm);

  const settingsQuery = useQuery({
    queryKey: ["system-settings", LANDING_TESTIMONIALS_VISIBLE_KEY],
    queryFn: () => listSystemSettings(),
  });

  const testimonialsQuery = useQuery({
    queryKey: ["admin-landing-testimonials", statusFilter],
    queryFn: async () => {
      const { data, error } = await listAdminLandingTestimonials(statusFilter);
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const clientsQuery = useQuery({
    queryKey: ["testimonial-clients", clientSearch],
    queryFn: async () => {
      const { data, error } = await searchTestimonialClients(clientSearch);
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const visibleSetting = useMemo(
    () => settingsQuery.data?.data?.find((setting) => setting.key === LANDING_TESTIMONIALS_VISIBLE_KEY),
    [settingsQuery.data?.data],
  );

  const isSectionVisible = readBooleanSetting(visibleSetting?.value, true);

  useEffect(() => {
    if (!selectedClient && clientsQuery.data?.length) {
      const current = clientsQuery.data.find((client) => client.restaurant_id === form.restaurantId);
      if (current) setSelectedClient(current);
    }
  }, [clientsQuery.data, form.restaurantId, selectedClient]);

  const visibilityMutation = useMutation({
    mutationFn: async (visible: boolean) => {
      const { error } = await updateSystemSetting(LANDING_TESTIMONIALS_VISIBLE_KEY, visible);
      if (error) throw new Error(error.message);
    },
    onSuccess: async () => {
      toast.success("Visibilidade da seção atualizada.");
      await queryClient.invalidateQueries({ queryKey: ["system-settings", LANDING_TESTIMONIALS_VISIBLE_KEY] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar visibilidade.");
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await saveAdminLandingTestimonial(form);
      if (error) throw new Error(error.message);
    },
    onSuccess: async () => {
      toast.success("Depoimento salvo com sucesso.");
      setForm(emptyForm);
      setSelectedClient(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-landing-testimonials"] });
      await queryClient.invalidateQueries({ queryKey: ["testimonial-clients"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar depoimento.");
    },
  });

  const handleSelectClient = (client: TestimonialClientOption) => {
    setSelectedClient(client);
    setForm((current) => ({
      ...current,
      restaurantId: client.restaurant_id,
      authorRole: current.authorRole || `Cliente Pubfy - ${client.name}`,
    }));
  };

  const handleEdit = (testimonial: AdminLandingTestimonial) => {
    setForm({
      id: testimonial.id,
      restaurantId: testimonial.restaurant_id,
      message: testimonial.message,
      authorName: testimonial.author_name,
      authorRole: testimonial.author_role || "",
      rating: testimonial.rating,
      source: testimonial.source as AdminTestimonialPayload["source"],
      status: testimonial.status as AdminTestimonialPayload["status"],
      isFeatured: testimonial.is_featured,
      displayOrder: testimonial.display_order,
      publicNote: testimonial.public_note || "",
      internalNotes: testimonial.internal_notes || "",
    });
    setSelectedClient(
      testimonial.restaurant_id
        ? {
            restaurant_id: testimonial.restaurant_id,
            name: testimonial.client_name || testimonial.restaurant_name,
            email: testimonial.client_email,
            owner_name: testimonial.created_by_name,
            owner_email: null,
            logo_url: testimonial.avatar_url,
          }
        : null,
    );
  };

  const canSave =
    !!form.restaurantId &&
    form.message.trim().length >= 20 &&
    form.authorName.trim().length >= 2 &&
    !saveMutation.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquareQuote className="h-5 w-5 text-emerald-700" />
          Depoimentos da landing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col gap-4 rounded-md border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Label htmlFor="landing-testimonials-visible">Exibir seção na landing</Label>
            <p className="text-sm text-muted-foreground">
              Quando desligado, a landing não mostra depoimentos mesmo que existam mensagens publicadas.
            </p>
          </div>
          <Switch
            id="landing-testimonials-visible"
            checked={isSectionVisible}
            onCheckedChange={(visible) => visibilityMutation.mutate(visible)}
            disabled={visibilityMutation.isPending || settingsQuery.isLoading}
          />
        </div>

        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-4 rounded-md border p-4">
            <div>
              <h3 className="text-sm font-semibold">Restaurante cliente vinculado</h3>
              <p className="text-sm text-muted-foreground">
                Pesquise a conta do restaurante para vincular o depoimento ao cliente correto.
              </p>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={clientSearch}
                  onChange={(event) => setClientSearch(event.target.value)}
                  className="pl-9"
                  placeholder="Buscar restaurante por nome, e-mail ou responsável"
                />
              </div>
            </div>

            <div className="max-h-64 space-y-2 overflow-auto pr-1">
              {clientsQuery.isLoading ? (
                <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Buscando restaurantes...
                </div>
              ) : (
                clientsQuery.data?.map((client) => (
                  <button
                    key={client.restaurant_id}
                    type="button"
                    className={`w-full rounded-md border px-3 py-2 text-left text-sm transition hover:bg-muted ${
                      form.restaurantId === client.restaurant_id ? "border-green bg-green/5" : ""
                    }`}
                    onClick={() => handleSelectClient(client)}
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="font-medium">{client.name}</span>
                      <span className="text-xs font-medium text-green">
                        {form.restaurantId === client.restaurant_id ? "Vinculado" : "Vincular"}
                      </span>
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      Responsável: {client.owner_name || "não informado"}
                    </span>
                    {(client.email || client.owner_email) && (
                      <span className="block text-xs text-muted-foreground">
                        E-mail: {client.email || client.owner_email}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>

            {selectedClient && (
              <div className="space-y-1 rounded-md bg-muted/50 px-3 py-2 text-sm">
                <p>
                  Restaurante vinculado: <span className="font-medium">{selectedClient.name}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  O autor exibido na landing deve ser preenchido no formulário ao lado.
                </p>
              </div>
            )}
          </div>

          <div className="space-y-4 rounded-md border p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold">{form.id ? "Editar depoimento" : "Novo depoimento"}</h3>
                <p className="text-sm text-muted-foreground">
                  Cadastre a mensagem autorizada e informe separadamente quem assina o depoimento.
                </p>
              </div>
              {form.id && (
                <Button type="button" variant="outline" size="sm" onClick={() => {
                  setForm(emptyForm);
                  setSelectedClient(null);
                }}>
                  Novo
                </Button>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="admin-testimonial-author">Autor exibido na landing *</Label>
                <Input
                  id="admin-testimonial-author"
                  value={form.authorName}
                  onChange={(event) => setForm((current) => ({ ...current, authorName: event.target.value }))}
                  placeholder="Nome da pessoa que autorizou a mensagem"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-testimonial-role">Cargo/contexto exibido</Label>
                <Input
                  id="admin-testimonial-role"
                  value={form.authorRole || ""}
                  onChange={(event) => setForm((current) => ({ ...current, authorRole: event.target.value }))}
                  placeholder="Dono, gerente..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-testimonial-message">Mensagem *</Label>
              <Textarea
                id="admin-testimonial-message"
                value={form.message}
                onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
                maxLength={700}
                placeholder="Cole ou escreva a mensagem autorizada pelo cliente"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="admin-testimonial-rating">Nota</Label>
                <Input
                  id="admin-testimonial-rating"
                  type="number"
                  min={1}
                  max={5}
                  value={form.rating}
                  onChange={(event) => setForm((current) => ({ ...current, rating: Number(event.target.value) }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-testimonial-status">Status</Label>
                <select
                  id="admin-testimonial-status"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.status}
                  onChange={(event) => setForm((current) => ({
                    ...current,
                    status: event.target.value as AdminTestimonialPayload["status"],
                  }))}
                >
                  <option value="pending">Em análise</option>
                  <option value="published">Publicado</option>
                  <option value="rejected">Rejeitado</option>
                  <option value="archived">Arquivado</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-testimonial-source">Origem</Label>
                <select
                  id="admin-testimonial-source"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.source}
                  onChange={(event) => setForm((current) => ({
                    ...current,
                    source: event.target.value as AdminTestimonialPayload["source"],
                  }))}
                >
                  <option value="super_admin">Super Admin</option>
                  <option value="external">Externo</option>
                  <option value="imported">Importado</option>
                  <option value="app">App</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-testimonial-order">Ordem</Label>
                <Input
                  id="admin-testimonial-order"
                  type="number"
                  value={form.displayOrder}
                  onChange={(event) => setForm((current) => ({ ...current, displayOrder: Number(event.target.value) }))}
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <div>
                <Label htmlFor="admin-testimonial-featured">Destacar na landing</Label>
                <p className="text-xs text-muted-foreground">Depoimentos destacados aparecem primeiro.</p>
              </div>
              <Switch
                id="admin-testimonial-featured"
                checked={form.isFeatured}
                onCheckedChange={(checked) => setForm((current) => ({ ...current, isFeatured: checked }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-testimonial-public-note">Nota pública opcional</Label>
              <Input
                id="admin-testimonial-public-note"
                value={form.publicNote || ""}
                onChange={(event) => setForm((current) => ({ ...current, publicNote: event.target.value }))}
                placeholder="Ex.: Usa Pubfy no salão e delivery"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-testimonial-internal-note">Observação interna</Label>
              <Textarea
                id="admin-testimonial-internal-note"
                value={form.internalNotes || ""}
                onChange={(event) => setForm((current) => ({ ...current, internalNotes: event.target.value }))}
                placeholder="Origem da mensagem, autorização, contexto do contato..."
              />
            </div>

            <div className="flex justify-end">
              <Button onClick={() => saveMutation.mutate()} disabled={!canSave}>
                {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {form.restaurantId ? "Salvar depoimento" : "Vincule um restaurante"}
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-sm font-semibold">Depoimentos cadastrados</h3>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="todos">Todos</option>
              <option value="pending">Em análise</option>
              <option value="published">Publicados</option>
              <option value="rejected">Rejeitados</option>
              <option value="archived">Arquivados</option>
            </select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Restaurante</TableHead>
                <TableHead>Mensagem</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Nota</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {testimonialsQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : (
                testimonialsQuery.data?.map((testimonial) => (
                  <TableRow key={testimonial.id}>
                    <TableCell>
                      <div className="font-medium">{testimonial.client_name || testimonial.restaurant_name}</div>
                      <div className="text-xs text-muted-foreground">{testimonial.author_name}</div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-md truncate">{testimonial.message}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={testimonial.status === "published" ? "default" : "outline"}>
                        {statusLabel[testimonial.status] || testimonial.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{sourceLabel[testimonial.source] || testimonial.source}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-orange text-orange" />
                        {testimonial.rating}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(testimonial)}>
                        <Edit2 className="mr-1 h-4 w-4" />
                        Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}

              {!testimonialsQuery.isLoading && !testimonialsQuery.data?.length && (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    Nenhum depoimento encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
