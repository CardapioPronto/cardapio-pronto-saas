import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
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
import { PublicSeo } from "@/components/seo/PublicSeo";
import { useActivePlan } from "@/hooks/useActivePlan";
import { DEFAULT_TRIAL_DAYS, formatTrialPeriodText } from "@/lib/trialDays";
import { supabase } from "@/lib/supabase";
import {
  captureReferralFromSearch,
  getReferralSignupMetadata,
} from "@/lib/referralAttribution";
import { TurnstileWidget } from "@/components/security/TurnstileWidget";

const OWNER_EMAIL_VERIFICATION_TTL_HOURS = 24;

export default function Cadastro() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signUp, user } = useAuth();
  const { plan } = useActivePlan();
  const trialDays = plan?.trial_days ?? DEFAULT_TRIAL_DAYS;
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
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaResetKey, setCaptchaResetKey] = useState(0);

  useEffect(() => {
    captureReferralFromSearch(location.search);
  }, [location.search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user && !captchaToken) {
      toast({
        variant: "destructive",
        title: "Verificação pendente",
        description: "Aguarde a verificação de segurança antes de criar a conta.",
      });
      return;
    }

    setLoading(true);

    try {
      if (user) {
        const { data, error } = await supabase.rpc("complete_existing_user_owner_signup", {
          p_restaurant_name: restaurantName.trim(),
          p_phone: phone.trim() || null,
          p_address: address.trim(),
          p_cnpj: cnpj.trim() || null,
          p_logo_url: logoUrl.trim() || null,
          p_category: category.trim() || null,
        });

        if (error) throw error;
        const result = data as { success?: boolean; already_owner?: boolean; restaurant_id?: string | null };
        if (!result?.success) {
          throw new Error("Não foi possível concluir seu cadastro de dono.");
        }

        window.dispatchEvent(new Event("profile-updated"));
        toast({
          title: result.already_owner ? "Conta já vinculada" : "Restaurante criado com sucesso",
          description: "Seu acesso como dono foi liberado no dashboard.",
        });
        navigate("/dashboard", { replace: true });
        return;
      }

      const verificationExpiresAt = new Date(
        Date.now() + OWNER_EMAIL_VERIFICATION_TTL_HOURS * 60 * 60 * 1000,
      ).toISOString();

      const referralMetadata = getReferralSignupMetadata();

      const { error: signUpError } = await signUp(email.trim().toLowerCase(), password, {
        name: name.trim(),
        phone: phone.trim() || null,
        role: "restaurant_owner",
        user_type: "owner",
        signup_intent: "owner_signup",
        verification_expires_at: verificationExpiresAt,
        ...(referralMetadata ?? {}),
        pending_restaurant: {
          name: restaurantName.trim(),
          phone: phone.trim() || null,
          address: address.trim(),
          cnpj: cnpj.trim() || null,
          logo_url: logoUrl.trim() || null,
          category: category.trim() || null,
        },
      }, {
        captchaToken: captchaToken ?? undefined,
      });

      if (signUpError) {
        if (String(signUpError.message || "").toLowerCase().includes("already registered")) {
          throw new Error("Este e-mail já possui conta. Faça login e volte para /cadastro para concluir o cadastro de dono.");
        }
        throw signUpError;
      }

      toast({
        title: "Confirme seu e-mail",
        description: `Enviamos um link de verificação. Ele expira em ${OWNER_EMAIL_VERIFICATION_TTL_HOURS} horas.`,
      });

      setVerificationSent(true);
    } catch (error) {
      setCaptchaToken(null);
      setCaptchaResetKey((current) => current + 1);
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
      <>
      <PublicSeo
        title="Verifique seu e-mail | Pubfy"
        description="Confirme o endereço de e-mail para ativar sua conta na Pubfy."
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
            <div className="space-y-1">
              <CardTitle className="text-2xl font-bold">
                Verifique seu e-mail
              </CardTitle>
              <CardDescription>
                Enviamos um link para {email.trim().toLowerCase()}. O estabelecimento
                {trialDays > 0
                  ? " e o teste grátis serão criados somente após a confirmação."
                  : " será criado somente após a confirmação."}
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
      </>
    );
  }

  return (
    <>
    <PublicSeo
      title="Cadastro | Pubfy"
      description="Crie sua conta e teste o Pubfy gratuitamente: cardápio digital e gestão para restaurantes."
      path={location.pathname}
      noIndex
    />
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
            {user ? "Concluir cadastro do estabelecimento" : trialDays > 0 ? "Começar teste grátis" : "Criar conta"}
          </CardTitle>
          <CardDescription className="text-center">
            {user
              ? "Use sua conta atual para criar seu restaurante e acessar o dashboard de dono."
              : trialDays > 0
              ? `${formatTrialPeriodText(trialDays)}, sem necessidade de cartão de crédito`
              : "Crie sua conta para ativar o plano pelo painel de assinaturas"}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <CardContent className="space-y-4">
            {!user ? (
              <UserInfoForm
                name={name}
                setName={setName}
                email={email}
                setEmail={setEmail}
                password={password}
                setPassword={setPassword}
              />
            ) : (
              <div className="rounded-lg border bg-card p-3 text-sm text-muted-foreground">
                Você está autenticado como <strong className="text-foreground">{user.email}</strong>.
              </div>
            )}
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
            {!user && (
              <TurnstileWidget
                key={captchaResetKey}
                action="owner_signup"
                onToken={setCaptchaToken}
                className="min-h-[65px]"
              />
            )}
          </CardContent>
          {!user ? (
            <FormFooter loading={loading} disabled={!captchaToken} />
          ) : (
            <CardFooter className="flex flex-col gap-2">
              <Button
                type="submit"
                className="w-full bg-green hover:bg-green-dark text-white"
                disabled={loading}
              >
                {loading ? "Concluindo..." : "Criar meu estabelecimento"}
              </Button>
              <p className="text-sm text-center text-navy/70">
                Quer trocar de conta?{" "}
                <Link to="/login" className="text-green hover:underline">
                  Fazer login
                </Link>
              </p>
            </CardFooter>
          )}
        </form>
      </Card>
    </div>
    </>
  );
}
