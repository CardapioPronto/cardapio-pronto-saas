import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Copy, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useAuth } from "@/hooks/useAuthContext";
import { buildRestaurantSignupUrl } from "@/lib/referralAttribution";
import { formatCentsToBrl } from "@/lib/formatCents";
import { AffiliateReferralQr } from "@/components/affiliate/AffiliateReferralQr";
import {
  fetchAffiliateDashboard,
  requestAffiliatePayout,
  updateAffiliatePayoutProfile,
} from "@/services/referralService";
import type { AffiliateDashboard } from "@/types/referral";
import { toast } from "@/components/ui/sonner-toast";

async function copyText(value: string, label: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copiado.`);
  } catch {
    toast.error("Não foi possível copiar.");
  }
}

const commissionStatusLabel: Record<string, string> = {
  pending: "Em carência",
  approved: "Aprovada",
  paid: "Paga",
  reversed: "Estornada",
};

export default function AffiliatePanel() {
  const { user, loading: authLoading } = useAuth();
  const [dashboard, setDashboard] = useState<AffiliateDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [pixKey, setPixKey] = useState("");
  const [documentCpf, setDocumentCpf] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [requestingPayout, setRequestingPayout] = useState(false);

  const loadDashboard = useCallback(async () => {
    try {
      const data = await fetchAffiliateDashboard();
      setDashboard(data);
      if (data.profile) {
        setPixKey(data.profile.payout_pix_key ?? "");
        setDocumentCpf(data.profile.document_cpf ?? "");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao carregar painel";
      if (message.includes("não encontrado") || message.includes("desativado")) {
        setDashboard({ has_profile: false });
      } else {
        toast.error(message);
      }
    }
  }, []);

  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      if (!cancelled) {
        await loadDashboard();
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading, loadDashboard]);

  const handleSavePayoutProfile = async () => {
    setSavingProfile(true);
    try {
      await updateAffiliatePayoutProfile({
        payoutPixKey: pixKey,
        documentCpf: documentCpf,
      });
      toast.success("Dados de pagamento salvos.");
      await loadDashboard();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar dados.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleRequestPayout = async () => {
    setRequestingPayout(true);
    try {
      const result = await requestAffiliatePayout();
      toast.success(`Saque solicitado: ${formatCentsToBrl(result.amount_cents)}`);
      await loadDashboard();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao solicitar saque.");
    } finally {
      setRequestingPayout(false);
    }
  };

  if (authLoading || loading) {
    return <p className="text-center text-muted-foreground">Carregando painel...</p>;
  }

  if (!user) {
    return (
      <Card className="mx-auto max-w-md">
        <CardHeader>
          <CardTitle className="text-navy">Faça login</CardTitle>
          <CardDescription>Acesse sua conta para ver o painel de indicações.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="bg-green hover:bg-green-dark text-white" asChild>
            <Link to="/login">Entrar</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!dashboard?.has_profile || !dashboard.profile) {
    return (
      <Card className="mx-auto max-w-md">
        <CardHeader>
          <CardTitle className="text-navy">Ative seu perfil</CardTitle>
          <CardDescription>
            Você ainda não participa do programa de indicações.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="bg-green hover:bg-green-dark text-white" asChild>
            <Link to="/indique/cadastro">Ativar perfil de afiliado</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const profile = dashboard.profile;
  const balances = dashboard.balances;
  const signupLink = buildRestaurantSignupUrl(profile.referral_code);
  const canRequestPayout =
    !dashboard.open_payout_request &&
    (balances?.approved_cents ?? 0) >= (balances?.min_payout_cents ?? 5000);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy">Painel do afiliado</h1>
          <p className="text-muted-foreground">Código: {profile.referral_code}</p>
        </div>
        <Button variant="outline" className="border-green/40 hover:bg-green/10" onClick={() => loadDashboard()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Atualizar
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-green/20">
          <CardHeader className="pb-2">
            <CardDescription>Em carência</CardDescription>
            <CardTitle className="text-navy">{formatCentsToBrl(balances?.pending_cents ?? 0)}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-green/20">
          <CardHeader className="pb-2">
            <CardDescription>Disponível para saque</CardDescription>
            <CardTitle className="text-green">{formatCentsToBrl(balances?.approved_cents ?? 0)}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-green/20">
          <CardHeader className="pb-2">
            <CardDescription>Já recebido</CardDescription>
            <CardTitle className="text-navy">{formatCentsToBrl(balances?.paid_cents ?? 0)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="border-green/20">
        <CardHeader>
          <CardTitle className="text-navy">Link de indicação</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex flex-1 flex-wrap gap-2">
            <Button variant="outline" className="border-green/40 hover:bg-green/10" onClick={() => copyText(profile.referral_code, "Código")}>
              <Copy className="mr-2 h-4 w-4" />
              Copiar código
            </Button>
            <Button className="bg-green hover:bg-green-dark text-white" onClick={() => copyText(signupLink, "Link")}>
              <Copy className="mr-2 h-4 w-4" />
              Copiar link
            </Button>
            <Button variant="link" className="text-green" asChild>
              <Link to="/indique/materiais">Materiais de campanha</Link>
            </Button>
          </div>
          <AffiliateReferralQr signupLink={signupLink} />
        </CardContent>
      </Card>

      <Card className="border-green/20">
        <CardHeader>
          <CardTitle className="text-navy">Dados para saque</CardTitle>
          <CardDescription>
            Mínimo para solicitar: {formatCentsToBrl(balances?.min_payout_cents ?? 5000)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>CPF</Label>
              <Input
                value={documentCpf}
                onChange={(e) => setDocumentCpf(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Chave PIX</Label>
              <Input
                value={pixKey}
                onChange={(e) => setPixKey(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="border-green/40 hover:bg-green/10" onClick={handleSavePayoutProfile} disabled={savingProfile}>
              {savingProfile ? "Salvando..." : "Salvar dados"}
            </Button>
            <Button
              className="bg-green hover:bg-green-dark text-white"
              onClick={handleRequestPayout}
              disabled={!canRequestPayout || requestingPayout}
            >
              {requestingPayout ? "Solicitando..." : "Solicitar saque"}
            </Button>
          </div>
          {dashboard.open_payout_request ? (
            <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Saque em análise: {formatCentsToBrl(dashboard.open_payout_request.amount_cents)} (
              {dashboard.open_payout_request.status})
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-green/20">
        <CardHeader>
          <CardTitle className="text-navy">Restaurantes indicados</CardTitle>
        </CardHeader>
        <CardContent>
          {(dashboard.referrals?.length ?? 0) > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Restaurante</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Assinatura</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dashboard.referrals?.map((row) => (
                  <TableRow key={row.restaurant_id}>
                    <TableCell>{row.restaurant_name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(row.attributed_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.subscription_status ?? "—"} / {row.billing_cycle ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">
              Ainda não há restaurantes atribuídos ao seu código.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="border-green/20">
        <CardHeader>
          <CardTitle className="text-navy">Comissões recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {(dashboard.recent_commissions?.length ?? 0) > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ciclo</TableHead>
                  <TableHead>Pagamento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dashboard.recent_commissions?.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      {formatCentsToBrl(row.commission_amount_cents)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {commissionStatusLabel[row.status] ?? row.status}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{row.billing_cycle ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.restaurant_paid_at
                        ? new Date(row.restaurant_paid_at).toLocaleDateString("pt-BR")
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">
              Quando os restaurantes indicados pagarem assinatura, suas comissões aparecerão aqui.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
