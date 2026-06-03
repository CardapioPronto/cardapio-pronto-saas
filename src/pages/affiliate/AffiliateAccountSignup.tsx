import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { MailCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PublicSeo } from "@/components/seo/PublicSeo";
import { UserInfoForm } from "@/components/cadastro/UserInfoForm";
import { useAuth } from "@/hooks/useAuthContext";
import { toast } from "@/hooks/use-toast";

export default function AffiliateAccountSignup() {
  const location = useLocation();
  const { signUp } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      const { error } = await signUp(
        email.trim().toLowerCase(),
        password,
        {
          name: name.trim(),
          role: "affiliate",
          signup_intent: "affiliate_signup",
        },
        {
          emailRedirectTo: `${window.location.origin}/indique/cadastro`,
        },
      );
      if (error) throw error;

      toast({
        title: "Confirme seu e-mail",
        description: "Enviamos um link para ativar sua conta de afiliado.",
      });
      setVerificationSent(true);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro no cadastro",
        description: error instanceof Error ? error.message : "Não foi possível criar sua conta.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (verificationSent) {
    return (
      <>
        <PublicSeo
          title="Verifique seu e-mail | Pubfy"
          description="Confirme seu e-mail para ativar a conta de afiliado no programa de indicações."
          path={location.pathname}
          noIndex
        />
        <div className="min-h-screen flex items-center justify-center bg-beige/20 px-4">
          <Card className="w-full max-w-lg shadow-lg">
            <CardHeader className="space-y-4 text-center">
              <div className="flex justify-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green/10 text-green">
                  <MailCheck className="h-7 w-7" aria-hidden="true" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold">Verifique seu e-mail</CardTitle>
              <CardDescription>
                Enviamos um link para {email.trim().toLowerCase()}. Após confirmar, entre em
                <strong> /indique/cadastro</strong> para ativar seu perfil de afiliado.
              </CardDescription>
            </CardHeader>
            <CardFooter className="flex flex-col gap-3">
              <Button asChild className="w-full bg-green hover:bg-green-dark text-white">
                <Link to="/login">Ir para login</Link>
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={() => setVerificationSent(false)}>
                Editar cadastro
              </Button>
            </CardFooter>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <PublicSeo
        title="Cadastro de afiliado | Pubfy"
        description="Crie uma conta para participar do programa de indicações da Pubfy sem cadastrar restaurante."
        path={location.pathname}
        noIndex
      />
      <div className="min-h-screen flex items-center justify-center bg-beige/20 px-4">
        <Card className="w-full max-w-lg shadow-lg">
          <CardHeader className="space-y-1">
            <div className="flex justify-center mb-4">
              <Link to="/" className="flex items-center">
                <span className="text-navy text-2xl font-bold">Pubfy</span>
              </Link>
            </div>
            <CardTitle className="text-2xl font-bold text-center">Criar conta de afiliado</CardTitle>
            <CardDescription className="text-center">
              Cadastro sem restaurante. Depois da confirmação, ative seu perfil em /indique/cadastro.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <CardContent className="space-y-4">
              <UserInfoForm
                name={name}
                setName={setName}
                email={email}
                setEmail={setEmail}
                password={password}
                setPassword={setPassword}
              />
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
              <Button
                type="submit"
                className="w-full bg-green hover:bg-green-dark text-white"
                disabled={loading}
              >
                {loading ? "Criando conta..." : "Criar conta de afiliado"}
              </Button>
              <p className="text-sm text-center text-navy/70">
                Já tem conta?{" "}
                <Link to="/login" className="text-green hover:underline">
                  Faça login
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </>
  );
}
