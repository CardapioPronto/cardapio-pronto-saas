import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  QrCode, 
  Smartphone, 
  Users, 
  TrendingUp, 
  Clock, 
  Printer,
  Camera,
  CheckCircle2
} from 'lucide-react';

export const QRCodeInstructions = () => {
  const benefits = [
    {
      icon: <Users className="h-5 w-5" />,
      title: "Zero Contato",
      description: "Clientes acessam o cardápio sem tocar em nada"
    },
    {
      icon: <Clock className="h-5 w-5" />,
      title: "Atualização Instantânea",
      description: "Mudanças no cardápio aparecem em tempo real"
    },
    {
      icon: <TrendingUp className="h-5 w-5" />,
      title: "Aumento nas Vendas",
      description: "Fotos atrativas aumentam pedidos em até 30%"
    },
    {
      icon: <Smartphone className="h-5 w-5" />,
      title: "Mobile First",
      description: "Otimizado para todos os dispositivos móveis"
    }
  ];

  const steps = [
    {
      icon: <Printer className="h-5 w-5 text-blue-600" />,
      title: "1. Imprima o QR Code",
      description: "Baixe e imprima o QR Code em papel ou adesivo"
    },
    {
      icon: <QrCode className="h-5 w-5 text-green-600" />,
      title: "2. Cole nas Mesas",
      description: "Posicione o QR Code em local visível para os clientes"
    },
    {
      icon: <Camera className="h-5 w-5 text-purple-600" />,
      title: "3. Clientes Escaneiam",
      description: "Clientes usam a câmera do celular para escanear"
    },
    {
      icon: <CheckCircle2 className="h-5 w-5 text-emerald-600" />,
      title: "4. Cardápio Abre",
      description: "O cardápio digital abre automaticamente no navegador"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Benefícios */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Benefícios do Cardápio Digital
          </CardTitle>
          <CardDescription>
            Vantagens que você terá ao implementar o cardápio digital com QR Code
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 rounded-lg bg-muted/50">
                <div className="text-primary">
                  {benefit.icon}
                </div>
                <div>
                  <h4 className="font-medium text-sm">{benefit.title}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{benefit.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Como Usar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Como Implementar
          </CardTitle>
          <CardDescription>
            Passos simples para começar a usar o cardápio digital
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {steps.map((step, index) => (
              <div key={index} className="flex items-start space-x-4 p-4 border border-border rounded-lg">
                <div className="flex-shrink-0">
                  {step.icon}
                </div>
                <div>
                  <h4 className="font-medium text-sm mb-1">{step.title}</h4>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Dicas */}
      <Card>
        <CardHeader>
          <CardTitle>Dicas Importantes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <Badge variant="secondary" className="mt-0.5">Dica</Badge>
            <p className="text-sm text-muted-foreground">
              Coloque o QR Code em um local bem iluminado e de fácil acesso para os clientes
            </p>
          </div>
          <div className="flex items-start gap-3">
            <Badge variant="secondary" className="mt-0.5">Dica</Badge>
            <p className="text-sm text-muted-foreground">
              Adicione uma mensagem tipo "Escaneie para ver o cardápio" próximo ao QR Code
            </p>
          </div>
          <div className="flex items-start gap-3">
            <Badge variant="secondary" className="mt-0.5">Dica</Badge>
            <p className="text-sm text-muted-foreground">
              Mantenha sempre fotos atualizadas dos pratos para aumentar o apetite visual
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};