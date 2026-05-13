import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Mail } from "lucide-react";
import { PublicSeo } from "@/components/seo/PublicSeo";

const EsqueciSenha = () => {
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setSent(true);
      toast({
        title: "E-mail enviado",
        description: "Verifique sua caixa de entrada para redefinir sua senha.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao enviar e-mail",
        description: error instanceof Error ? error.message : "Tente novamente.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PublicSeo
        title="Esqueci minha senha | Pubfy"
        description="Solicite um link seguro para redefinir sua senha na conta Pubfy."
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
            Esqueci minha senha
          </CardTitle>
          <CardDescription className="text-center">
            {sent
              ? "Enviamos um link de redefinição para o seu e-mail."
              : "Informe seu e-mail e enviaremos um link para redefinir sua senha."}
          </CardDescription>
        </CardHeader>

        {sent ? (
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center justify-center py-6 space-y-3 text-center">
              <div className="rounded-full bg-green/10 p-3">
                <Mail className="h-8 w-8 text-green" />
              </div>
              <p className="text-sm text-navy/70">
                Não recebeu o e-mail? Verifique sua pasta de spam ou tente novamente em alguns minutos.
              </p>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setSent(false);
                setEmail("");
              }}
            >
              Enviar novamente
            </Button>
            <Link to="/login" className="block">
              <Button variant="ghost" className="w-full">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar para o login
              </Button>
            </Link>
          </CardContent>
        ) : (
          <form onSubmit={handleSubmit}>
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
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
              <Button
                type="submit"
                className="w-full bg-green hover:bg-green-dark text-white"
                disabled={loading}
              >
                {loading ? "Enviando..." : "Enviar link de redefinição"}
              </Button>
              <Link to="/login" className="w-full">
                <Button variant="ghost" className="w-full" type="button">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar para o login
                </Button>
              </Link>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
    </>
  );
};

export default EsqueciSenha;
