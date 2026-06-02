import { Link } from "react-router-dom";
import type { ComponentType } from "react";
import {
  ArrowRight,
  CreditCard,
  HelpCircle,
  LifeBuoy,
  Lock,
  Mail,
  MessageCircle,
  Settings,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
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
  category: string;
  highlights: string[];
  canAccess: boolean;
  restrictedHint: string;
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

  const integrationsHint = "Peça ao administrador para liberar a permissão de gerenciar integrações.";
  const whatsappHint = "Peça ao administrador para liberar uma permissão de WhatsApp ou atendimento.";

  const cards: AutomationCard[] = [
    {
      title: "WhatsApp e IA",
      description: "Atendimento humano e automático, instâncias conectadas e respostas com inteligência artificial.",
      href: "/atendimento",
      icon: MessageCircle,
      category: "Atendimento",
      highlights: ["Conversas em tempo real", "Respostas automáticas", "Instâncias e numeração"],
      canAccess: canAccessWhatsApp,
      restrictedHint: whatsappHint,
    },
    {
      title: "Email — Resend",
      description: "Domínio de envio, templates, campanhas, logs de entrega e descadastro de contatos.",
      href: "/email-integracao?tab=automations",
      icon: Mail,
      category: "Marketing",
      highlights: ["Domínio verificado", "Campanhas automáticas", "Logs de entrega"],
      canAccess: canManageIntegrations,
      restrictedHint: integrationsHint,
    },
    {
      title: "iFood",
      description: "Receba pedidos do iFood direto na fila de pedidos do Pubfy, sem operação paralela.",
      href: "/ifood-integracao",
      icon: ShoppingBag,
      category: "Pedidos",
      highlights: ["Pedidos integrados", "Status sincronizado", "Sem app extra no balcão"],
      canAccess: canManageIntegrations,
      restrictedHint: integrationsHint,
    },
    {
      title: "Recebimentos online",
      description: "PIX e cartão online para pedidos do cardápio digital, delivery e QR Code de mesa via Pagar.me.",
      href: "/pagarme-config",
      icon: CreditCard,
      category: "Financeiro",
      highlights: ["PIX e cartão", "Antifraude Pagar.me", "Conciliação automática"],
      canAccess: canManageIntegrations,
      restrictedHint: integrationsHint,
    },
  ];

  const accessibleCount = cards.filter((card) => card.canAccess).length;

  return (
    <DashboardLayout title="Automações">
      <div className="space-y-8">
        <header className="rounded-xl border bg-card p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                Central de automações
              </div>
              <h1 className="text-2xl font-semibold tracking-tight">
                Conecte canais que trabalham pelo seu restaurante.
              </h1>
              <p className="max-w-3xl text-sm text-muted-foreground">
                Cada card abaixo abre uma integração já preparada. Ative o que faz sentido para a sua operação:
                atendimento por WhatsApp, e-mail transacional, recebimento online e pedidos do iFood no mesmo fluxo.
              </p>
            </div>
            <Badge variant="secondary" className="self-start whitespace-nowrap">
              {accessibleCount} de {cards.length} disponíveis para você
            </Badge>
          </div>
        </header>

        <section aria-label="Integrações disponíveis">
          <div className="mb-3">
            <h2 className="text-lg font-semibold">Integrações</h2>
            <p className="text-sm text-muted-foreground">
              Canais e ferramentas que ampliam a operação do restaurante.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => {
              const Icon = card.icon;
              return (
                <Card
                  key={card.href}
                  className={`flex h-full flex-col transition-shadow ${
                    card.canAccess ? "hover:shadow-md" : "opacity-90"
                  }`}
                >
                  <CardHeader className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <Badge variant="outline">{card.category}</Badge>
                    </div>
                    <div>
                      <CardTitle className="text-base">{card.title}</CardTitle>
                      <CardDescription className="mt-1 min-h-12">{card.description}</CardDescription>
                    </div>
                  </CardHeader>

                  <CardContent className="mt-auto space-y-4">
                    <ul className="space-y-1.5 text-xs text-muted-foreground">
                      {card.highlights.map((item) => (
                        <li key={item} className="flex items-start gap-2">
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" aria-hidden />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>

                    {card.canAccess ? (
                      <Button asChild className="w-full">
                        <Link to={card.href}>
                          Abrir
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    ) : (
                      <div className="space-y-2">
                        <Button type="button" variant="outline" className="w-full" disabled>
                          <Lock className="mr-2 h-4 w-4" aria-hidden />
                          Sem acesso
                        </Button>
                        <p className="text-[11px] leading-snug text-muted-foreground">
                          {card.restrictedHint}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        <section aria-label="Ajuda" className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="space-y-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                <HelpCircle className="h-4 w-4" />
              </div>
              <CardTitle className="text-sm">Como escolher por onde começar?</CardTitle>
            </CardHeader>
            <CardContent className="text-xs leading-relaxed text-muted-foreground">
              Se o restaurante já recebe pedidos pelo WhatsApp, comece pelo módulo de WhatsApp e IA. Se vende muito por
              delivery, ative o iFood e os Recebimentos online primeiro.
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="space-y-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Settings className="h-4 w-4" />
              </div>
              <CardTitle className="text-sm">Dados do estabelecimento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs leading-relaxed text-muted-foreground">
                Antes de ativar integrações financeiras e de envio, confirme os dados da empresa, e-mail e logo em
                Configurações.
              </p>
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link to="/configuracoes">
                  Abrir configurações
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="space-y-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                <LifeBuoy className="h-4 w-4" />
              </div>
              <CardTitle className="text-sm">Precisa de outra integração?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs leading-relaxed text-muted-foreground">
                Conte para o time da Pubfy qual ferramenta você usa hoje. Avaliamos demanda para expandir o catálogo de
                automações.
              </p>
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link to="/contato">
                  Falar com o time
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </section>
      </div>
    </DashboardLayout>
  );
};

export default Automacoes;
