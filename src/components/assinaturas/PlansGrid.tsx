
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { Plano } from "@/types/plano";
import { Assinatura } from "@/types/subscription";

interface PlansGridProps {
  planos: Plano[];
  assinatura: Assinatura;
  onSelectPlan: (plano: Plano) => void;
}

const PlansGrid = ({ planos, assinatura, onSelectPlan }: PlansGridProps) => {
  return (
    <div className="grid md:grid-cols-3 gap-6">
      {planos.map((plano) => {
        const isAtivo = assinatura.planoId === plano.id && assinatura.status === "ativa";
        const isPopular = plano.name === "Profissional";
        
        return (
          <Card key={plano.id} className={`relative overflow-hidden ${isPopular ? 'border-green' : ''}`}>
            {isPopular && (
              <div className="absolute top-0 right-0 bg-green text-white px-3 py-1 text-xs">
                Popular
              </div>
            )}
            
            <CardHeader>
              <CardTitle>{plano.name}</CardTitle>
              <CardDescription>
                <span className="text-2xl font-bold">R$ {plano.price_monthly.toFixed(2)}</span>
                <span className="text-sm">/mês</span>
                <br />
                <span className="text-sm text-muted-foreground">
                  Anual: R$ {plano.price_yearly.toFixed(2)}/mês
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {plano.features?.filter(f => f.is_enabled).map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <CheckCircle className="h-4 w-4 text-green mr-2 mt-1" />
                    <span className="text-sm">{feature.feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              {isAtivo ? (
                <Button disabled className="w-full bg-green text-white">
                  Plano Atual
                </Button>
              ) : (
                <Button 
                  className="w-full"
                  variant={isPopular ? "default" : "outline"}
                  onClick={() => onSelectPlan(plano)}
                >
                  {assinatura.status === "ativa" ? "Mudar para este plano" : "Assinar plano"}
                </Button>
              )}
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
};

export default PlansGrid;
