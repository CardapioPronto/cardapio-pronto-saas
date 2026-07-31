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
import { supabase } from "@/lib/supabase";
import {
  MENU_CSV_TEMPLATE,
  MenuCsvRow,
  normalizeCategoryName,
  parseMenuCsv,
} from "@/lib/menuCsvImport";
import { AlertTriangle, Download, FileUp, Upload } from "lucide-react";

interface ImportarCardapioDialogProps {
  restaurantId: string;
  categorias: Array<{ id: string; name: string }>;
  onImported: () => void;
}

export function ImportarCardapioDialog({
  restaurantId,
  categorias,
  onImported,
}: ImportarCardapioDialogProps) {
  const [open, setOpen] = useState(false);
  const [conteudo, setConteudo] = useState("");
  const [importando, setImportando] = useState(false);
  const [produtosExistentes, setProdutosExistentes] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const carregarProdutosExistentes = useCallback(async () => {
    if (!restaurantId) return;
    const { data } = await supabase
      .from("products")
      .select("name")
      .eq("restaurant_id", restaurantId);
    setProdutosExistentes((data ?? []).map((produto) => produto.name));
  }, [restaurantId]);

  const resultado = useMemo(
    () =>
      conteudo.trim()
        ? parseMenuCsv(conteudo, {
            categoriasExistentes: categorias.map((categoria) => categoria.name),
            produtosExistentes,
          })
        : null,
    [conteudo, categorias, produtosExistentes],
  );

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    const text = await file.text();
    setConteudo(text);
  };

  const baixarModelo = () => {
    const blob = new Blob([`\uFEFF${MENU_CSV_TEMPLATE}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "modelo-cardapio-pubfy.csv";
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

    try {
      const categoriaPorChave = new Map(
        categorias.map((categoria) => [normalizeCategoryName(categoria.name), categoria.id]),
      );

      // 1) Cria categorias novas encontradas no arquivo.
      for (const nomeCategoria of resultado.categoriasNovas) {
        const { data, error } = await supabase
          .from("categories")
          .insert({ name: nomeCategoria, restaurant_id: restaurantId })
          .select("id, name")
          .single();

        if (error) throw new Error(`Falha ao criar a categoria "${nomeCategoria}": ${error.message}`);
        if (data) categoriaPorChave.set(normalizeCategoryName(data.name), data.id);
      }

      // 2) Insere os produtos validos.
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id ?? null;

      const payload = resultado.validRows.map((row: MenuCsvRow) => ({
        name: row.nome,
        description: row.descricao || null,
        price: row.preco,
        available: row.disponivel,
        image_url: row.imagem_url,
        category_id: row.categoria ? categoriaPorChave.get(normalizeCategoryName(row.categoria)) ?? null : null,
        restaurant_id: restaurantId,
        created_by: userId,
      }));

      const { data: inseridos, error } = await supabase
        .from("products")
        .insert(payload as never)
        .select("id, name");

      if (error) throw new Error(error.message);

      // 3) Registra custo quando informado.
      const custosPorNome = new Map(
        resultado.validRows
          .filter((row) => row.custo != null)
          .map((row) => [normalizeCategoryName(row.nome), row.custo as number]),
      );

      const custos = (inseridos ?? [])
        .map((produto) => {
          const custo = custosPorNome.get(normalizeCategoryName(produto.name));
          return custo == null
            ? null
            : { restaurant_id: restaurantId, product_id: produto.id, cost_price: custo };
        })
        .filter(Boolean);

      if (custos.length > 0) {
        const { error: custoError } = await supabase
          .from("product_financial_settings")
          .upsert(custos as never, { onConflict: "product_id" });
        if (custoError) {
          toast.warning("Produtos importados, mas alguns custos não foram salvos.");
        }
      }

      toast.success(
        `${inseridos?.length ?? 0} produto(s) importado(s)` +
          (resultado.categoriasNovas.length > 0
            ? ` e ${resultado.categoriasNovas.length} categoria(s) criada(s).`
            : "."),
      );
      onImported();
      fecharEResetar();
    } catch (error) {
      const mensagem = error instanceof Error ? error.message : "Erro desconhecido na importação";
      toast.error(`Não foi possível concluir a importação: ${mensagem}`);
    } finally {
      setImportando(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setOpen(true);
          void carregarProdutosExistentes();
        } else {
          fecharEResetar();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileUp className="mr-2 h-4 w-4" />
          Importar cardápio (CSV)
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Importar cardápio por CSV</DialogTitle>
          <DialogDescription>
            Envie uma planilha com as colunas <strong>nome</strong> e <strong>preco</strong> (obrigatórias) e,
            opcionalmente, descricao, categoria, disponivel, imagem_url e custo. Categorias novas são criadas
            automaticamente.
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
            placeholder={MENU_CSV_TEMPLATE}
            className="h-32 font-mono text-xs"
            aria-label="Conteúdo CSV do cardápio"
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
                <Badge variant="secondary">{resultado.validRows.length} prontos para importar</Badge>
                {resultado.invalidRows.length > 0 && (
                  <Badge variant="destructive">{resultado.invalidRows.length} com erro</Badge>
                )}
                {resultado.categoriasNovas.length > 0 && (
                  <Badge variant="outline">{resultado.categoriasNovas.length} categoria(s) nova(s)</Badge>
                )}
              </div>

              <div className="max-h-64 overflow-auto rounded-md border">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-muted">
                    <tr>
                      <th className="px-3 py-2">Linha</th>
                      <th className="px-3 py-2">Produto</th>
                      <th className="px-3 py-2">Preço</th>
                      <th className="px-3 py-2">Categoria</th>
                      <th className="px-3 py-2">Situação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultado.rows.map((row) => (
                      <tr key={row.linha} className="border-t">
                        <td className="px-3 py-2 text-muted-foreground">{row.linha}</td>
                        <td className="px-3 py-2">{row.nome || "—"}</td>
                        <td className="px-3 py-2">
                          {row.preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </td>
                        <td className="px-3 py-2">{row.categoria || "Sem categoria"}</td>
                        <td className="px-3 py-2">
                          {row.erros.length === 0 ? (
                            <span className="text-green-700">OK</span>
                          ) : (
                            <span className="text-destructive">{row.erros.join(" ")}</span>
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
            {importando
              ? "Importando..."
              : `Importar ${resultado?.validRows.length ?? 0} produto(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}