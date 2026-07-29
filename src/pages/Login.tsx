
import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuthContext";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { useUserSession } from "@/hooks/useUserSession";
import { createLogger } from "@/lib/log";
import { PublicSeo } from "@/components/seo/PublicSeo";
import { TurnstileWidget } from "@/components/security/TurnstileWidget";

const log = createLogger("login");

const Login = () => {
  const location = useLocation();
  const next = new URLSearchParams(location.search).get("next") ?? "";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaResetKey, setCaptchaResetKey] = useState(0);
  const { signIn, user } = useAuth();
  const { isSuperAdmin, loading: adminLoading } = useSuperAdmin();
  const { appUser, loading: sessionLoading } = useUserSession();
  const navigate = useNavigate();

  const isSameOriginRelative = (value: string) => {
    return value.startsWith("/") && !value.startsWith("//");
  };

  useEffect(() => {
    if (user && !adminLoading && !sessionLoading) {
      const isAffiliateOnly = appUser?.role === "affiliate";
      log.debug("user logged in", { userId: user.id, isSuperAdmin, isAffiliateOnly });

      if (isSameOriginRelative(next)) {
        navigate(next);
        return;
      }

      if (isSuperAdmin) {
        navigate("/admin");
      } else if (isAffiliateOnly) {
        navigate("/indique/painel");
      } else {
        navigate("/dashboard");
      }
    }
  }, [user, isSuperAdmin, adminLoading, sessionLoading, appUser?.role, navigate, next]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!captchaToken) {
      toast({
        variant: "destructive",
        title: "Verificação pendente",
        description: "Aguarde a validação de segurança para acessar sua conta.",
      });
      return;
    }

    setLoading(true);

    try {
      log.debug("attempting login", { email });
      const { error } = await signIn(email, password, { captchaToken });
      
      if (error) {
        throw new Error(error.message || "Credenciais inválidas. Por favor, tente novamente.");
      }
      
      // Login bem-sucedido
      toast({
        title: "Login realizado com sucesso",
        description: "Você será redirecionado em instantes.",
      });
      
      // Redirection is handled by the useEffect
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro no login",
        description: error instanceof Error ? error.message : "Ocorreu um erro inesperado.",
      });
      setCaptchaToken("");
      setCaptchaResetKey((currentKey) => currentKey + 1);
      setLoading(false);
    }
  };

  return (
    <>
      <PublicSeo
        title="Login | Pubfy"
        description="Acesso à sua conta Pubfy — cardápio digital, pedidos e gestão."
        path={location.pathname}
        noIndex
      />
    <div className="min-h-screen w-full flex items-center justify-center bg-beige/20 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <Link to="/" className="flex items-center" aria-label="Pubfy página inicial">
              <span className="text-navy text-2xl font-bold">Pubfy</span>
            </Link>
          </div>
          <CardTitle className="text-2xl font-bold text-center">Login</CardTitle>
          <CardDescription className="text-center">
            Entre com suas credenciais para acessar o sistema
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="seu@email.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Senha</Label>
                <Link to="/esqueci-senha" className="text-sm text-green hover:underline">
                  Esqueceu a senha?
                </Link>
              </div>
              <Input 
                id="password" 
                type="password" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <TurnstileWidget
              key={captchaResetKey}
              action="login"
              onToken={(token) => setCaptchaToken(token ?? "")}
              className="min-h-[65px]"
            />
          </CardContent>
          <CardFooter className="flex flex-col">
            <Button 
              type="submit" 
              className="w-full bg-green hover:bg-green-dark text-white"
              disabled={loading || !captchaToken}
            >
              {loading ? "Entrando..." : "Entrar"}
            </Button>
            <p className="mt-4 text-sm text-center text-navy/70">
              Não tem uma conta?{" "}
              <Link to="/cadastro" className="text-green hover:underline">
                Cadastre-se gratuitamente
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
    </>
  );
};

export default Login;
