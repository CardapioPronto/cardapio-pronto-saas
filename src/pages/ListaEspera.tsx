import { useCallback, useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useRestaurantAccess } from "@/hooks/useRestaurantAccess";
import { supabase } from "@/integrations/supabase/client";
import { averageWaitMinutes, buildWhatsAppCallLink, minutesBetween } from "@/lib/waitlist";
import {
  addWaitlistEntry,
  fetchTodayWaitlist,
  updateWaitlistStatus,
  type WaitlistEntry,
  type WaitlistStatus,
} from "@/services/waitlistService";
import { Bell, Check, Copy, MessageCircle, RefreshCw, UserX, X } from "lucide-react";

const STATUS_LABEL: Record<WaitlistStatus, string> = {
  waiting: "Aguardando",
  notified: "Chamado",
  seated: "Sentou",
  canceled: "Desistiu",
  no_show: "Não veio",
};

const formatPhone = (p: string | null) => {
  if (!p) return "";
  const d = p.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
  return d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : d.length === 10 ? `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}` : p;
};

const ListaEspera = () => {
  const { activeRestaurantId } = useRestaurantAccess();
  const { toast } = useToast();
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [mesas, setMesas] = useState<{ id: string; label: string }[]>([]);
  const [restaurant, setRestaurant] = useState<{ name: string; slug: string | null } | null>(null);
  const [qr, setQr] = useState<string>("");
  const [form, setForm] = useState({ name: "", phone: "", party: "2", notes: "" });
  const [seatTable, setSeatTable] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [, setTick] = useState(0);

  const load = useCallback(async () => {
    if (!activeRestaurantId) return;
    setLoading(true);
    try {
      setEntries(await fetchTodayWaitlist(activeRestaurantId));
    } catch (error) {
      toast({ title: "Não foi possível carregar a fila", description: (error as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [activeRestaurantId, toast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!activeRestaurantId) return;
    supabase.from("restaurants").select("name, slug").eq("id", activeRestaurantId).maybeSingle()
      .then(({ data }) => data && setRestaurant(data));
    supabase.from("mesas").select("id, number, name").eq("restaurant_id", activeRestaurantId).eq("is_active", true).order("number")
      .then(({ data }) => setMesas((data ?? []).map((m) => ({ id: m.id, label: m.name || `Mesa ${m.number}` }))));

    const channel = supabase
      .channel(`waitlist-${activeRestaurantId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "waitlist_entries", filter: `restaurant_id=eq.${activeRestaurantId}` }, () => load())
      .subscribe();
    const timer = window.setInterval(() => setTick((t) => t + 1), 30000);
    return () => {
      supabase.removeChannel(channel);
      window.clearInterval(timer);
    };
  }, [activeRestaurantId, load]);

  const publicUrl = restaurant?.slug ? `${window.location.origin}/fila/${restaurant.slug}` : "";

  useEffect(() => {
    if (publicUrl) QRCode.toDataURL(publicUrl, { width: 320, margin: 1 }).then(setQr).catch(() => setQr(""));
  }, [publicUrl]);

  const active = useMemo(() => entries.filter((e) => e.status === "waiting" || e.status === "notified"), [entries]);
  const finished = useMemo(() => entries.filter((e) => !["waiting", "notified"].includes(e.status)).reverse(), [entries]);
  const avg = averageWaitMinutes(entries);
  const peopleWaiting = active.reduce((s, e) => s + e.party_size, 0);
  const seatedCount = entries.filter((e) => e.status === "seated").length;
  const lostCount = entries.filter((e) => e.status === "canceled" || e.status === "no_show").length;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRestaurantId) return;
    const party = Number(form.party);
    if (form.name.trim().length < 2) return toast({ title: "Informe o nome do cliente", variant: "destructive" });
    const digits = form.phone.replace(/\D/g, "");
    if (digits && (digits.length < 10 || digits.length > 11)) return toast({ title: "Telefone inválido", description: "Use DDD + número.", variant: "destructive" });
    if (!Number.isInteger(party) || party < 1 || party > 50) return toast({ title: "Quantidade de pessoas inválida", variant: "destructive" });
    setSaving(true);
    try {
      await addWaitlistEntry({ restaurantId: activeRestaurantId, name: form.name, phone: form.phone, partySize: party, notes: form.notes });
      setForm({ name: "", phone: "", party: "2", notes: "" });
      await load();
    } catch (error) {
      toast({ title: "Não foi possível adicionar", description: (error as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (entry: WaitlistEntry, status: WaitlistStatus) => {
    try {
      await updateWaitlistStatus(entry.id, status, status === "seated" ? seatTable[entry.id] || null : undefined);
      if (status === "notified" && entry.customer_phone && restaurant) {
        window.open(buildWhatsAppCallLink(entry.customer_phone, entry.customer_name, restaurant.name), "_blank", "noopener");
      }
      await load();
    } catch (error) {
      toast({ title: "Não foi possível atualizar", description: (error as Error).message, variant: "destructive" });
    }
  };

  return (
    <DashboardLayout title="Lista de espera">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Fila de hoje</h2>
            <p className="text-sm text-muted-foreground">Adicione clientes na recepção ou deixe que entrem pelo QR Code. Atualiza sozinha.</p>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Atualizar
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Grupos na fila", String(active.length)],
            ["Pessoas aguardando", String(peopleWaiting)],
            ["Espera média hoje", avg === null ? "—" : `${avg} min`],
            ["Sentaram / desistiram", `${seatedCount} / ${lostCount}`],
          ].map(([label, value]) => (
            <Card key={label}>
              <CardHeader className="pb-2"><CardDescription>{label}</CardDescription></CardHeader>
              <CardContent><p className="text-2xl font-bold">{value}</p></CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Aguardando</CardTitle>
              <CardDescription>Ordem de chegada. "Chamar" abre o WhatsApp do cliente com o aviso pronto.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {active.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Ninguém na fila agora.</p>}
              {active.map((entry, index) => {
                const waited = minutesBetween(entry.created_at);
                return (
                  <div key={entry.id} className="flex flex-col gap-3 rounded-lg border p-3 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{index + 1}. {entry.customer_name}</span>
                        <Badge variant="secondary">{entry.party_size} {entry.party_size === 1 ? "pessoa" : "pessoas"}</Badge>
                        <Badge variant={entry.status === "notified" ? "default" : "outline"}>{STATUS_LABEL[entry.status]}</Badge>
                        {entry.source === "public" && <Badge variant="outline">QR Code</Badge>}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Esperando há {waited} min{entry.customer_phone ? ` · ${formatPhone(entry.customer_phone)}` : ""}
                        {entry.notes ? ` · ${entry.notes}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {mesas.length > 0 && (
                        <Select value={seatTable[entry.id] ?? ""} onValueChange={(v) => setSeatTable((s) => ({ ...s, [entry.id]: v }))}>
                          <SelectTrigger className="h-9 w-32"><SelectValue placeholder="Mesa" /></SelectTrigger>
                          <SelectContent>{mesas.map((m) => <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>)}</SelectContent>
                        </Select>
                      )}
                      <Button size="sm" variant="outline" onClick={() => changeStatus(entry, "notified")}>
                        {entry.customer_phone ? <MessageCircle className="mr-1 h-4 w-4" /> : <Bell className="mr-1 h-4 w-4" />} Chamar
                      </Button>
                      <Button size="sm" onClick={() => changeStatus(entry, "seated")}><Check className="mr-1 h-4 w-4" /> Sentou</Button>
                      <Button size="sm" variant="ghost" title="Não compareceu" onClick={() => changeStatus(entry, "no_show")}><UserX className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" title="Desistiu" onClick={() => changeStatus(entry, "canceled")}><X className="h-4 w-4" /></Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Adicionar à fila</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={submit} className="space-y-3">
                  <div className="space-y-1"><Label htmlFor="wl-name">Nome</Label>
                    <Input id="wl-name" maxLength={80} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                  <div className="space-y-1"><Label htmlFor="wl-phone">WhatsApp (opcional)</Label>
                    <Input id="wl-phone" inputMode="tel" placeholder="(11) 98888-7777" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                  <div className="space-y-1"><Label htmlFor="wl-party">Pessoas</Label>
                    <Input id="wl-party" type="number" min={1} max={50} value={form.party} onChange={(e) => setForm({ ...form, party: e.target.value })} /></div>
                  <div className="space-y-1"><Label htmlFor="wl-notes">Observação</Label>
                    <Input id="wl-notes" maxLength={300} placeholder="Ex.: cadeirão, área externa" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
                  <Button type="submit" className="w-full" disabled={saving}>{saving ? "Adicionando..." : "Adicionar"}</Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>QR Code da fila</CardTitle>
                <CardDescription>Imprima e deixe na entrada. O cliente entra na fila e acompanha a posição pelo celular.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {publicUrl ? (
                  <>
                    {qr && <img src={qr} alt="QR Code para entrar na lista de espera" className="mx-auto w-48 rounded bg-background p-2" />}
                    <div className="flex gap-2">
                      <Input readOnly value={publicUrl} className="text-xs" />
                      <Button size="icon" variant="outline" aria-label="Copiar link" onClick={() => { navigator.clipboard.writeText(publicUrl); toast({ title: "Link copiado" }); }}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    {qr && <Button asChild variant="outline" className="w-full"><a href={qr} download="qr-lista-de-espera.png">Baixar QR Code</a></Button>}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Defina o endereço do cardápio em Configurações para gerar o QR Code.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {finished.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Atendidos hoje</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {finished.map((e) => (
                <div key={e.id} className="flex flex-wrap items-center justify-between gap-2 border-b py-2 text-sm last:border-0">
                  <span>{e.customer_name} · {e.party_size}p</span>
                  <span className="flex items-center gap-2 text-muted-foreground">
                    {e.seated_at && `esperou ${minutesBetween(e.created_at, e.seated_at)} min`}
                    <Badge variant={e.status === "seated" ? "secondary" : "outline"}>{STATUS_LABEL[e.status]}</Badge>
                    <Button size="sm" variant="ghost" onClick={() => changeStatus(e, "waiting")}>Voltar à fila</Button>
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ListaEspera;
