import { useCallback, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/sonner-toast";
import { listCrmCustomers, updateCrmCustomerProfile } from "@/services/crmService";
import { CrmCustomer } from "@/types/crm";
import {
  CUSTOMER_CSV_TEMPLATE,
  CustomerCsvRow,
  parseCustomerCsv,
} from "@/lib/customerCsvImport";
import { AlertTriangle, Download, FileUp, Upload } from "lucide-react";

interface ImportarClientesDialogProps {
  onImported: () => void;
}

export function ImportarClientesDialog({ onImported }: ImportarClientesDialogProps) {
  const [open, setOpen] = useState(false);
  const [conteudo, setConteudo] = useState("");
  const [importando, setImportando] = useState(false);
  const [clientesExistentes, setClientesExistentes] = useState<CrmCustomer[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const carregarExistentes = useCallback(async () => {
    try {
      const response = await listCrmCustomers({ limit: 1000 });
      setClientesExistentes(response.customers);
    } catch (error) {
      console.error("Erro ao carregar clientes existentes:", error);
    }
  }, []);

  const resultado = useMemo(
    () =>
      conteudo.trim()
        ? parseCustomerCsv(conteudo, {
            telefonesExistentes: clientesExistentes.map((cliente) => cliente.phone_normalized),
          })
        : null,
    [conteudo, clientesExistentes],
  );

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setConteudo(await file.text());
  };

  const baixarModelo = () => {
    const blob = new Blob([`\uFEFF${CUSTOMER_CSV_TEMPLATE}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "modelo-clientes-pubfy.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const fecharEResetar = () => {
    setConteudo("");
    setOpen(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const importar = async () => {
    if (!resultado || resultado.validRows.length === 0) return;
    setImportando(true);

    const existentesPorTelefone = new Map(
      clientesExistentes.map((cliente) => [cliente.phone_normalized, cliente]),
    );

    let sucesso = 0;
    const falhas: string[] = [];

    for (const row of resultado.validRows as CustomerCsvRow[]) {
      const atual = existentesPorTelefone.get(row.phone_normalized);
      try {
        await updateCrmCustomerProfile(row.phone_normalized, {
          // Campos em branco no CSV preservam o que ja existe na base.
          name: row.nome || atual?.name || null,
          email: row.email || atual?.email || null,
          birth_date: row.data_nascimento || atual?.birth_date || null,
          tags: Array.from(new Set([...(atual?.tags ?? []), ...row.tags])),
          notes: row.observacoes || atual?.notes || null,
          accepts_marketing: row.aceita_marketing ?? (atual ? atual.accepts_marketing : null),
          source: row.origem,
        });
        sucesso += 1;
      } catch (error) {
        const mensagem = error instanceof Error ? error.message : "erro desconhecido";
        falhas.push(`Linha ${row.linha}: ${mensagem}`);
      }
    }

    setImportando(false);

    if (sucesso > 0) toast.success(`${sucesso} cliente(s) importado(s) com sucesso.`);
    if (falhas.length > 0) {
      console.error("Falhas na importação de clientes:", falhas);
      toast.error(`${falhas.length} linha(s) não foram salvas. ${falhas[0]}`);
    }

    onImported();
    if (falhas.length === 0) fecharEResetar();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setOpen(true);
          void carregarExistentes();
        } else {
          fecharEResetar();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full lg:w-auto">
          <FileUp className="mr-2 h-4 w-4" />
          Importar clientes (CSV)
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Importar clientes por CSV</DialogTitle>
          <DialogDescription>
            Coluna obrigatória: <strong>telefone</strong>. Opcionais: nome, email, data_nascimento,
            tags, observacoes, aceita_marketing e origem. Clientes já cadastrados são atualizados
            pelo telefone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" />
              Selecionar arquivo
            </Button>
            <Button type="button" variant="ghost" onClick={baixarModelo}>
              <Download className="mr-2 h-4 w-4" />
              Baixar modelo
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv,text/plain"
              className="hidden"
              onChange={(event) => handleFile(event.target.files?.[0])}
            />
          </div>

          <Textarea
            value={conteudo}
            onChange={(event) => setConteudo(event.target.value)}
            placeholder={CUSTOMER_CSV_TEMPLATE}
            className="h-32 font-mono text-xs"
            aria-label="Conteúdo CSV de clientes"
          />

          {resultado?.headerErrors.length ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{resultado.headerErrors.join(" ")}</AlertDescription>
            </Alert>
          ) : null}

          {resultado && resultado.headerErrors.length === 0 && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2 text-sm">
                <Badge variant="secondary">{resultado.novos} novo(s)</Badge>
                <Badge variant="outline">{resultado.atualizacoes} atualização(ões)</Badge>
                {resultado.invalidRows.length > 0 && (
                  <Badge variant="destructive">{resultado.invalidRows.length} com erro</Badge>
                )}
              </div>

              <div className="max-h-64 overflow-auto rounded-md border">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-muted">
                    <tr>
                      <th className="px-3 py-2">Linha</th>
                      <th className="px-3 py-2">Nome</th>
                      <th className="px-3 py-2">Telefone</th>
                      <th className="px-3 py-2">E-mail</th>
                      <th className="px-3 py-2">Situação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultado.rows.map((row) => (
                      <tr key={`${row.linha}-${row.telefone}`} className="border-t">
                        <td className="px-3 py-2 text-muted-foreground">{row.linha}</td>
                        <td className="px-3 py-2">{row.nome || "—"}</td>
                        <td className="px-3 py-2">{row.telefone || "—"}</td>
                        <td className="px-3 py-2">{row.email || "—"}</td>
                        <td className="px-3 py-2">
                          {row.erros.length > 0 ? (
                            <span className="text-destructive">{row.erros.join(" ")}</span>
                          ) : row.atualizacao ? (
                            <span className="text-muted-foreground">Será atualizado</span>
                          ) : (
                            <span className="text-green-700">Novo</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {resultado.invalidRows.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Linhas com erro são ignoradas. Corrija o arquivo e importe novamente para incluí-las.
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={fecharEResetar} disabled={importando}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={importar}
            disabled={importando || !resultado || resultado.validRows.length === 0}
          >
            {importando ? "Importando..." : `Importar ${resultado?.validRows.length ?? 0} cliente(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
