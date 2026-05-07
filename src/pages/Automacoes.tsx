import { Link } from "react-router-dom";
import type { ComponentType } from "react";
import { ArrowRight, CreditCard, Mail, MessageCircle, ShoppingBag } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usePermissionsV2 } from "@/hooks/usePermissionsV2";

type AutomationCard = {
  title: string;
  description: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  badge: string;
  canAccess: boolean;
};

const Automacoes = () => {
  const { hasAnyPermission } = usePermissionsV2();

  const canManageIntegrations = hasAnyPermission(["settings_manage", "settings_integrations_manage"]);
  const canAccessWhatsApp = hasAnyPermission([
    "whatsapp_manage",
    "whatsapp_manage_instances",
    "whatsapp_take_conversations",
    "whatsapp_reply_as_human",
    "whatsapp_view_all_conversations",
    "whatsapp_configure_automation",
  ]);

  const cards: AutomationCard[] = [
    {
      title: "WhatsApp e IA",
      description: "Atendimento, instâncias, conversas e automações do WhatsApp.",
      href: "/atendimento",
      icon: MessageCircle,
      badge: "Atendimento",
      canAccess: canAccessWhatsApp,
    },
    {
      title: "Email Resend",
      description: "Templates, campanhas, logs, descadastro e configuração do domínio de envio.",
      href: "/email-integracao",
      icon: Mail,
      badge: "Marketing",
      canAccess: canManageIntegrations,
    },
    {
      title: "iFood",
      description: "Recebimento de pedidos do iFood diretamente no Pubfy.",
      href: "/ifood-integracao",
      icon: ShoppingBag,
      badge: "Pedidos",
      canAccess: canManageIntegrations,
    },
    {
      title: "Recebimentos Online",
      description: "PIX online para pedidos do cardápio, delivery e QR Code de mesa.",
      href: "/pagarme-config",
      icon: CreditCard,
      badge: "Financeiro",
      canAccess: canManageIntegrations,
    },
  ];

  return (
    <DashboardLayout title="Automações">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Central de automações</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Configure canais e integrações que automatizam atendimento, vendas, pagamentos e relacionamento com clientes.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <Card key={card.href} className={!card.canAccess ? "opacity-70" : undefined}>
                <CardHeader className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <Badge variant="outline">{card.badge}</Badge>
                  </div>
                  <div>
                    <CardTitle className="text-base">{card.title}</CardTitle>
                    <CardDescription className="mt-1 min-h-12">{card.description}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button asChild variant={card.canAccess ? "default" : "outline"} className="w-full" disabled={!card.canAccess}>
                    <Link to={card.canAccess ? card.href : "#"}>
                      Abrir
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Organização recomendada</CardTitle>
            <CardDescription>
              O menu lateral fica reservado para áreas de trabalho recorrentes. Configurações técnicas e canais ficam agrupados aqui.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Automacoes;
