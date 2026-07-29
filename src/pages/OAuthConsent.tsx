import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PublicSeo } from "@/components/seo/PublicSeo";

interface AuthorizationDetails {
  client?: {
    name?: string;
    uri?: string;
  };
  redirect_url?: string;
  redirect_to?: string;
  scopes?: string[];
}

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<AuthorizationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    (async () => {
      if (!authorizationId) {
        setLoading(false);
        return setError("Requisição de autorização inválida.");
      }

      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/login?next=" + encodeURIComponent(next);
        return;
      }

      const oauth = (supabase.auth as any).oauth;
      if (!oauth) {
        setLoading(false);
        return setError("Servidor OAuth não está disponível no momento.");
      }

      const { data, error } = await oauth.getAuthorizationDetails(authorizationId);
      if (!active) return;

      if (error) {
        setLoading(false);
        return setError(error.message);
      }

      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }

      setDetails(data);
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    const oauth = (supabase.auth as any).oauth;

    if (!oauth) {
      setBusy(false);
      return setError("Servidor OAuth não está disponível no momento.");
    }

    const { data, error } = approve
      ? await oauth.approveAuthorization(authorizationId)
      : await oauth.denyAuthorization(authorizationId);

    if (error) {
      setBusy(false);
      return setError(error.message);
    }

    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      return setError("Nenhum redirecionamento foi retornado pelo servidor de autorização.");
    }

    window.location.href = target;
  }

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-beige/20 p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-green mb-4" />
            <p className="text-navy/70">Carregando detalhes da autorização...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-beige/20 p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl text-center">Autorização não pôde ser carregada</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-navy/70 text-center">{error}</p>
          </CardContent>
          <CardFooter className="justify-center">
            <Button variant="outline" onClick={() => (window.location.href = "/")}>
              Voltar para o início
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const clientName = details?.client?.name ?? "Aplicativo";

  return (
    <>
      <PublicSeo
        title="Autorizar acesso | Pubfy"
        description="Aprove ou negue o acesso de um aplicativo à sua conta Pubfy."
        path="/.lovable/oauth/consent"
        noIndex
      />
      <div className="min-h-screen w-full flex items-center justify-center bg-beige/20 p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="space-y-2 text-center">
            <div className="flex justify-center mb-2">
              <span className="text-navy text-2xl font-bold">Pubfy</span>
            </div>
            <CardTitle className="text-2xl font-bold">Conectar {clientName}</CardTitle>
            <CardDescription>
              {clientName} quer acessar os dados do seu restaurante no Pubfy como você.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-navy/5 p-4 space-y-2">
              <div className="flex items-start gap-3">
                <Check className="h-5 w-5 text-green mt-0.5 shrink-0" />
                <p className="text-sm text-navy/80">
                  Ler produtos, categorias, pedidos, mesas e perfil do restaurante.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <X className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
                <p className="text-sm text-navy/80">
                  Não poderá alterar senha, pagamentos ou dados sensíveis sem permissões adicionais.
                </p>
              </div>
            </div>
            <p className="text-xs text-navy/60 text-center">
              Você pode revogar esse acesso a qualquer momento nas configurações da sua conta.
            </p>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button
              className="w-full bg-green hover:bg-green-dark text-white"
              disabled={busy}
              onClick={() => decide(true)}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
              Aprovar acesso
            </Button>
            <Button
              variant="outline"
              className="w-full"
              disabled={busy}
              onClick={() => decide(false)}
            >
              Negar acesso
            </Button>
          </CardFooter>
        </Card>
      </div>
    </>
  );
}
