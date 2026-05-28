
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, ShoppingBag, MessageCircle, LayoutGrid, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { useActivePlan } from "@/hooks/useActivePlan";
import { Skeleton } from "@/components/ui/skeleton";
import { DEFAULT_TRIAL_DAYS, formatTrialDaysBadge } from "@/lib/trialDays";

const benefits = [
  { icon: ShoppingBag, text: "Cardápio digital, produtos, cupons e promoções" },
  { icon: MessageCircle, text: "Atendimento e automações pelo WhatsApp" },
  { icon: LayoutGrid, text: "PDV, mesas, pedidos e equipe no mesmo painel" },
  { icon: Zap, text: "Relatórios e configurações para operar com controle" },
];

const Pricing = () => {
  const [annual, setAnnual] = useState(false);
  const { plan, loading } = useActivePlan();

  const monthlyPrice = plan?.price_monthly ?? 59.9;
  const yearlyPerMonth = plan?.price_yearly ?? 49.0;
  const yearlyTotal = yearlyPerMonth * 12;
  const trialDays = plan?.trial_days ?? DEFAULT_TRIAL_DAYS;
  const planName = plan?.name ?? "Plano Pubfy";
  const discountPct = monthlyPrice > 0
    ? Math.round((1 - yearlyPerMonth / monthlyPrice) * 100)
    : 0;

  const displayPrice = annual ? yearlyPerMonth : monthlyPrice;

  return (
    <section id="pricing" className="py-16 md:py-24 bg-offwhite">
      <div className="container mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-navy mb-4">
            Comece com tudo liberado e prove valor antes de pagar.
          </h2>
          <p className="text-lg text-navy/70">
            {trialDays > 0
              ? `Comece grátis por ${trialDays} ${trialDays === 1 ? "dia" : "dias"}. Sem cartão. Sem complicação.`
              : "Crie sua conta e ative o plano ideal para sua operação. Sem complicação."}
          </p>

          <div className="mt-8 inline-flex items-center bg-white border border-gray-200 p-1 rounded-lg shadow-sm">
            <button
              onClick={() => setAnnual(false)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition ${
                !annual ? "bg-navy text-white shadow-sm" : "text-navy/70"
              }`}
            >
              Mensal
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition flex items-center gap-2 ${
                annual ? "bg-navy text-white shadow-sm" : "text-navy/70"
              }`}
            >
              Anual
              {discountPct > 0 && (
                <span className="text-[10px] bg-green text-white font-bold px-2 py-0.5 rounded-full">
                  -{discountPct}%
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="max-w-md mx-auto">
          <div className="relative rounded-lg bg-white border-2 border-green shadow-2xl shadow-green/10 overflow-hidden">
            <div className="absolute -top-px left-1/2 -translate-x-1/2 bg-green text-white text-xs font-bold py-1.5 px-5 rounded-b-lg flex items-center gap-1.5">
              <Sparkles size={12} /> PLANO RECOMENDADO
            </div>

            <div className="p-8 pt-12 text-center">
              <h3 className="text-2xl font-bold text-navy">{planName}</h3>
              <p className="mt-2 text-sm text-navy/60">
                Ferramentas essenciais para operar e vender melhor
              </p>

              <div className="mt-6 flex items-baseline justify-center">
                {loading ? (
                  <Skeleton className="h-16 w-40" />
                ) : (
                  <>
                    <span className="text-2xl font-medium text-navy/60">R$</span>
                    <span className="text-6xl font-bold text-navy mx-1">
                      {displayPrice.toFixed(2).replace(".", ",")}
                    </span>
                    <span className="text-navy/60">/mês</span>
                  </>
                )}
              </div>

              {annual ? (
                <p className="mt-2 text-sm text-navy/60">
                  Cobrado <strong>R$ {yearlyTotal.toFixed(2).replace(".", ",")}/ano</strong>
                </p>
              ) : (
                <p className="mt-2 text-sm text-navy/60">
                  ou <strong>R$ {yearlyPerMonth.toFixed(2).replace(".", ",")}/mês</strong> no plano anual
                </p>
              )}

              <div className="mt-6 inline-flex items-center gap-2 bg-orange/10 text-orange px-4 py-2 rounded-lg">
                <Sparkles size={14} />
                <span className="text-sm font-semibold">{formatTrialDaysBadge(trialDays)}</span>
              </div>
              <p className="mt-2 text-xs text-navy/60">
                {trialDays > 0
                  ? "Teste completo, sem compromisso. Não pedimos cartão."
                  : "Contratação simples, com pagamento pelo painel de assinaturas."}
              </p>

              <div className="mt-8 space-y-3">
                <Link to="/teste-gratis" className="block">
                  <Button className="w-full h-12 bg-green hover:bg-green-dark text-white text-base font-semibold rounded-lg">
                    {trialDays > 0 ? "Começar teste grátis" : "Criar conta"}
                  </Button>
                </Link>
                <Link to="/contato" className="block">
                  <Button
                    variant="outline"
                    className="w-full h-11 border-navy/20 text-navy hover:bg-navy/5 rounded-lg"
                  >
                    Falar com especialista
                  </Button>
                </Link>
              </div>
            </div>

            <div className="border-t border-gray-100 bg-beige/20 p-6">
              <ul className="space-y-3">
                {benefits.map((b, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="shrink-0 w-7 h-7 rounded-md bg-green/10 text-green flex items-center justify-center">
                      <b.icon size={15} />
                    </span>
                    <span className="text-sm text-navy/80 pt-0.5">{b.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <p className="text-center mt-6 text-sm text-navy/60">
            Sem burocracia. Cancele quando quiser.
          </p>
        </div>
      </div>
    </section>
  );
};

export default Pricing;
