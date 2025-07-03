import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Download, FileSpreadsheet, FileText } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useExportacaoDados } from "@/hooks/useExportacaoDados";

export const ExportacaoDados = () => {
  const [dateFrom, setDateFrom] = useState<Date>(startOfMonth(new Date()));
  const [dateTo, setDateTo] = useState<Date>(endOfMonth(new Date()));
  const [formato, setFormato] = useState<"excel" | "pdf">("excel");
  const [dados, setDados] = useState<string[]>(["vendas", "produtos"]);
  
  const { exportar, loading } = useExportacaoDados();

  const handleDadosChange = (tipo: string, checked: boolean) => {
    if (checked) {
      setDados([...dados, tipo]);
    } else {
      setDados(dados.filter(d => d !== tipo));
    }
  };

  const handleExportar = async () => {
    await exportar({
      dateFrom,
      dateTo,
      formato,
      dados
    });
  };

  const tiposDados = [
    { id: "vendas", label: "Relatório de Vendas", desc: "Pedidos, valores, status" },
    { id: "produtos", label: "Produtos", desc: "Lista completa com preços e categorias" },
    { id: "clientes", label: "Clientes", desc: "Dados dos clientes e histórico" },
    { id: "categorias", label: "Categorias", desc: "Categorias e produtos associados" },
    { id: "funcionarios", label: "Funcionários", desc: "Lista de funcionários e permissões" },
    { id: "dashboard", label: "Estatísticas", desc: "Resumo executivo do período" }
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Exportação de Dados
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Período */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Data Inicial</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateFrom && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, "PPP", { locale: ptBR }) : "Selecione"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={(date) => date && setDateFrom(date)}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Data Final</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateTo && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, "PPP", { locale: ptBR }) : "Selecione"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={(date) => date && setDateTo(date)}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Formato */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Formato de Exportação</label>
            <Select value={formato} onValueChange={(value: "excel" | "pdf") => setFormato(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="excel">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    Excel (.xlsx)
                  </div>
                </SelectItem>
                <SelectItem value="pdf">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    PDF (.pdf)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Dados para Exportar */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Dados para Exportar</label>
            <div className="grid gap-3">
              {tiposDados.map((tipo) => (
                <div key={tipo.id} className="flex items-start space-x-2">
                  <Checkbox
                    id={tipo.id}
                    checked={dados.includes(tipo.id)}
                    onCheckedChange={(checked) => handleDadosChange(tipo.id, checked as boolean)}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <label
                      htmlFor={tipo.id}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {tipo.label}
                    </label>
                    <p className="text-xs text-muted-foreground">
                      {tipo.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Button 
            onClick={handleExportar} 
            disabled={loading || dados.length === 0}
            className="w-full"
          >
            <Download className="mr-2 h-4 w-4" />
            {loading ? "Exportando..." : `Exportar ${formato.toUpperCase()}`}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};