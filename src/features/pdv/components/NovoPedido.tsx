
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
    loading: produtosLoading,
    isFetching: produtosFetching,
  } = useProdutos(restaurantId);
  const { mesas, loading: mesasLoading, loadMesas } = useMesas(restaurantId);

  const [telefoneCliente, setTelefoneCliente] = useState("");
  const [telefoneError, setTelefoneError] = useState("");
  const [mesaError, setMesaError] = useState("");

  useEffect(() => {
    if (tipoPedido !== "mesa" || mesaSelecionada) {
      setMesaError("");
    }
  }, [tipoPedido, mesaSelecionada]);

  // Filter products based on search and category
  const produtosFiltrados = produtos.filter((produto) => {
    const termoBusca = busca.toLowerCase().trim();
    const matchesSearch = busca === "" || 
      produto.name.toLowerCase().includes(termoBusca) ||
      (produto.description ?? "").toLowerCase().includes(termoBusca);
    
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Lista de Produtos */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Selecionar Produtos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
            <ListaProdutos
              produtosFiltrados={produtosFiltrados}
              onSelecionarProduto={adicionarProduto}
              loading={produtosLoading || produtosFetching}
            />
          </CardContent>
        </Card>
      </div>

      {/* Comanda do Pedido */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Dados do Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
              <p className="text-xs text-muted-foreground">
                Opcional - Para envio de confirmação via WhatsApp
              </p>
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
        />
      </div>
    </div>
  );
};
