import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Bot, Users, Clock, TrendingUp, CheckCircle } from "lucide-react";
import { useConversations } from "@/hooks/useConversations";

const AtendimentoMetricas = () => {
  const { threads, threadsByStatus } = useConversations();

  const stats = [
    {
      title: "Total de Conversas",
      value: threads.length,
      icon: MessageSquare,
      description: "Todas as conversas",
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "IA Ativa",
      value: threadsByStatus.bot_active.length,
      icon: Bot,
      description: "Atendidas pela IA",
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      title: "Atendimento Humano",
      value: threadsByStatus.human_active.length,
      icon: Users,
      description: "Com atendente",
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      title: "Aguardando",
      value: threadsByStatus.waiting_human.length,
      icon: Clock,
      description: "Aguardando atendente",
      color: "text-yellow-600",
      bg: "bg-yellow-50",
    },
    {
      title: "Encerradas",
      value: threadsByStatus.closed.length,
      icon: CheckCircle,
      description: "Conversas finalizadas",
      color: "text-gray-600",
      bg: "bg-gray-50",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Métricas de Atendimento</h2>
        <p className="text-sm text-muted-foreground">
          Visão geral do atendimento WhatsApp
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${stat.bg}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.title}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Resumo
          </CardTitle>
          <CardDescription>
            Análise geral do módulo de atendimento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">
              As métricas detalhadas serão exibidas conforme o volume de atendimentos aumentar.
            </p>
            <p className="text-xs mt-1">
              Gráficos de tendência, tempo médio de resposta e satisfação estarão disponíveis em breve.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AtendimentoMetricas;
