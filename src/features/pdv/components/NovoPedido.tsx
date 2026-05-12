
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ListaProdutos } from "./ListaProdutos";
import { ComandaPedido } from "./ComandaPedido";
import { FiltroProdutos } from "./FiltroProdutos";
import { useProdutos } from "@/hooks/useProdutos";
import { useMesas } from "@/hooks/useMesas";
import { formatPhone, validatePhone } from "@/utils/phoneValidation";
import { Product } from "@/types";
import { DadosClientePedido, ItemPedido } from "../types";
import { PackageSearch, UserRound } from "lucide-react";

// B7 — Limite alto para evitar paginação no PDV. A consulta usa
// ordenação por nome e a filtragem (busca/categoria) é client-side
// sobre este conjunto. Restaurantes com mais de PDV_PRODUCTS_LIMIT
// produtos disponíveis recebem aviso para usar a busca por nome.
const PDV_PRODUCTS_LIMIT = 500;

export interface NovoPedidoProps {
  restaurantId: string;
  restaurantName: string;
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
    total: totalProdutos,
    loading: produtosLoading,
    isFetching: produtosFetching,
  } = useProdutos(restaurantId, {
    busca,
    tab: "disponiveis",
    itensPorPagina: PDV_PRODUCTS_LIMIT,
    sortKey: "name",
    sortDirection: "asc",
  });
  const { mesas, loading: mesasLoading, loadMesas } = useMesas(restaurantId);

  const produtosListaTruncada = totalProdutos > PDV_PRODUCTS_LIMIT;

  const [telefoneCliente, setTelefoneCliente] = useState("");
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
      });

      if (pedidoFinalizado === false) {
        return;
      }

      await loadMesas();

      // Limpar campos após sucesso
      setTelefoneCliente("");
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
          <CardTitle className="flex items-center justify-between gap-3 text-base">
            <span className="flex min-w-0 items-center gap-2">
              <PackageSearch className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate">Produtos</span>
            </span>
            <span className="shrink-0 text-sm font-normal text-muted-foreground">
              {produtosFiltrados.length} disponíveis
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col gap-4 p-4">
            <FiltroProdutos
              categoriaAtiva={categoriaAtiva}
              setCategoriaAtiva={setCategoriaAtiva}
              busca={busca}
              setBusca={setBusca}
              tipoPedido={tipoPedido}
              mesaSelecionada={mesaSelecionada}
              setMesaSelecionada={setMesaSelecionada}
              restaurantId={restaurantId}
              mesaError={mesaError}
              mesas={mesas}
              mesasLoading={mesasLoading}
              onRefreshMesas={loadMesas}
            />
            {produtosListaTruncada && !busca.trim() && (
              <p className="text-xs text-muted-foreground">
                Exibindo os {PDV_PRODUCTS_LIMIT} primeiros produtos. Use a busca para localizar itens fora desta lista.
              </p>
            )}
            <div className="dashboard-scrollbar min-h-0 flex-1 overflow-y-auto pr-1">
              <ListaProdutos
                produtosFiltrados={produtosFiltrados}
                onSelecionarProduto={adicionarProduto}
                loading={produtosLoading || produtosFetching}
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
          mesaError={mesaError}
          className="min-h-[420px] flex-1 xl:min-h-0"
        />
      </div>
    </div>
  );
};
