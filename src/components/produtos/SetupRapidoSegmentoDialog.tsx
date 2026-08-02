import { useCallback, useMemo, useState } from "react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/sonner-toast";
import { supabase } from "@/lib/supabase";
import {
  SEGMENT_TEMPLATES,
  SegmentTemplate,
  normalizeName,
  planSegmentSetup,
} from "@/lib/segmentQuickSetup";
import { cn } from "@/lib/utils";
import { Check, Sparkles, Wand2 } from "lucide-react";

interface SetupRapidoSegmentoDialogProps {
  restaurantId: string;
  categorias: Array<{ id: string; name: string }>;
  onApplied: () => void;
}

export function SetupRapidoSegmentoDialog({
  restaurantId,
  categorias,
  onApplied,
}: SetupRapidoSegmentoDialogProps) {
  const [open, setOpen] = useState(false);
  const [segmentoId, setSegmentoId] = useState<string | null>(null);
  const [aplicando, setAplicando] = useState(false);
  const [produtosExistentes, setProdutosExistentes] = useState<string[]>([]);

  const carregarProdutosExistentes = useCallback(async () => {
    if (!restaurantId) return;
    const { data } = await supabase
      .from("products")
      .select("name")
      .eq("restaurant_id", restaurantId);
    setProdutosExistentes((data ?? []).map((produto) => produto.name));
  }, [restaurantId]);

  const segmento: SegmentTemplate | null = useMemo(
    () => SEGMENT_TEMPLATES.find((item) => item.id === segmentoId) ?? null,
    [segmentoId],
  );

  const plano = useMemo(
    () =>
      segmento
        ? planSegmentSetup(segmento, {
            categorias: categorias.map((categoria) => categoria.name),
            produtos: produtosExistentes,
          })
        : null,
    [segmento, categorias, produtosExistentes],
  );

  const fecharEResetar = () => {
    setSegmentoId(null);
    setOpen(false);
  };

  const aplicar = async () => {
    if (!segmento || !plano || plano.produtosNovos.length + plano.categoriasNovas.length === 0) return;
    setAplicando(true);

    try {
      const categoriaPorChave = new Map(
        categorias.map((categoria) => [normalizeName(categoria.name), categoria.id]),
      );

      for (const nomeCategoria of plano.categoriasNovas) {
        const { data, error } = await supabase
          .from("categories")
          .insert({ name: nomeCategoria, restaurant_id: restaurantId })
          .select("id, name")
          .single();

        if (error) throw new Error(`Falha ao criar a categoria "${nomeCategoria}": ${error.message}`);
        if (data) categoriaPorChave.set(normalizeName(data.name), data.id);
      }

      let criados = 0;
      if (plano.produtosNovos.length > 0) {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData.user?.id ?? null;

        const payload = plano.produtosNovos.map((produto) => ({
          name: produto.nome,
          description: produto.descricao,
          price: produto.preco,
          available: true,
          category_id: categoriaPorChave.get(normalizeName(produto.categoria)) ?? null,
          restaurant_id: restaurantId,
          created_by: userId,
        }));

        const { data: inseridos, error } = await supabase
          .from("products")
          .insert(payload as never)
          .select("id");

        if (error) throw new Error(error.message);
        criados = inseridos?.length ?? 0;
      }

      toast.success(
        `Setup ${segmento.nome} aplicado: ${criados} produto(s) e ${plano.categoriasNovas.length} categoria(s) criados.`,
      );
      onApplied();
      fecharEResetar();
    } catch (error) {
      const mensagem = error instanceof Error ? error.message : "Erro desconhecido";
      toast.error(`Não foi possível aplicar o setup rápido: ${mensagem}`);
    } finally {
      setAplicando(false);
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
          <Wand2 className="mr-2 h-4 w-4" />
          Setup rápido por segmento
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Setup rápido por segmento</DialogTitle>
          <DialogDescription>
            Escolha o tipo do seu estabelecimento para criar automaticamente categorias e produtos-modelo.
            Você pode editar ou excluir tudo depois — itens já existentes não são duplicados.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {SEGMENT_TEMPLATES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSegmentoId(item.id)}
                className={cn(
                  "rounded-lg border p-3 text-left transition-colors hover:bg-muted",
                  segmentoId === item.id ? "border-primary bg-primary/5" : "border-border",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    <span className="mr-2" aria-hidden="true">{item.emoji}</span>
                    {item.nome}
                  </span>
                  {segmentoId === item.id && <Check className="h-4 w-4 text-primary" />}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{item.descricao}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {item.categorias.length} categorias · {item.produtos.length} produtos
                </p>
              </button>
            ))}
          </div>

          {segmento && plano && (
            <div className="space-y-3 rounded-lg border p-4">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Sparkles className="h-4 w-4 text-primary" />
                <Badge variant="secondary">{plano.categoriasNovas.length} categoria(s) nova(s)</Badge>
                <Badge variant="secondary">{plano.produtosNovos.length} produto(s) novo(s)</Badge>
                {plano.produtosIgnorados.length > 0 && (
                  <Badge variant="outline">{plano.produtosIgnorados.length} já existente(s)</Badge>
                )}
              </div>

              <div className="max-h-64 overflow-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left">
                    <tr>
                      <th className="px-3 py-2">Produto</th>
                      <th className="px-3 py-2">Categoria</th>
                      <th className="px-3 py-2">Preço</th>
                      <th className="px-3 py-2">Situação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {segmento.produtos.map((produto) => {
                      const ignorado = plano.produtosIgnorados.some((p) => p.nome === produto.nome);
                      return (
                        <tr key={produto.nome} className="border-t">
                          <td className="px-3 py-2">{produto.nome}</td>
                          <td className="px-3 py-2 text-muted-foreground">{produto.categoria}</td>
                          <td className="px-3 py-2">
                            {produto.preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                          </td>
                          <td className="px-3 py-2">
                            {ignorado ? (
                              <span className="text-muted-foreground">Já existe</span>
                            ) : (
                              <span className="text-primary">Será criado</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {plano.produtosNovos.length === 0 && plano.categoriasNovas.length === 0 && (
                <Alert>
                  <AlertDescription>
                    Todos os itens deste modelo já existem no seu cardápio. Nada será criado.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={fecharEResetar} disabled={aplicando}>
            Cancelar
          </Button>
          <Button
            onClick={aplicar}
            disabled={
              aplicando ||
              !plano ||
              plano.produtosNovos.length + plano.categoriasNovas.length === 0
            }
          >
            {aplicando ? "Aplicando..." : "Aplicar setup"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
