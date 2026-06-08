import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Download, Landmark, TrendingUp } from "lucide-react";
import { RelatoriosAvancados } from "@/components/relatorios/RelatoriosAvancados";
import { ExportacaoDados } from "@/components/relatorios/ExportacaoDados";
import { AnalisePerformance } from "@/components/relatorios/AnalisePerformance";
import { FinancialDashboard } from "@/components/relatorios/FinancialDashboard";

const Relatorios = () => {
  return (
    <DashboardLayout title="Relatórios">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
              <CardTitle className="text-sm font-medium">Performance</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Análise</div>
              <p className="text-xs text-muted-foreground">
                Indicadores de performance
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="financeiro" className="space-y-4">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="financeiro" className="shrink-0">Financeiro</TabsTrigger>
            <TabsTrigger value="relatorios" className="shrink-0">Relatórios Avançados</TabsTrigger>
            <TabsTrigger value="exportacao" className="shrink-0">Exportação</TabsTrigger>
            <TabsTrigger value="performance" className="shrink-0">Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="financeiro" className="space-y-4">
            <FinancialDashboard />
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
