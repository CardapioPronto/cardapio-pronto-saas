import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, LayoutGrid, Package, Store, PartyPopper, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/components/ui/sonner-toast";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useCategorias } from "@/hooks/useCategorias";
import { useMesas } from "@/hooks/useMesas";
import { ImportarCardapioDialog } from "@/components/produtos/ImportarCardapioDialog";
import { SetupRapidoSegmentoDialog } from "@/components/produtos/SetupRapidoSegmentoDialog";

type StepId = "restaurante" | "cardapio" | "mesas" | "pronto";

const STEPS: Array<{ id: StepId; title: string; description: string; icon: typeof Store }> = [
  { id: "restaurante", title: "Dados do restaurante", description: "Nome, contato e endereço", icon: Store },
  { id: "cardapio", title: "Primeiro cardápio", description: "Importe ou gere seus produtos", icon: Package },
  { id: "mesas", title: "Mesas", description: "Crie as mesas do salão", icon: LayoutGrid },
  { id: "pronto", title: "Tudo pronto", description: "Comece a vender", icon: PartyPopper },
];

const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

export default function Onboarding() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const restaurantId = user?.restaurant_id ?? "";

  const [stepIndex, setStepIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", phone_whatsapp: "", address: "", slug: "" });
  const [produtosCount, setProdutosCount] = useState(0);
  const [quantidadeMesas, setQuantidadeMesas] = useState("8");
  const [criandoMesas, setCriandoMesas] = useState(false);

  const { categorias, fetchCategorias } = useCategorias();
  const { mesas, loadMesas, createMesa } = useMesas(restaurantId);

  const carregarProdutos = useCallback(async () => {
    if (!restaurantId) return;
    const { count } = await supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("restaurant_id", restaurantId);
    setProdutosCount(count ?? 0);
  }, [restaurantId]);

  useEffect(() => {
    let ativo = true;
    const carregar = async () => {
      if (!restaurantId) return;
      setLoading(true);
      const { data } = await supabase
        .from("restaurants")
        .select("name, phone_whatsapp, address, slug")
        .eq("id", restaurantId)
        .maybeSingle();
      if (ativo && data) {
        setForm({
          name: data.name ?? "",
          phone_whatsapp: data.phone_whatsapp ?? "",
          address: data.address ?? "",
          slug: data.slug ?? "",
        });
      }
      await Promise.all([carregarProdutos(), loadMesas()]);
      if (ativo) setLoading(false);
    };
    void carregar();
    return () => {
      ativo = false;
    };
  }, [restaurantId, carregarProdutos, loadMesas]);

  const stepDone = useMemo(
    () => ({
      restaurante: Boolean(form.name.trim() && form.phone_whatsapp.trim() && form.address.trim()),
      cardapio: produtosCount > 0,
      mesas: mesas.length > 0,
      pronto: false,
    }),
    [form, produtosCount, mesas.length],
  );

  const concluidas = Number(stepDone.restaurante) + Number(stepDone.cardapio) + Number(stepDone.mesas);
  const progresso = Math.round((concluidas / 3) * 100);
  const stepAtual = STEPS[stepIndex];

  const salvarRestaurante = async () => {
    if (!restaurantId) return;
    if (!form.name.trim()) {
      toast.error("Informe o nome do restaurante");
      return;
    }
    setSaving(true);
    const slug = form.slug.trim() ? slugify(form.slug) : slugify(form.name);
    const { error } = await supabase
      .from("restaurants")
      .update({
        name: form.name.trim(),
        phone_whatsapp: form.phone_whatsapp.trim() || null,
        address: form.address.trim() || null,
        slug: slug || null,
      })
      .eq("id", restaurantId);
    setSaving(false);
    if (error) {
      toast.error("Não foi possível salvar os dados do restaurante");
      return;
    }
    setForm((prev) => ({ ...prev, slug }));
    toast.success("Dados salvos!");
    setStepIndex(1);
  };

  const criarMesas = async () => {
    const total = Number(quantidadeMesas);
    if (!Number.isFinite(total) || total < 1 || total > 60) {
      toast.error("Informe uma quantidade entre 1 e 60");
      return;
    }
    setCriandoMesas(true);
    try {
      const existentes = new Set(mesas.map((mesa) => mesa.number));
      let criadas = 0;
      for (let i = 1; i <= total; i += 1) {
        const numero = String(i);
        if (existentes.has(numero)) continue;
        await createMesa({ number: numero, name: `Mesa ${numero}`, capacity: 4, status: "livre", is_active: true });
        criadas += 1;
      }
      await loadMesas();
      toast.success(criadas > 0 ? `${criadas} mesa(s) criada(s)` : "As mesas já estavam criadas");
      setStepIndex(3);
    } catch {
      toast.error("Erro ao criar as mesas");
    } finally {
      setCriandoMesas(false);
    }
  };

  if (!restaurantId) {
    return (
      <div className="p-6">
        <Alert>
          <AlertDescription>
            Não encontramos um restaurante ativo para a sua conta. Escolha uma unidade e tente novamente.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-4 md:p-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold md:text-3xl">Configuração inicial</h1>
        <p className="text-muted-foreground">
          Em poucos minutos você deixa o restaurante pronto: dados, cardápio importado e mesas do salão.
        </p>
        <div className="flex items-center gap-3 pt-2">
          <Progress value={progresso} className="h-2" />
          <span className="whitespace-nowrap text-sm text-muted-foreground">{concluidas}/3 etapas</span>
        </div>
      </header>

      <nav className="grid gap-2 sm:grid-cols-4">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          const done = stepDone[step.id];
          const ativo = index === stepIndex;
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => setStepIndex(index)}
              className={cn(
                "flex items-start gap-2 rounded-lg border p-3 text-left transition-colors",
                ativo ? "border-primary bg-primary/5" : "border-border hover:bg-muted/60",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs",
                  done ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40",
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : index + 1}
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {step.title}
                </span>
                <span className="block text-xs text-muted-foreground">{step.description}</span>
              </span>
            </button>
          );
        })}
      </nav>

      <Card>
        <CardHeader>
          <CardTitle>{stepAtual.title}</CardTitle>
          <CardDescription>{stepAtual.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando dados...
            </div>
          ) : stepAtual.id === "restaurante" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="nome">Nome do restaurante</Label>
                <Input
                  id="nome"
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="Ex.: Cantina da Praça"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input
                  id="whatsapp"
                  value={form.phone_whatsapp}
                  onChange={(event) => setForm((prev) => ({ ...prev, phone_whatsapp: event.target.value }))}
                  placeholder="(11) 99999-9999"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Endereço do cardápio online</Label>
                <Input
                  id="slug"
                  value={form.slug}
                  onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
                  placeholder="cantina-da-praca"
                />
                <p className="text-xs text-muted-foreground">
                  pubfy.com.br/cardapio/{slugify(form.slug || form.name) || "sua-loja"}
                </p>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="endereco">Endereço</Label>
                <Input
                  id="endereco"
                  value={form.address}
                  onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
                  placeholder="Rua, número, bairro, cidade"
                />
              </div>
              <div className="sm:col-span-2">
                <Button onClick={salvarRestaurante} disabled={saving}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Salvar e continuar
                </Button>
              </div>
            </div>
          ) : stepAtual.id === "cardapio" ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={produtosCount > 0 ? "default" : "secondary"}>
                  {produtosCount} produto(s) cadastrado(s)
                </Badge>
                <Badge variant="secondary">{categorias.length} categoria(s)</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Importe uma planilha com o cardápio atual ou gere um cardápio-modelo pelo segmento do seu negócio.
              </p>
              <div className="flex flex-wrap gap-2">
                <ImportarCardapioDialog
                  restaurantId={restaurantId}
                  categorias={categorias.map((categoria) => ({ id: categoria.id, name: categoria.name }))}
                  onImported={() => {
                    void fetchCategorias();
                    void carregarProdutos();
                  }}
                />
                <SetupRapidoSegmentoDialog
                  restaurantId={restaurantId}
                  categorias={categorias.map((categoria) => ({ id: categoria.id, name: categoria.name }))}
                  onApplied={() => {
                    void fetchCategorias();
                    void carregarProdutos();
                  }}
                />
                <Button variant="outline" asChild>
                  <Link to="/produtos">Cadastrar manualmente</Link>
                </Button>
              </div>
            </div>
          ) : stepAtual.id === "mesas" ? (
            <div className="space-y-4">
              <Badge variant={mesas.length > 0 ? "default" : "secondary"}>{mesas.length} mesa(s) cadastrada(s)</Badge>
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-2">
                  <Label htmlFor="qtd-mesas">Quantidade de mesas</Label>
                  <Input
                    id="qtd-mesas"
                    className="w-32"
                    inputMode="numeric"
                    value={quantidadeMesas}
                    onChange={(event) => setQuantidadeMesas(event.target.value.replace(/\D/g, ""))}
                  />
                </div>
                <Button onClick={criarMesas} disabled={criandoMesas}>
                  {criandoMesas ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Criar mesas
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/mesas">Abrir tela de mesas</Link>
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                As mesas são criadas numeradas de 1 até a quantidade informada, com 4 lugares cada. Você pode ajustar
                nomes, áreas e lugares depois na tela de mesas.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <Alert>
                <AlertDescription>
                  {concluidas === 3
                    ? "Configuração concluída! Seu cardápio e o salão já estão prontos para o primeiro pedido."
                    : "Ainda faltam etapas. Você pode voltar e concluir a qualquer momento."}
                </AlertDescription>
              </Alert>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => navigate("/mesas")}>
                  Ir para as mesas
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button variant="outline" onClick={() => navigate("/dashboard")}>
                  Ir para o painel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={() => setStepIndex((index) => Math.max(0, index - 1))} disabled={stepIndex === 0}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <Button
          variant="ghost"
          onClick={() => setStepIndex((index) => Math.min(STEPS.length - 1, index + 1))}
          disabled={stepIndex === STEPS.length - 1}
        >
          Avançar
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
