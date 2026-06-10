import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Download, Landmark, MessageSquareText, Target } from "lucide-react";
import { RelatoriosAvancados } from "@/components/relatorios/RelatoriosAvancados";
import { ExportacaoDados } from "@/components/relatorios/ExportacaoDados";
import { AnalisePerformance } from "@/components/relatorios/AnalisePerformance";
import { FinancialDashboard } from "@/components/relatorios/FinancialDashboard";
import { FeedbackDashboard } from "@/components/relatorios/FeedbackDashboard";
import { PublicMenuAnalyticsDashboard } from "@/components/relatorios/PublicMenuAnalyticsDashboard";

const RELATORIOS_TABS = new Set(["financeiro", "avaliacoes", "conversao", "relatorios", "exportacao", "performance"]);

const Relatorios = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeTab = useMemo(() => {
    const tab = searchParams.get("tab") || "financeiro";
    return RELATORIOS_TABS.has(tab) ? tab : "financeiro";
  }, [searchParams]);

  return (
    <DashboardLayout title="Relatórios">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Financeiro</CardTitle>
              <Landmark className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Canais</div>
              <p className="text-xs text-muted-foreground">
                Receita líquida e economia estimada
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Relatórios Customizados</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Períodos</div>
              <p className="text-xs text-muted-foreground">
                Análise por período personalizado
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Exportação</CardTitle>
              <Download className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">CSV/PDF</div>
              <p className="text-xs text-muted-foreground">
                Exporte dados para análise externa
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avaliações</CardTitle>
              <MessageSquareText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">NPS</div>
              <p className="text-xs text-muted-foreground">
                Satisfação e comentários pós-pedido
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversão</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Funil</div>
              <p className="text-xs text-muted-foreground">
                Origem, carrinho e pedidos
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(value) => navigate(`/relatorios?tab=${value}`, { replace: true })}
          className="space-y-4"
        >
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="financeiro" className="shrink-0">Financeiro</TabsTrigger>
            <TabsTrigger value="avaliacoes" className="shrink-0">Avaliações</TabsTrigger>
            <TabsTrigger value="conversao" className="shrink-0">Conversão</TabsTrigger>
            <TabsTrigger value="relatorios" className="shrink-0">Relatórios Avançados</TabsTrigger>
            <TabsTrigger value="exportacao" className="shrink-0">Exportação</TabsTrigger>
            <TabsTrigger value="performance" className="shrink-0">Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="financeiro" className="space-y-4">
            <FinancialDashboard />
          </TabsContent>

          <TabsContent value="avaliacoes" className="space-y-4">
            <FeedbackDashboard />
          </TabsContent>

          <TabsContent value="conversao" className="space-y-4">
            <PublicMenuAnalyticsDashboard />
          </TabsContent>
          
          <TabsContent value="relatorios" className="space-y-4">
            <RelatoriosAvancados />
          </TabsContent>
          
          <TabsContent value="exportacao" className="space-y-4">
            <ExportacaoDados />
          </TabsContent>
          
          <TabsContent value="performance" className="space-y-4">
            <AnalisePerformance />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Relatorios;
