
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
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
import { useAuth } from "@/hooks/useAuth";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, user } = useAuth();
  const { isSuperAdmin, loading: adminLoading } = useSuperAdmin();
  const navigate = useNavigate();

  // Effect to handle redirection after login is successful
  useEffect(() => {
    if (user && !adminLoading) {
      console.log("User logged in:", user.id);
      console.log("Is super admin:", isSuperAdmin);
      
      if (isSuperAdmin) {
        console.log("Redirecting to admin panel...");
        navigate("/admin");
      } else {
        console.log("Redirecting to dashboard...");
        navigate("/dashboard");
      }
    }
  }, [user, isSuperAdmin, adminLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      console.log("Attempting login for:", email);
      const { error } = await signIn(email, password);
      
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
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-beige/20 px-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <Link to="/" className="flex items-center">
              <span className="text-navy text-2xl font-bold">Cardápio<span className="text-orange">Pronto</span></span>
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
          </CardContent>
          <CardFooter className="flex flex-col">
            <Button 
              type="submit" 
              className="w-full bg-green hover:bg-green-dark text-white"
              disabled={loading}
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
  );
};

export default Login;
