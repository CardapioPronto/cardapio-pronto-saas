
import { useState } from "react";
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
import { supabase } from "@/lib/supabase";

const Cadastro = () => {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    estabelecimento: "",
    telefone: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Realizar o cadastro no Supabase
      const { error } = await signUp(formData.email, formData.password, {
        nome: formData.nome,
        telefone: formData.telefone
      });
      
      if (error) {
        throw error;
      }
      
      // Criar um registro de restaurante
      const { data: user } = await supabase.auth.getUser();
      
      if (!user || !user.user) {
        throw new Error("Falha ao obter informações do usuário após cadastro");
      }
      
      const { data: restaurant, error: restaurantError } = await supabase
        .from('restaurants')
        .insert({
          name: formData.estabelecimento,
          owner_id: user.user.id
        })
        .select()
        .single();
      
      if (restaurantError) {
        throw restaurantError;
      }
      
      // Criar uma assinatura trial
      const now = new Date();
      const trialEndDate = new Date();
      trialEndDate.setDate(now.getDate() + 14); // 14 dias de trial
      
      const { error: subscriptionError } = await supabase
        .from('subscriptions')
        .insert({
          restaurant_id: restaurant.id,
          plan_id: 'trial',
          status: 'active',
          start_date: now.toISOString(),
          end_date: trialEndDate.toISOString()
        });
      
      if (subscriptionError) {
        throw subscriptionError;
      }
      
      toast({
        title: "Cadastro realizado com sucesso!",
        description: "Você será redirecionado para o dashboard.",
      });
      
      navigate("/dashboard");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro no cadastro",
        description: error.message || "Ocorreu um erro ao criar sua conta. Tente novamente.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-beige/20 px-4">
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <Link to="/" className="flex items-center">
              <span className="text-navy text-2xl font-bold">Cardápio<span className="text-orange">Pronto</span></span>
            </Link>
          </div>
          <CardTitle className="text-2xl font-bold text-center">Começar teste grátis</CardTitle>
          <CardDescription className="text-center">
            14 dias grátis, sem necessidade de cartão de crédito
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="estabelecimento">Nome do estabelecimento</Label>
              <Input
                id="estabelecimento"
                name="estabelecimento"
                placeholder="Ex: Restaurante Silva"
                value={formData.estabelecimento}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nome">Seu nome</Label>
              <Input
                id="nome"
                name="nome"
                placeholder="Nome completo"
                value={formData.nome}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                name="telefone"
                type="tel"
                placeholder="(00) 00000-0000"
                value={formData.telefone}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="seu@email.com"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleInputChange}
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
              {loading ? "Criando conta..." : "Criar conta grátis"}
            </Button>
            <p className="mt-4 text-sm text-center text-navy/70">
              Já tem uma conta?{" "}
              <Link to="/login" className="text-green hover:underline">
                Faça login
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default Cadastro;
