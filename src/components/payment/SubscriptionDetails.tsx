
import React from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, CreditCard, AlertTriangle, Download } from "lucide-react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";

interface SubscriptionDetailsProps {
  subscription: {
    id: string;
    status: "ativa" | "inativa";
    dataInicio: Date;
    dataProximaCobranca: Date;
    metodoPagamento: string;
    planoId: string;
    historicoPagamentos?: {
      id: string;
      data: Date;
      valor: number;
      status: "aprovado" | "recusado" | "pendente";
    }[];
  };
  plano: {
    id: string;
    nome: string;
    preco: number;
    periodo: string;
  };
  onCancelSubscription: () => void;
}

const SubscriptionDetails: React.FC<SubscriptionDetailsProps> = ({
  subscription,
  plano,
  onCancelSubscription
}) => {
  // Simulated payment history
  const historicoSimulado = [
    {
      id: "pay_123456",
      data: new Date(2023, 1, 15),
      valor: plano.preco,
      status: "aprovado" as const
    },
    {
      id: "pay_123457",
      data: new Date(2023, 2, 15),
      valor: plano.preco,
      status: "aprovado" as const
    },
    {
      id: "pay_123458",
      data: new Date(2023, 3, 15),
      valor: plano.preco,
      status: "aprovado" as const
    }
  ];
  
  const historicoPagamentos = subscription.historicoPagamentos || historicoSimulado;

  return (
    <div className="space-y-6">
      {/* Informações gerais da assinatura */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Detalhes da assinatura</span>
            <span className="text-sm font-normal text-muted-foreground">
              #{subscription.id}
            </span>
          </CardTitle>
          <CardDescription>Informações sobre o seu plano atual</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Plano</h3>
              <p className="font-semibold text-lg">{plano.nome}</p>
              <p className="text-green">
                R$ {plano.preco.toFixed(2)}/{plano.periodo}
              </p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Status</h3>
              <p className="flex items-center gap-1.5">
                {subscription.status === "ativa" ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green" />
                    <span className="font-medium text-green">Ativa</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-red-500" />
                    <span className="font-medium text-red-500">Inativa</span>
                  </>
                )}
              </p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Data de início</h3>
              <p>{subscription.dataInicio.toLocaleDateString('pt-BR')}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Próxima cobrança</h3>
              <p>
                {subscription.status === "ativa" 
                  ? subscription.dataProximaCobranca.toLocaleDateString('pt-BR')
                  : "Sem cobrança programada"}
              </p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Método de pagamento</h3>
              <p className="flex items-center gap-1.5">
                <CreditCard className="h-4 w-4" />
                {subscription.metodoPagamento}
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end space-x-2">
          <Button variant="outline">
            Alterar plano
          </Button>

          {subscription.status === "ativa" && (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="text-red-500 border-red-500 hover:bg-red-500/10">
                  Cancelar assinatura
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirmar cancelamento</DialogTitle>
                  <DialogDescription>
                    Você tem certeza que deseja cancelar sua assinatura? Você perderá acesso a todas as funcionalidades premium ao final do período atual.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  <p className="text-sm text-amber-800">
                    Seu acesso permanecerá ativo até o final do período já pago.
                  </p>
                </div>
                <DialogFooter>
                  <Button variant="ghost">Manter assinatura</Button>
                  <Button variant="destructive" onClick={onCancelSubscription}>
                    Confirmar cancelamento
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </CardFooter>
      </Card>
      
      {/* Histórico de pagamentos */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de pagamentos</CardTitle>
          <CardDescription>
            Registros de cobranças anteriores
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transação</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Nota Fiscal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {historicoPagamentos.map((pagamento) => (
                <TableRow key={pagamento.id}>
                  <TableCell className="font-mono text-xs">{pagamento.id}</TableCell>
                  <TableCell>{pagamento.data.toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell>R$ {pagamento.valor.toFixed(2)}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium
                      ${pagamento.status === "aprovado" 
                        ? "bg-green-50 text-green" 
                        : pagamento.status === "pendente" 
                          ? "bg-amber-50 text-amber-600"
                          : "bg-red-50 text-red-600"
                      }`}
                    >
                      {pagamento.status === "aprovado" ? "Aprovado" : pagamento.status === "pendente" ? "Pendente" : "Recusado"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {pagamento.status === "aprovado" && (
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4 mr-1" />
                        NF
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionDetails;
