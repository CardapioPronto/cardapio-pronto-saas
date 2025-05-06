import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { UserInfoForm } from "@/components/cadastro/UserInfoForm";
import { RestaurantInfoForm } from "@/components/cadastro/RestaurantInfoForm";
import { FormFooter } from "@/components/cadastro/FormFooter";

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
      const { error: signUpError } = await signUp(email, password, {
        phone,
      });

      if (signUpError) {
        throw signUpError;
      }

      const { data: user } = await supabase.auth.getUser();

      if (!user || !user.user) {
        throw new Error("Falha ao obter informações do usuário após cadastro");
      }

      // Insere o usuário na tabela public.users
      const { error: insertUserError } = await supabase.from("users").insert([
        {
          id: user.user.id,
          name,
          email,
        },
      ]);

      if (insertUserError) {
        setError("Erro ao criar usuário no sistema.");
        setLoading(false);
        return;
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
      const today = new Date().toISOString();
      await supabase.from("subscriptions").insert([
        {
          restaurant_id: restaurantData.id,
          plan_id: "starter",
          status: "active",
          start_date: today
        },
      ]);

      toast({
        title: "Cadastro realizado com sucesso!",
        description: "Você será redirecionado para o dashboard.",
      });

      navigate("/dashboard");
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : "Ocorreu um erro ao criar sua conta. Tente novamente.";
      
      toast({
        variant: "destructive",
        title: "Erro no cadastro",
        description: errorMessage
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
            <UserInfoForm
              name={name}
              setName={setName}
              email={email}
              setEmail={setEmail}
              password={password}
              setPassword={setPassword}
            />
            <RestaurantInfoForm
              restaurantName={restaurantName}
              setRestaurantName={setRestaurantName}
              phone={phone}
              setPhone={setPhone}
              address={address}
              setAddress={setAddress}
              cnpj={cnpj}
              setCnpj={setCnpj}
              logoUrl={logoUrl}
              setLogoUrl={setLogoUrl}
              category={category}
              setCategory={setCategory}
            />
          </CardContent>
          <FormFooter loading={loading} />
        </form>
      </Card>
    </div>
  );
}