import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Gift, Link2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PublicSeo } from "@/components/seo/PublicSeo";
import { fetchReferralProgramPublicSettings } from "@/services/referralService";
import type { ReferralProgramPublicSettings } from "@/types/referral";
import { useAuth } from "@/hooks/useAuthContext";

function formatPausedUntil(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("pt-BR");
}

export default function AffiliateLanding() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<ReferralProgramPublicSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchReferralProgramPublicSettings();
        if (!cancelled) setSettings(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const pausedUntilLabel = formatPausedUntil(settings?.paused_until ?? null);

  return (
    <>
      <PublicSeo
        title="Programa de indicações Pubfy"
        description="Indique restaurantes e ganhe comissão recorrente sobre assinaturas pagas."
        path="/indique"
      />

      <div className="mx-auto max-w-4xl space-y-8">
        <div className="space-y-4">
          <p className="text-center text-sm font-medium uppercase tracking-wider text-orange">Programa de indicações</p>
          <h1 className="text-center text-3xl font-bold tracking-tight text-navy md:text-4xl">
            Indique restaurantes e acompanhe suas comissões
          </h1>
          <p className="mx-auto max-w-2xl text-center text-navy/75">
            Compartilhe seu link, ajude estabelecimentos a vender pelo canal próprio no Pubfy e receba
            percentual enquanto a assinatura deles estiver ativa e paga.
          </p>
        </div>

        {!loading && settings?.show_pause_message ? (
          <Alert className="border-amber-300 bg-amber-50 text-left text-amber-900">
            <AlertDescription>
              {settings.paused_message ||
                "No momento não estamos aceitando novas indicações."}
              {pausedUntilLabel ? (
                <span className="mt-1 block text-sm opacity-90">
                  Previsão de retorno: {pausedUntilLabel}
                </span>
              ) : null}
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-4 text-left md:grid-cols-3">
          <Card className="border-green/20">
            <CardHeader>
              <Link2 className="h-5 w-5 text-green" />
              <CardTitle className="text-base text-navy">Seu link</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-navy/70">
              Material e painel com link personalizado para cadastro de restaurantes.
            </CardContent>
          </Card>
          <Card className="border-green/20">
            <CardHeader>
              <Gift className="h-5 w-5 text-green" />
              <CardTitle className="text-base text-navy">Atribuição</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-navy/70">
              Janela de {settings?.attribution_window_days ?? 90} dias entre o clique e o cadastro do restaurante.
            </CardContent>
          </Card>
          <Card className="border-green/20">
            <CardHeader>
              <Wallet className="h-5 w-5 text-green" />
              <CardTitle className="text-base text-navy">Comissão</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-navy/70">
              Recorrente sobre mensalidade ou anuidade paga, com saque mínimo de{" "}
              {settings?.min_payout_amount?.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              }) ?? "R$ 50,00"}
              .
            </CardContent>
          </Card>
        </div>

        <p className="text-center text-xs text-navy/70">
          <Link to="/indique/termos" className="underline-offset-4 hover:text-navy hover:underline">
            Termos do programa
          </Link>
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          {user ? (
            <Button className="bg-green hover:bg-green-dark text-white" asChild>
              <Link to="/indique/painel">Ir para meu painel</Link>
            </Button>
          ) : (
            <>
              <Button className="bg-green hover:bg-green-dark text-white" asChild>
                <Link to="/indique/cadastro">Quero ser afiliado</Link>
              </Button>
              <Button variant="outline" className="border-green/40 hover:bg-green/10" asChild>
                <Link to="/login">Já tenho conta</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
