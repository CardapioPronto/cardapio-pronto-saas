
import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { CheckCircle, XCircle, CreditCard } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

// Tipos e interfaces
interface Plano {
  id: string;
  nome: string;
  preco: number;
  periodo: string;
  recursos: string[];
  popular?: boolean;
}

interface Assinatura {
  planoId: string;
  status: "ativa" | "inativa";
  dataInicio: Date;
  dataProximaCobranca: Date;
  metodoPagamento: string;
}

const Assinaturas = () => {
  // Planos disponíveis
  const planos: Plano[] = [
    {
      id: "basic",
      nome: "Básico",
      preco: 49.90,
      periodo: "mensal",
      recursos: [
        "1 Cardápio Digital",
        "Até 30 produtos",
        "PDV básico",
        "Suporte por e-mail"
      ]
    },
    {
      id: "standard",
      nome: "Padrão",
      preco: 99.90,
      periodo: "mensal",
      popular: true,
      recursos: [
        "1 Cardápio Digital personalizado",
        "Até 100 produtos",
        "PDV completo",
        "Gestão de mesas e comandas",
        "Relatórios básicos",
        "Suporte por chat"
      ]
    },
    {
      id: "premium",
      nome: "Premium",
      preco: 149.90,
      periodo: "mensal",
      recursos: [
        "3 Cardápios Digitais personalizáveis",
        "Produtos ilimitados",
        "PDV completo",
        "Gestão de mesas e comandas",
        "Relatórios avançados",
        "Integração com delivery",
        "Suporte prioritário"
      ]
    }
  ];

  // Estado da assinatura atual (simular assinatura ativa)
  const [assinatura, setAssinatura] = useState<Assinatura>({
    planoId: "standard",
    status: "ativa",
    dataInicio: new Date(2023, 2, 15),
    dataProximaCobranca: new Date(2023, 5, 15),
    metodoPagamento: "Cartão de crédito terminado em 4589"
  });

  // Alternar plano
  const alterarPlano = (planoId: string) => {
    setAssinatura({
      ...assinatura,
      planoId: planoId,
      dataProximaCobranca: new Date(2023, 5, 15) // Simulação
    });
    
    toast.success("Plano alterado com sucesso!", {
      description: "As alterações serão aplicadas na próxima cobrança."
    });
  };

  // Cancelar assinatura
  const cancelarAssinatura = () => {
    setAssinatura({
      ...assinatura,
      status: "inativa"
    });
    
    toast.success("Assinatura cancelada!", {
      description: "Você ainda tem acesso até o final do período já pago."
    });
  };

  // Reativar assinatura
  const reativarAssinatura = () => {
    setAssinatura({
      ...assinatura,
      status: "ativa"
    });
    
    toast.success("Assinatura reativada com sucesso!");
  };

  // Encontrar plano atual
  const planoAtual = planos.find(plano => plano.id === assinatura.planoId);

  return (
    <DashboardLayout title="Assinaturas">
      {/* Status da assinatura */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Status da Assinatura</CardTitle>
          <CardDescription>Informações sobre seu plano atual</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row md:items-center justify-between">
            <div className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground">Plano atual</div>
                <div className="text-2xl font-bold">{planoAtual?.nome}</div>
                <div className="text-green font-medium">R$ {planoAtual?.preco.toFixed(2)}/{planoAtual?.periodo}</div>
              </div>
              
              <div>
                <div className="text-sm text-muted-foreground">Status</div>
                <div className="flex items-center gap-1.5">
                  {assinatura.status === "ativa" ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green" />
                      <span className="font-medium text-green">Ativa</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span className="font-medium text-red-500">Inativa</span>
                    </>
                  )}
                </div>
              </div>
              
              <div>
                <div className="text-sm text-muted-foreground">Próxima cobrança</div>
                <div className="font-medium">
                  {assinatura.status === "ativa" 
                    ? assinatura.dataProximaCobranca.toLocaleDateString('pt-BR')
                    : "Nenhuma cobrança agendada"}
                </div>
              </div>
              
              <div>
                <div className="text-sm text-muted-foreground">Método de pagamento</div>
                <div className="font-medium flex items-center gap-1.5">
                  <CreditCard className="h-4 w-4" />
                  {assinatura.metodoPagamento}
                </div>
              </div>
            </div>
            
            <div className="mt-6 md:mt-0 space-y-3">
              {assinatura.status === "ativa" ? (
                <>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full md:w-auto">
                        Alterar método de pagamento
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Alterar método de pagamento</DialogTitle>
                        <DialogDescription>
                          Esta funcionalidade estará disponível em breve. Para alterar o método de pagamento, entre em contato com o suporte.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button>Fechar</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="text-red-500 border-red-500 hover:bg-red-500/10 w-full md:w-auto">
                        Cancelar assinatura
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Cancelar assinatura</DialogTitle>
                        <DialogDescription>
                          Tem certeza que deseja cancelar sua assinatura? Você perderá acesso a todas as funcionalidades premium ao final do período atual.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button variant="ghost" onClick={() => {}}>Manter assinatura</Button>
                        <Button variant="destructive" onClick={cancelarAssinatura}>Confirmar cancelamento</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </>
              ) : (
                <Button onClick={reativarAssinatura} className="bg-green hover:bg-green-dark text-white w-full md:w-auto">
                  Reativar assinatura
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Planos disponíveis */}
      <div className="grid md:grid-cols-3 gap-6">
        {planos.map((plano) => {
          const isAtivo = assinatura.planoId === plano.id && assinatura.status === "ativa";
          
          return (
            <Card key={plano.id} className={`relative overflow-hidden ${plano.popular ? 'border-green' : ''}`}>
              {plano.popular && (
                <div className="absolute top-0 right-0 bg-green text-white px-3 py-1 text-xs">
                  Popular
                </div>
              )}
              
              <CardHeader>
                <CardTitle>{plano.nome}</CardTitle>
                <CardDescription>
                  <span className="text-2xl font-bold">R$ {plano.preco.toFixed(2)}</span>
                  <span className="text-sm">/{plano.periodo}</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {plano.recursos.map((recurso, index) => (
                    <li key={index} className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-green mr-2 mt-1" />
                      <span>{recurso}</span>
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
                    variant={plano.popular ? "default" : "outline"}
                    onClick={() => alterarPlano(plano.id)}
                  >
                    {assinatura.status === "ativa" ? "Mudar para este plano" : "Assinar plano"}
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </DashboardLayout>
  );
};

export default Assinaturas;
