import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Download, TrendingUp } from "lucide-react";
import { RelatoriosAvancados } from "@/components/relatorios/RelatoriosAvancados";
import { ExportacaoDados } from "@/components/relatorios/ExportacaoDados";
import { AnalisePerformance } from "@/components/relatorios/AnalisePerformance";
import { TestRelatorios } from "@/components/relatorios/TestRelatórios";

const Relatorios = () => {
  return (
    <DashboardLayout title="Relatórios">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
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
              <div className="text-2xl font-bold">Excel/PDF</div>
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

        <Tabs defaultValue="relatorios" className="space-y-4">
          <TabsList>
            <TabsTrigger value="relatorios">Relatórios Avançados</TabsTrigger>
            <TabsTrigger value="exportacao">Exportação</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="test">🧪 Teste</TabsTrigger>
          </TabsList>
          
          <TabsContent value="relatorios" className="space-y-4">
            <RelatoriosAvancados />
          </TabsContent>
          
          <TabsContent value="exportacao" className="space-y-4">
            <ExportacaoDados />
          </TabsContent>
          
          <TabsContent value="performance" className="space-y-4">
            <AnalisePerformance />
          </TabsContent>
          
          <TabsContent value="test" className="space-y-4">
            <TestRelatorios />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Relatorios;