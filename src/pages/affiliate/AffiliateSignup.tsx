import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuthContext";
import { fetchOrCreateAffiliateProfile, fetchReferralProgramPublicSettings } from "@/services/referralService";
import { toast } from "@/components/ui/sonner-toast";

export default function AffiliateSignup() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [blocked, setBlocked] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;

    (async () => {
      try {
        const settings = await fetchReferralProgramPublicSettings();
        if (!settings.program_enabled || !settings.accepting_new_referrals) {
          setBlocked(
            settings.paused_message || "No momento não estamos aceitando novos afiliados.",
          );
        }
      } catch {
        setBlocked("Não foi possível carregar o programa de indicações.");
      }
    })();
  }, [user, authLoading]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) {
      navigate("/login");
      return;
    }
    if (!acceptTerms) {
      toast.error("Aceite os termos para continuar.");
      return;
    }

    setSubmitting(true);
    try {
      await fetchOrCreateAffiliateProfile({
        displayName,
        acceptTerms: true,
      });
      toast.success("Perfil de afiliado ativado.");
      navigate("/indique/painel");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao ativar perfil de afiliado.");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return <p className="text-center text-muted-foreground">Carregando...</p>;
  }

  if (!user) {
    return (
        <Card className="mx-auto max-w-md">
          <CardHeader>
            <CardTitle className="text-navy">Entre na sua conta</CardTitle>
            <CardDescription>
              Para participar do programa, faça login ou crie uma conta no Pubfy.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button className="bg-green hover:bg-green-dark text-white" asChild>
              <Link to="/login">Entrar</Link>
            </Button>
            <Button variant="outline" className="border-green/40 hover:bg-green/10" asChild>
              <Link to="/indique/criar-conta">Criar conta de afiliado</Link>
            </Button>
          </CardContent>
        </Card>
    );
  }

  return (
      <Card className="mx-auto max-w-lg">
        <CardHeader>
          <CardTitle className="text-navy">Ativar perfil de afiliado</CardTitle>
          <CardDescription>
            Qualquer usuário cadastrado pode indicar restaurantes ao Pubfy.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {blocked ? (
            <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">{blocked}</p>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="display-name">
                  Nome para exibição (opcional)
                </Label>
                <Input
                  id="display-name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>
              <label className="flex items-start gap-2 text-sm text-navy/80">
                <Checkbox checked={acceptTerms} onCheckedChange={(v) => setAcceptTerms(v === true)} />
                <span>
                  Li e aceito os{" "}
                  <Link to="/indique/termos" className="text-green underline-offset-4 hover:underline">
                    termos do programa de indicações
                  </Link>{" "}
                  e autorizo o uso dos meus dados para pagamento de comissões.
                </span>
              </label>
              <Button type="submit" className="w-full bg-green hover:bg-green-dark text-white" disabled={submitting}>
                {submitting ? "Ativando..." : "Ativar e ir para o painel"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
  );
}
