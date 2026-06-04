
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ListaProdutos } from "./ListaProdutos";
import { ComandaPedido } from "./ComandaPedido";
import { FiltroProdutos } from "./FiltroProdutos";
import { usePDVOfflineCatalog } from "../hooks/usePDVOfflineCatalog";
import { formatPhone, validatePhone } from "@/utils/phoneValidation";
import { Product } from "@/types";
import { DadosClientePedido, ItemPedido } from "../types";
import { Database, PackageSearch, RefreshCw, UserRound, WifiOff } from "lucide-react";
import { PrintPaperSize } from "@/hooks/usePrint";
import { cn } from "@/lib/utils";

const formatLastSync = (value: string | null) => {
  if (!value) return "Ainda não sincronizado neste dispositivo";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Última sincronização indisponível";

  return `Última sincronização: ${date.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  })}`;
};

export interface NovoPedidoProps {
  restaurantId: string;
  restaurantName: string;
  printPaperSize: PrintPaperSize;
  categoriaAtiva: string;
  setCategoriaAtiva: (categoria: string) => void;
  busca: string;
  setBusca: (valor: string) => void;
  itensPedido: ItemPedido[];
  totalPedido: number;
  salvandoPedido: boolean;
  adicionarProduto: (produto: Product) => void;
  alterarQuantidade: (index: number, delta: number) => void;
  removerItem: (index: number) => void;
  finalizarPedidoOriginal: (dadosCliente?: DadosClientePedido) => Promise<boolean | void> | boolean | void;
  tipoPedido: "mesa" | "balcao";
  mesaSelecionada: string;
  setMesaSelecionada: (mesaId: string) => void;
  nomeCliente: string;
  setNomeCliente: (nome: string) => void;
}

