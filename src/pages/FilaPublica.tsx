import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { estimateWaitMinutes } from "@/lib/waitlist";
import {
  cancelPublicWaitlist,
  getPublicWaitlistStatus,
  joinPublicWaitlist,
  type PublicWaitlistStatus,
} from "@/services/waitlistService";

const storageKey = (slug: string) => `pubfy-fila-${slug}`;

const friendlyError = (message: string) => {
  if (/rate|limite|too many/i.test(message)) return "Muitas tentativas. Aguarde alguns minutos.";
  if (/não encontrado/i.test(message)) return "Restaurante não encontrado.";
  if (/Telefone/i.test(message)) return "Telefone inválido. Use DDD + número.";
  if (/Nome/i.test(message)) return "Informe seu nome.";
  return "Não foi possível entrar na fila. Tente novamente.";
};

const FilaPublica = () => {
  const { slug = "" } = useParams();
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(storageKey(slug)));
  const [status, setStatus] = useState<PublicWaitlistStatus | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", party: "2" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.title = "Lista de espera | Pubfy";
  }, []);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const s = await getPublicWaitlistStatus(token);
      if (!s) {
        localStorage.removeItem(storageKey(slug));
        setToken(null);
      }
      setStatus(s);
    } catch {
      /* mantém último estado; tenta de novo no próximo ciclo */
    }
  }, [token, slug]);

  useEffect(() => {
    refresh();
    if (!token) return;
    const t = window.setInterval(refresh, 20000);
    return () => window.clearInterval(t);
  }, [refresh, token]);

  const join = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const party = Number(form.party);
    if (form.name.trim().length < 2) return setError("Informe seu nome.");
    const digits = form.phone.replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 11) return setError("Informe seu WhatsApp com DDD para ser avisado.");
    if (!Number.isInteger(party) || party < 1 || party > 50) return setError("Quantidade de pessoas inválida.");
    setBusy(true);
    try {
      const t = await joinPublicWaitlist(slug, form.name.trim(), digits, party);
      localStorage.setItem(storageKey(slug), t);
      setToken(t);
    } catch (err) {
      setError(friendlyError((err as Error).message));
    } finally {
      setBusy(false);
    }
  };

  const leave = async () => {
    if (!token || !window.confirm("Sair da lista de espera?")) return;
    setBusy(true);
    try {
      await cancelPublicWaitlist(token);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const restart = () => {
    localStorage.removeItem(storageKey(slug));
    setToken(null);
    setStatus(null);
  };

  const active = status && (status.status === "waiting" || status.status === "notified");

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        {!token || !status ? (
          <>
            <CardHeader>
              <CardTitle>Lista de espera</CardTitle>
              <CardDescription>Entre na fila e acompanhe sua vez pelo celular. Avisamos pelo WhatsApp.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={join} className="space-y-4">
                <div className="space-y-1"><Label htmlFor="f-name">Seu nome</Label>
                  <Input id="f-name" autoComplete="name" maxLength={80} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div className="space-y-1"><Label htmlFor="f-phone">WhatsApp</Label>
                  <Input id="f-phone" inputMode="tel" autoComplete="tel" placeholder="(11) 98888-7777" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                <div className="space-y-1"><Label htmlFor="f-party">Quantas pessoas?</Label>
                  <Input id="f-party" type="number" min={1} max={50} value={form.party} onChange={(e) => setForm({ ...form, party: e.target.value })} /></div>
                {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={busy}>{busy ? "Entrando..." : "Entrar na fila"}</Button>
              </form>
            </CardContent>
          </>
        ) : (
          <>
            <CardHeader>
              <CardDescription>{status.restaurantName}</CardDescription>
              <CardTitle>Olá, {status.customerName}!</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-center" aria-live="polite">
              {status.status === "waiting" && (
                <>
                  <p className="text-sm text-muted-foreground">Sua posição na fila</p>
                  <p className="text-6xl font-bold text-primary">{status.position}º</p>
                  <p className="text-sm text-muted-foreground">
                    Estimativa: cerca de {estimateWaitMinutes(status.position - 1 || 1, null)} min · {status.partySize} {status.partySize === 1 ? "pessoa" : "pessoas"}
                  </p>
                </>
              )}
              {status.status === "notified" && <p className="text-2xl font-bold text-primary">Sua mesa está pronta! Vá até a recepção.</p>}
              {status.status === "seated" && <p className="text-lg font-semibold">Bom apetite! Você já foi atendido.</p>}
              {(status.status === "canceled" || status.status === "no_show") && <p className="text-lg font-semibold">Você saiu da lista de espera.</p>}
              <p className="text-xs text-muted-foreground">Esta página se atualiza sozinha.</p>
              {active ? (
                <Button variant="outline" className="w-full" onClick={leave} disabled={busy}>Sair da fila</Button>
              ) : (
                <Button className="w-full" onClick={restart}>Entrar na fila novamente</Button>
              )}
            </CardContent>
          </>
        )}
      </Card>
    </main>
  );
};

export default FilaPublica;
