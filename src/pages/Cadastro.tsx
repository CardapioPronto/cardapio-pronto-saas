import { useState } from "react";
import { Link } from "react-router-dom";
import { MailCheck } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuthContext";
import { UserInfoForm } from "@/components/cadastro/UserInfoForm";
import { RestaurantInfoForm } from "@/components/cadastro/RestaurantInfoForm";
import { FormFooter } from "@/components/cadastro/FormFooter";

const OWNER_EMAIL_VERIFICATION_TTL_HOURS = 24;

export default function Cadastro() {
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
  const [verificationSent, setVerificationSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const verificationExpiresAt = new Date(
        Date.now() + OWNER_EMAIL_VERIFICATION_TTL_HOURS * 60 * 60 * 1000,
      ).toISOString();

      const { error: signUpError } = await signUp(email.trim().toLowerCase(), password, {
        name: name.trim(),
        phone: phone.trim() || null,
        role: "restaurant_owner",
        user_type: "owner",
        signup_intent: "owner_signup",
        verification_expires_at: verificationExpiresAt,
        pending_restaurant: {
          name: restaurantName.trim(),
          phone: phone.trim() || null,
          address: address.trim(),
          cnpj: cnpj.trim() || null,
          logo_url: logoUrl.trim() || null,
          category: category.trim() || null,
        },
      });

      if (signUpError) {
        throw signUpError;
      }

      toast({
        title: "Confirme seu e-mail",
        description: `Enviamos um link de verificação. Ele expira em ${OWNER_EMAIL_VERIFICATION_TTL_HOURS} horas.`,
      });

      setVerificationSent(true);
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

  if (verificationSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-beige/20 px-4">
        <Card className="w-full max-w-lg shadow-lg">
          <CardHeader className="space-y-4 text-center">
            <div className="flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green/10 text-green">
                <MailCheck className="h-7 w-7" aria-hidden="true" />
              </div>
            </div>
            <div className="space-y-1">
              <CardTitle className="text-2xl font-bold">
                Verifique seu e-mail
              </CardTitle>
              <CardDescription>
                Enviamos um link para {email.trim().toLowerCase()}. O estabelecimento
                e o teste grátis serão criados somente após a confirmação.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-center text-navy/70">
              O link expira em {OWNER_EMAIL_VERIFICATION_TTL_HOURS} horas. Se a
              confirmação não for concluída nesse prazo, o cadastro pendente será
              removido automaticamente.
            </p>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button asChild className="w-full bg-green hover:bg-green-dark text-white">
              <Link to="/login">Ir para login</Link>
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => setVerificationSent(false)}
            >
              Editar cadastro
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-beige/20 px-4">
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <Link to="/" className="flex items-center">
              <span className="text-navy text-2xl font-bold">
                Pubfy
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