export const NovoPedido: React.FC<NovoPedidoProps> = ({
  restaurantId,
  restaurantName,
  printPaperSize,
  categoriaAtiva,
  setCategoriaAtiva,
  busca,
  setBusca,
  itensPedido,
  totalPedido,
  salvandoPedido,
  adicionarProduto,
  alterarQuantidade,
  removerItem,
  finalizarPedidoOriginal,
  tipoPedido,
  mesaSelecionada,
  setMesaSelecionada,
  nomeCliente,
  setNomeCliente,
}) => {
  const {
    produtos,
    totalProdutos,
    produtosListaTruncada,
    categorias,
    mesas,
    areas,
    ultimaSincronizacao,
    possuiDadosLocais,
    usandoCache,
    isOnline,
    isChecking,
    loading: catalogLoading,
    syncing: catalogSyncing,
    error: catalogError,
    syncCatalog,
    refreshMesas,
  } = usePDVOfflineCatalog(restaurantId);

  const [telefoneCliente, setTelefoneCliente] = useState("");
  const [aceitaMarketing, setAceitaMarketing] = useState(false);
  const [telefoneError, setTelefoneError] = useState("");
  const [mesaError, setMesaError] = useState("");

  useEffect(() => {
    if (tipoPedido !== "mesa" || mesaSelecionada) {
      setMesaError("");
    }
  }, [tipoPedido, mesaSelecionada]);

  // Filtro local (categoria + busca pela descrição). A busca por nome
  // já é aplicada no servidor via useProdutos, garantindo cobertura
  // mesmo quando o total de itens excede PDV_PRODUCTS_LIMIT.
  const produtosFiltrados = produtos.filter((produto) => {
    const termoBusca = busca.toLowerCase().trim();
    const matchesSearch = !termoBusca
      || produto.name.toLowerCase().includes(termoBusca)
      || (produto.description ?? "").toLowerCase().includes(termoBusca);

    const matchesCategory = categoriaAtiva === "" || categoriaAtiva === "all" ||
      produto.category?.id === categoriaAtiva;

    return matchesSearch && matchesCategory && produto.available;
  });

  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const formatted = formatPhone(value);
    setTelefoneCliente(formatted);
    
    // Validar telefone se não estiver vazio
    if (value && !validatePhone(value)) {
      setTelefoneError("Telefone deve ter pelo menos 10 dígitos");
    } else {
      setTelefoneError("");
    }
  };

  const finalizarPedido = async () => {
    if (itensPedido.length === 0) {
      toast.error("Adicione pelo menos um item ao pedido");
      return;
    }

    if (tipoPedido === "mesa" && !mesaSelecionada) {
      const mensagem = "Selecione uma mesa ou altere o tipo do pedido para balcão.";
      setMesaError(mensagem);
      toast.error(mensagem);
      return;
    }

    // Validar telefone se foi fornecido
    if (telefoneCliente && !validatePhone(telefoneCliente)) {
      toast.error("Por favor, insira um número de telefone válido");
      return;
    }

    try {
      const pedidoFinalizado = await finalizarPedidoOriginal({
        nomeCliente,
        telefoneCliente: telefoneCliente || undefined,
        aceitaMarketing,
      });

      if (pedidoFinalizado === false) {
        return;
      }

      await refreshMesas();

      // Limpar campos após sucesso
      setTelefoneCliente("");
      setAceitaMarketing(false);
      setTelefoneError("");
      
    } catch (error) {
      console.error("Erro ao finalizar pedido:", error);
      toast.error("Erro ao finalizar pedido. Tente novamente.");
    }
  };

  return (
    <div className="grid h-full min-h-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_420px] 2xl:grid-cols-[minmax(0,1fr)_460px]">
      <Card className="flex min-h-[560px] flex-col overflow-hidden xl:h-full xl:min-h-0">
        <CardHeader className="border-b px-4 py-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2 text-base">
                <PackageSearch className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">Produtos</span>
                <span className="shrink-0 text-sm font-normal text-muted-foreground">
                  {produtosFiltrados.length} disponíveis
                </span>
              </CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatLastSync(ultimaSincronizacao)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge variant="outline" className="gap-1.5">
                {isChecking
                  ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  : !isOnline
                    ? <WifiOff className="h-3.5 w-3.5" />
                    : <Database className="h-3.5 w-3.5" />}
                {isChecking
                  ? "Verificando conexão"
                  : !isOnline
                  ? possuiDadosLocais ? "Offline: dados salvos" : "Offline"
                  : catalogSyncing
                    ? "Sincronizando"
                    : usandoCache
                      ? "Dados salvos"
                      : "Sincronizado"}
              </Badge>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => void syncCatalog()}
                disabled={!isOnline || catalogSyncing}
                aria-label="Atualizar dados do PDV"
                title="Atualizar dados do PDV"
              >
                <RefreshCw className={cn("h-4 w-4", catalogSyncing && "animate-spin")} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col gap-4 p-4">
            {catalogError && (
              <Alert variant={possuiDadosLocais ? "default" : "destructive"}>
                <AlertDescription>{catalogError}</AlertDescription>
              </Alert>
            )}
            <FiltroProdutos
              categoriaAtiva={categoriaAtiva}
              setCategoriaAtiva={setCategoriaAtiva}
              busca={busca}
              setBusca={setBusca}
              tipoPedido={tipoPedido}
              mesaSelecionada={mesaSelecionada}
              setMesaSelecionada={setMesaSelecionada}
              mesaError={mesaError}
              mesas={mesas}
              mesasLoading={catalogLoading || catalogSyncing}
              onRefreshMesas={refreshMesas}
              categorias={categorias}
              categoriasLoading={catalogLoading}
              areas={areas}
            />
            {produtosListaTruncada && !busca.trim() && (
              <p className="text-xs text-muted-foreground">
                Exibindo {produtos.length.toLocaleString("pt-BR")} de {totalProdutos.toLocaleString("pt-BR")} produtos disponíveis.
              </p>
            )}
            <div className="dashboard-scrollbar min-h-0 flex-1 overflow-y-auto pr-1">
              <ListaProdutos
                produtosFiltrados={produtosFiltrados}
                onSelecionarProduto={adicionarProduto}
                loading={catalogLoading}
              />
            </div>
        </CardContent>
      </Card>

      <div className="flex min-h-0 flex-col gap-4 xl:h-full">
        <Card className="shrink-0 overflow-hidden">
          <CardHeader className="border-b px-4 py-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <UserRound className="h-4 w-4 text-muted-foreground" />
              Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="nomeCliente">Nome do Cliente</Label>
              <Input
                id="nomeCliente"
                value={nomeCliente}
                onChange={(e) => setNomeCliente(e.target.value)}
                placeholder="Opcional"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="telefoneCliente">Telefone/WhatsApp</Label>
              <Input
                id="telefoneCliente"
                value={telefoneCliente}
                onChange={handleTelefoneChange}
                placeholder="(11) 99999-9999"
                className={telefoneError ? "border-red-500" : ""}
              />
              {telefoneError && (
                <p className="text-xs text-red-500">{telefoneError}</p>
              )}
            </div>

            <label className="flex items-start gap-2 text-xs text-muted-foreground sm:col-span-2 xl:col-span-1 2xl:col-span-2">
              <input
                type="checkbox"
                checked={aceitaMarketing}
                onChange={(event) => setAceitaMarketing(event.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-muted"
              />
              <span>
                Cliente autorizou receber campanhas. O telefone informado entra na base de clientes.
              </span>
            </label>
          </CardContent>
        </Card>

        <ComandaPedido
          itensPedido={itensPedido}
          totalPedido={totalPedido}
          alterarQuantidade={alterarQuantidade}
          removerItem={removerItem}
          finalizarPedido={finalizarPedido}
          salvandoPedido={salvandoPedido}
          tipoPedido={tipoPedido}
          mesaSelecionada={mesaSelecionada}
          mesas={mesas.map(mesa => ({ id: mesa.id, number: mesa.number, status: mesa.status }))}
          nomeCliente={nomeCliente}
          restaurantName={restaurantName}
          printPaperSize={printPaperSize}
          mesaError={mesaError}
          className="min-h-[420px] flex-1 xl:min-h-0"
        />
      </div>
    </div>
  );
};
