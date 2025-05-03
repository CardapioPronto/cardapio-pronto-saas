import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
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

export default function Cadastro() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [restaurantName, setRestaurantName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [category, setCategory] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Realizar o cadastro no Supabase
      const { error } = await signUp(email, password, {
        name,
        phone,
      });

      if (error) {
        throw error;
      }

      const { data: user } = await supabase.auth.getUser();

      if (!user || !user.user) {
        throw new Error("Falha ao obter informações do usuário após cadastro");
      }

      // Cria o restaurante
      const { data: restaurantData, error: restaurantError } = await supabase
        .from("restaurants")
        .insert([
          {
            name: restaurantName,
            owner_id: user.user.id,
            phone,
            address,
            cnpj,
            logo_url: logoUrl,
            category,
          },
        ])
        .select()
        .single();

      if (restaurantError || !restaurantData) {
        setError("Erro ao criar restaurante.");
        setLoading(false);
        return;
      }

      // Atualiza o usuário com o restaurant_id
      const { error: userUpdateError } = await supabase
        .from("users")
        .update({ restaurant_id: restaurantData.id })
        .eq("id", user.user.id);

      if (userUpdateError) {
        setError("Erro ao vincular restaurante ao usuário.");
        setLoading(false);
        return;
      }

      // Cria assinatura padrão (exemplo)
      await supabase.from("subscriptions").insert([
        {
          user_id: user.user.id,
          restaurant_id: restaurantData.id,
          plan: "starter",
          status: "active",
        },
      ]);

      toast({
        title: "Cadastro realizado com sucesso!",
        description: "Você será redirecionado para o dashboard.",
      });

      navigate("/dashboard");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro no cadastro",
        description:
          error.message ||
          "Ocorreu um erro ao criar sua conta. Tente novamente.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-beige/20 px-4">
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <Link to="/" className="flex items-center">
              <span className="text-navy text-2xl font-bold">
                Cardápio<span className="text-orange">Pronto</span>
              </span>
            </Link>
          </div>
          <CardTitle className="text-2xl font-bold text-center">
            Começar teste grátis
          </CardTitle>
          <CardDescription className="text-center">
            14 dias grátis, sem necessidade de cartão de crédito
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <CardContent className="space-y-4">
            <div>
              <Label>Seu Nome</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Label>Senha</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <Label>Nome do Restaurante</Label>
              <Input
                value={restaurantName}
                onChange={(e) => setRestaurantName(e.target.value)}
                required
              />
            </div>
            <div>
              <Label>Telefone (opcional)</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <Label>Endereço</Label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
              />
            </div>
            <div>
              <Label>CNPJ (opcional)</Label>
              <Input value={cnpj} onChange={(e) => setCnpj(e.target.value)} />
            </div>
            <div>
              <Label>Logo URL (opcional)</Label>
              <Input
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
              />
            </div>
            <div>
              <Label>Categoria (opcional)</Label>
              <Input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </div>
          </CardContent>
          {/* {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Cadastrando..." : "Cadastrar"}
          </Button> */}
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
}
