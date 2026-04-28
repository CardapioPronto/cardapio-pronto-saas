
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, ShoppingBag, MessageCircle, LayoutGrid, Zap } from "lucide-react";
import { useState } from "react";
import { Plano } from "@/types/plano";
import { Assinatura } from "@/types/subscription";

interface PlansGridProps {
  planos: Plano[];
  assinatura: Assinatura;
  onSelectPlan: (plano: Plano) => void;
}

const benefits = [
  { icon: ShoppingBag, text: "Cardápio digital profissional" },
  { icon: MessageCircle, text: "Pedidos automatizados pelo WhatsApp" },
  { icon: LayoutGrid, text: "Gestão completa: PDV, mesas, relatórios" },
  { icon: Zap, text: "Atualizações e suporte incluídos" },
];

const PlansGrid = ({ planos, assinatura, onSelectPlan }: PlansGridProps) => {
  const [annual, setAnnual] = useState(false);

  // Plano único: usa o primeiro plano ativo retornado, com fallback estático
  const plano = planos[0];
  const monthly = plano?.price_monthly ?? 59.9;
  const yearlyMonthly = plano?.price_yearly ?? 49.9;
  const yearlyTotal = Math.round(yearlyMonthly * 12);
  const displayPrice = annual ? yearlyMonthly : monthly;
  const isAtivo = plano && assinatura.planoId === plano.id && assinatura.status === "ativa";

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-6">
        <div className="inline-flex items-center bg-muted p-1 rounded-full">
          <button
            onClick={() => setAnnual(false)}
            className={`px-5 py-2 rounded-full text-sm font-medium transition ${
              !annual ? "bg-background shadow-sm" : "text-muted-foreground"
            }`}
          >
            Mensal
          </button>
          <button
            onClick={() => setAnnual(true)}
            className={`px-5 py-2 rounded-full text-sm font-medium transition flex items-center gap-2 ${
              annual ? "bg-background shadow-sm" : "text-muted-foreground"
            }`}
          >
            Anual
            <span className="text-[10px] bg-green text-white font-bold px-2 py-0.5 rounded-full">
              -17%
            </span>
          </button>
        </div>
      </div>

      <Card className="relative overflow-hidden border-2 border-green shadow-xl">
        <div className="absolute -top-px left-1/2 -translate-x-1/2 bg-green text-white text-xs font-bold py-1.5 px-5 rounded-b-xl flex items-center gap-1.5">
          <Sparkles size={12} /> PLANO RECOMENDADO
        </div>

        <div className="p-8 pt-12 text-center">
          <h3 className="text-2xl font-bold">Plano Pubfy</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Tudo o que seu restaurante precisa
          </p>

          <div className="mt-6 flex items-baseline justify-center">
            <span className="text-2xl font-medium text-muted-foreground">R$</span>
            <span className="text-5xl font-bold mx-1">
              {displayPrice.toFixed(2).replace(".", ",")}
            </span>
            <span className="text-muted-foreground">/mês</span>
          </div>

          {annual ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Cobrado <strong>R$ {yearlyTotal},00/ano</strong>
            </p>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              ou <strong>R$ {yearlyMonthly.toFixed(2).replace(".", ",")}/mês</strong> no plano anual
            </p>
          )}

          <div className="mt-8">
            {isAtivo ? (
              <Button disabled className="w-full h-12 bg-green text-white">
                Plano Atual
              </Button>
            ) : (
              <Button
                onClick={() => plano && onSelectPlan(plano)}
                disabled={!plano}
                className="w-full h-12 bg-green hover:bg-green-dark text-white text-base font-semibold"
              >
                {assinatura.status === "ativa" ? "Reativar plano" : "Ativar plano"}
              </Button>
            )}
          </div>
        </div>

        <div className="border-t bg-muted/30 p-6">
          <ul className="space-y-3">
            {benefits.map((b, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="shrink-0 w-7 h-7 rounded-lg bg-green/10 text-green flex items-center justify-center">
                  <b.icon size={15} />
                </span>
                <span className="text-sm pt-0.5">{b.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </Card>

      <p className="text-center mt-6 text-sm text-muted-foreground">
        Sem burocracia. Cancele quando quiser.
      </p>
    </div>
  );
};

export default PlansGrid;
