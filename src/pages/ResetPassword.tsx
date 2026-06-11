import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { PublicSeo } from "@/components/seo/PublicSeo";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [validSession, setValidSession] = useState<boolean | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Supabase places the recovery token in the URL hash and auto-creates a session
    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (session && event === "SIGNED_IN")) {
        setValidSession(true);
      }
    });

    // Also check current session in case event was missed
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setValidSession(true);
      else if (validSession === null) {
        // Wait briefly for the event before declaring invalid
        setTimeout(() => {
          supabase.auth.getSession().then(({ data: { session: s } }) => {
            setValidSession(!!s);
          });
        }, 1500);
      }
    });

    return () => {
      subscription.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) return "A senha deve ter no mínimo 8 caracteres.";
    if (!/[A-Z]/.test(pwd)) return "Inclua pelo menos uma letra maiúscula.";
    if (!/[a-z]/.test(pwd)) return "Inclua pelo menos uma letra minúscula.";
    if (!/[0-9]/.test(pwd)) return "Inclua pelo menos um número.";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validatePassword(password);
    if (validation) {
      toast({ variant: "destructive", title: "Senha inválida", description: validation });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Senhas não coincidem",
        description: "Digite a mesma senha nos dois campos.",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      setSuccess(true);
      toast({
        title: "Senha redefinida",
        description: "Sua senha foi atualizada com sucesso.",
      });

      // Sign out so the user logs in fresh with the new password
      setTimeout(async () => {
        await supabase.auth.signOut();
        navigate("/login");
      }, 2000);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao redefinir senha",
        description: error instanceof Error ? error.message : "Tente novamente.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (validSession === false) {
    return (
      <>
      <PublicSeo
        title="Link inválido | Pubfy"
        description="Solicite um novo link para redefinir sua senha na Pubfy."
        path={location.pathname}
        noIndex
      />
      <div className="min-h-screen w-full flex items-center justify-center bg-beige/20 p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">
              Link inválido ou expirado
            </CardTitle>
            <CardDescription className="text-center">
              O link de redefinição de senha não é válido ou já expirou.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex flex-col gap-2">
            <Link to="/esqueci-senha" className="w-full">
              <Button className="w-full bg-green hover:bg-green-dark text-white">
                Solicitar novo link
              </Button>
            </Link>
            <Link to="/login" className="w-full">
              <Button variant="ghost" className="w-full">
                Voltar para o login
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
      </>
    );
  }

  return (
    <>
    <PublicSeo
      title="Redefinir senha | Pubfy"
      description="Defina uma nova senha segura para sua conta Pubfy."
      path={location.pathname}
      noIndex
    />
    <div className="min-h-screen w-full flex items-center justify-center bg-beige/20 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <Link to="/" className="flex items-center">
              <span className="text-navy text-2xl font-bold">Pubfy</span>
            </Link>
          </div>
          <CardTitle className="text-2xl font-bold text-center">
            Redefinir senha
          </CardTitle>
          <CardDescription className="text-center">
            {success
              ? "Senha atualizada! Redirecionando para o login..."
              : "Crie uma nova senha para sua conta."}
          </CardDescription>
        </CardHeader>

        {success ? (
          <CardContent className="flex flex-col items-center py-8 space-y-3">
            <div className="rounded-full bg-green/10 p-3">
              <CheckCircle2 className="h-10 w-10 text-green" />
            </div>
          </CardContent>
        ) : (
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Nova senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={validSession === null}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-navy/75 hover:text-navy"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-navy/75">
                  Mín. 8 caracteres, com maiúscula, minúscula e número.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={validSession === null}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button
                type="submit"
                className="w-full bg-green hover:bg-green-dark text-white"
                disabled={loading || validSession === null}
              >
                {validSession === null
                  ? "Validando link..."
                  : loading
                  ? "Redefinindo..."
                  : "Redefinir senha"}
              </Button>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
    </>
  );
};

export default ResetPassword;
