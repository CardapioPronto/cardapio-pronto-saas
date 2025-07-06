import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Clock } from "lucide-react";
import { useRelatoriosAvancados } from "@/hooks/useRelatoriosAvancados";
import { useExportacaoDados } from "@/hooks/useExportacaoDados";
import { useAnalisePerformance } from "@/hooks/useAnalisePerformance";

export const TestRelatorios = () => {
  const [testResults, setTestResults] = useState<any>({});
  
  // Test hooks initialization
  const relatoriosHook = useRelatoriosAvancados({
    dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    dateTo: new Date(),
    tipo: "vendas"
  });

  const exportacaoHook = useExportacaoDados();

  const performanceHook = useAnalisePerformance({
    dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    dateTo: new Date(),
    periodoComparacao: "mes-anterior"
  });

  useEffect(() => {
    // Test hook availability
    setTestResults({
      relatoriosHookAvailable: !!relatoriosHook,
      exportacaoHookAvailable: !!exportacaoHook,
      performanceHookAvailable: !!performanceHook,
      relatoriosLoading: relatoriosHook.loading,
      performanceLoading: performanceHook.loading,
      relatoriosError: relatoriosHook.error,
      performanceError: performanceHook.error
    });
  }, [relatoriosHook, exportacaoHook, performanceHook]);

  const runTest = async (testName: string) => {
    try {
      switch (testName) {
        case "relatorios":
          await relatoriosHook.refetch();
          break;
        case "performance":
          await performanceHook.refetch();
          break;
        case "exportacao":
          await exportacaoHook.exportar({
            dateFrom: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            dateTo: new Date(),
            formato: "excel",
            dados: ["vendas"]
          });
          break;
      }
    } catch (error) {
      console.error(`Test ${testName} failed:`, error);
    }
  };

  const getStatusIcon = (status: boolean | null) => {
    if (status === null) return <Clock className="h-4 w-4 text-yellow-500" />;
    if (status) return <CheckCircle className="h-4 w-4 text-green-500" />;
    return <XCircle className="h-4 w-4 text-red-500" />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>🧪 Teste dos Relatórios</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4">
          <div className="flex items-center justify-between p-3 border rounded">
            <div className="flex items-center gap-2">
              {getStatusIcon(testResults.relatoriosHookAvailable)}
              <span>Hook Relatórios Avançados</span>
            </div>
            <Button 
              size="sm" 
              onClick={() => runTest("relatorios")}
              disabled={relatoriosHook.loading}
            >
              {relatoriosHook.loading ? "Carregando..." : "Testar"}
            </Button>
          </div>

          <div className="flex items-center justify-between p-3 border rounded">
            <div className="flex items-center gap-2">
              {getStatusIcon(testResults.exportacaoHookAvailable)}
              <span>Hook Exportação</span>
            </div>
            <Button 
              size="sm" 
              onClick={() => runTest("exportacao")}
              disabled={exportacaoHook.loading}
            >
              {exportacaoHook.loading ? "Exportando..." : "Testar"}
            </Button>
          </div>

          <div className="flex items-center justify-between p-3 border rounded">
            <div className="flex items-center gap-2">
              {getStatusIcon(testResults.performanceHookAvailable)}
              <span>Hook Performance</span>
            </div>
            <Button 
              size="sm" 
              onClick={() => runTest("performance")}
              disabled={performanceHook.loading}
            >
              {performanceHook.loading ? "Analisando..." : "Testar"}
            </Button>
          </div>
        </div>

        {(testResults.relatoriosError || testResults.performanceError) && (
          <div className="p-3 bg-red-50 border border-red-200 rounded">
            <p className="text-red-600 text-sm">
              Erros encontrados:
              {testResults.relatoriosError && <div>• Relatórios: {testResults.relatoriosError}</div>}
              {testResults.performanceError && <div>• Performance: {testResults.performanceError}</div>}
            </p>
          </div>
        )}

        {relatoriosHook.data && (
          <div className="p-3 bg-green-50 border border-green-200 rounded">
            <p className="text-green-600 text-sm">
              ✅ Dados de relatórios carregados: {relatoriosHook.data.produtos?.length || 0} produtos encontrados
            </p>
          </div>
        )}

        {performanceHook.data && (
          <div className="p-3 bg-green-50 border border-green-200 rounded">
            <p className="text-green-600 text-sm">
              ✅ Análise de performance carregada: R$ {performanceHook.data.faturamento?.atual?.toFixed(2) || 0}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};