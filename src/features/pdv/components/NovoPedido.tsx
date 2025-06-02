
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FiltroProdutos } from "./FiltroProdutos";
import { ListaProdutos } from "./ListaProdutos";
import { ComandaPedido } from "./ComandaPedido";
import { ItemPedido } from "../types";
import { Product } from "@/types";

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
  finalizarPedido: (telefoneCliente?: string) => Promise<void>;
  salvandoPedido: boolean;
  onSelecionarProduto: (produto: Product) => void;
  nomeCliente: string;
  setNomeCliente: (nome: string) => void;
}

export const NovoPedido: React.FC<NovoPedidoProps> = ({
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
}) => {
  const [telefoneCliente, setTelefoneCliente] = useState("");

  const handleFinalizarPedido = async () => {
    await finalizarPedido(telefoneCliente || undefined);
    setTelefoneCliente(""); // Limpar telefone após finalizar
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Produtos - 2 colunas */}
      <div className="lg:col-span-2 space-y-4">
        <FiltroProdutos 
          tipoPedido={tipoPedido}
          mesaSelecionada={mesaSelecionada}
          setMesaSelecionada={setMesaSelecionada}
          categoriaAtiva={categoriaAtiva}
          setCategoriaAtiva={setCategoriaAtiva}
          busca={busca}
          setBusca={setBusca}
          restaurantId={restaurantId}
        />
        
        <ListaProdutos 
          restaurantId={restaurantId}
          categoriaAtiva={categoriaAtiva}
          busca={busca}
          onSelecionarProduto={onSelecionarProduto}
        />
      </div>

      {/* Comanda - 1 coluna */}
      <div className="space-y-4">
        {/* Informações do Cliente */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Informações do Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="nomeCliente" className="text-xs">Nome do Cliente</Label>
              <Input
                id="nomeCliente"
                placeholder="Nome do cliente (opcional)"
                value={nomeCliente}
                onChange={(e) => setNomeCliente(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="telefoneCliente" className="text-xs">WhatsApp (opcional)</Label>
              <Input
                id="telefoneCliente"
                placeholder="+55 11 99999-9999"
                value={telefoneCliente}
                onChange={(e) => setTelefoneCliente(e.target.value)}
                className="h-8 text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Será enviada confirmação via WhatsApp se informado
              </p>
            </div>
          </CardContent>
        </Card>

        <ComandaPedido 
          itensPedido={itensPedido}
          totalPedido={totalPedido}
          alterarQuantidade={alterarQuantidade}
          removerItem={removerItem}
          finalizarPedido={handleFinalizarPedido}
          salvandoPedido={salvandoPedido}
        />
      </div>
    </div>
  );
};
