
import { useState } from "react";
import { FiltroProdutos } from "./FiltroProdutos";
import { ProdutoCard } from "./ProdutoCard";
import { ComandaPedido } from "./ComandaPedido";
import { Product } from "@/types";
import { useProdutos } from "@/hooks/useProdutos";
import { ItemPedido } from "../types";

interface NovoPedidoProps {
  restaurantId: string;
  tipoPedido: "mesa" | "balcao";
  mesaSelecionada: string;
  setMesaSelecionada: (mesa: string) => void;
  categoriaAtiva: string;
  setCategoriaAtiva: (categoria: string) => void;
  busca: string;
  setBusca: (busca: string) => void;
  itensPedido: ItemPedido[];
  totalPedido: number;
  alterarQuantidade: (index: number, delta: number) => void;
  removerItem: (index: number) => void;
  finalizarPedido: () => void;
  salvandoPedido: boolean;
  onSelecionarProduto: (produto: Product) => void;
  nomeCliente: string;
  setNomeCliente: (nome: string) => void;
}

export const NovoPedido = ({
  restaurantId,
  tipoPedido,
  mesaSelecionada,
  setMesaSelecionada,
  categoriaAtiva,
  setCategoriaAtiva,
  busca,
  setBusca,
  itensPedido,
  totalPedido,
  alterarQuantidade,
  removerItem,
  finalizarPedido,
  salvandoPedido,
  onSelecionarProduto,
  nomeCliente,
  setNomeCliente
}: NovoPedidoProps) => {
  // Obter produtos usando o hook existente
  const { produtos, loading } = useProdutos(restaurantId);

  // Filtrar produtos por categoria e busca
  const produtosFiltrados = produtos.filter(produto => {
    const matchesBusca = busca === "" || 
                        produto.name.toLowerCase().includes(busca.toLowerCase()) ||
                        produto.description.toLowerCase().includes(busca.toLowerCase());
    const matchesCategoria = categoriaAtiva === "" || categoriaAtiva === "all" || produto.category?.id === categoriaAtiva;
    
    return matchesBusca && matchesCategoria;
  });

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Coluna da esquerda - Seleção de produtos */}
      <div className="lg:col-span-2 space-y-4">
        <FiltroProdutos 
          categoriaAtiva={categoriaAtiva}
          setCategoriaAtiva={setCategoriaAtiva}
          busca={busca}
          setBusca={setBusca}
          tipoPedido={tipoPedido}
          mesaSelecionada={mesaSelecionada}
          setMesaSelecionada={setMesaSelecionada}
          restaurantId={restaurantId}
        />
        
        <div className="mt-4">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <p>Carregando produtos...</p>
            </div>
          ) : produtosFiltrados.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {produtosFiltrados.map((produto) => (
                <ProdutoCard 
                  key={produto.id} 
                  produto={produto} 
                  onSelecionar={onSelecionarProduto} 
                />
              ))}
            </div>
          ) : (
            <div className="flex justify-center items-center h-64 text-center">
              <div>
                <p className="text-lg font-medium">Nenhum produto encontrado</p>
                <p className="text-gray-500">Tente ajustar os filtros ou adicione novos produtos</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Coluna da direita - Comanda atual */}
      <ComandaPedido
        tipoPedido={tipoPedido}
        mesaSelecionada={mesaSelecionada}
        itensPedido={itensPedido}
        totalPedido={totalPedido}
        alterarQuantidade={alterarQuantidade}
        removerItem={removerItem}
        finalizarPedido={finalizarPedido}
        salvandoPedido={salvandoPedido}
        nomeCliente={nomeCliente}
        setNomeCliente={setNomeCliente}
      />
    </div>
  );
};
