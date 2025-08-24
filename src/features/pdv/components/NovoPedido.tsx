
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { usePDVHook } from "@/features/pdv/hooks/usePDVHook";
import { ListaProdutos } from "./ListaProdutos";
import { ComandaPedido } from "./ComandaPedido";
import { FiltroProdutos } from "./FiltroProdutos";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { WhatsAppService } from "@/services/whatsapp/whatsappService";
import { useProdutos } from "@/hooks/useProdutos";
import { useMesas } from "@/hooks/useMesas";
import { formatPhone, validatePhone } from "@/utils/phoneValidation";
import { Product } from "@/types";

export interface NovoPedidoProps {
  categoriaAtiva?: string;
  setCategoriaAtiva?: (categoria: string) => void;
  busca?: string;
  setBusca?: (valor: string) => void;
  itensPedido?: any[];
  totalPedido?: number;
  salvandoPedido?: boolean;
  adicionarProduto?: (produto: Product) => void;
  alterarQuantidade?: (index: number, delta: number) => void;
  removerItem?: (index: number) => void;
  finalizarPedidoOriginal?: () => Promise<void> | void;
  tipoPedido?: "mesa" | "balcao";
  mesaSelecionada?: string;
  setMesaSelecionada?: (mesaId: string) => void;
  nomeCliente?: string;
  setNomeCliente?: (nome: string) => void;
}

export const NovoPedido: React.FC<NovoPedidoProps> = (props) => {
  const { user } = useCurrentUser();
  const restaurantId = user?.restaurant_id || "";
  
  // Hook interno como fallback quando props não são passadas
  const hook = usePDVHook(restaurantId);

  // Preferir props vindas do componente pai (PDV) para compartilhar o estado
  const merged = {
    categoriaAtiva: props.categoriaAtiva ?? hook.categoriaAtiva,
    setCategoriaAtiva: props.setCategoriaAtiva ?? hook.setCategoriaAtiva,
    busca: props.busca ?? hook.busca,
    setBusca: props.setBusca ?? hook.setBusca,
    itensPedido: props.itensPedido ?? hook.itensPedido,
    totalPedido: props.totalPedido ?? hook.totalPedido,
    salvandoPedido: props.salvandoPedido ?? hook.salvandoPedido,
    adicionarProduto: props.adicionarProduto ?? hook.adicionarProduto,
    alterarQuantidade: props.alterarQuantidade ?? hook.alterarQuantidade,
    removerItem: props.removerItem ?? hook.removerItem,
    finalizarPedidoOriginal: props.finalizarPedidoOriginal ?? hook.finalizarPedido,
    tipoPedido: props.tipoPedido ?? hook.tipoPedido,
    mesaSelecionada: props.mesaSelecionada ?? hook.mesaSelecionada,
    setMesaSelecionada: props.setMesaSelecionada ?? hook.setMesaSelecionada,
    nomeCliente: props.nomeCliente ?? hook.nomeCliente,
    setNomeCliente: props.setNomeCliente ?? hook.setNomeCliente,
  } as Required<NovoPedidoProps> & { finalizarPedidoOriginal: () => Promise<void> | void };

  const {
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
  } = merged;

  const { produtos } = useProdutos(restaurantId);
  const { mesas } = useMesas(restaurantId);

  const [telefoneCliente, setTelefoneCliente] = useState("");
  const [telefoneError, setTelefoneError] = useState("");

  // Filter products based on search and category
  const produtosFiltrados = produtos.filter((produto) => {
    const matchesSearch = busca === "" || 
      produto.name.toLowerCase().includes(busca.toLowerCase()) ||
      produto.description.toLowerCase().includes(busca.toLowerCase());
    
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

    if (!nomeCliente.trim()) {
      toast.error("Nome do cliente é obrigatório");
      return;
    }

    // Validar telefone se foi fornecido
    if (telefoneCliente && !validatePhone(telefoneCliente)) {
      toast.error("Por favor, insira um número de telefone válido");
      return;
    }

    try {
      // Call the original function with customer data
      await finalizarPedidoOriginal();
      
      // Tentar enviar notificação WhatsApp se telefone foi fornecido
      if (telefoneCliente) {
        try {
          // Buscar o último pedido criado para obter o ID
          setTimeout(async () => {
            try {
              await WhatsAppService.sendOrderConfirmation(
                restaurantId,
                telefoneCliente,
                'ultimo' // Indicar que é o último pedido
              );
              toast.success("Pedido finalizado e notificação WhatsApp enviada!");
            } catch (error) {
              console.error('Erro ao enviar WhatsApp:', error);
            }
          }, 1000);
        } catch (error) {
          console.error('Erro ao enviar WhatsApp:', error);
        }
      }

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
            />
            <ListaProdutos
              categoriaAtiva={categoriaAtiva}
              produtosFiltrados={produtosFiltrados}
              onSelecionarProduto={adicionarProduto}
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
              <Label htmlFor="nomeCliente">Nome do Cliente *</Label>
              <Input
                id="nomeCliente"
                value={nomeCliente}
                onChange={(e) => setNomeCliente(e.target.value)}
                placeholder="Digite o nome do cliente"
                className={!nomeCliente.trim() && itensPedido.length > 0 ? "border-red-500" : ""}
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
          mesas={mesas.map(mesa => ({ id: mesa.id, number: mesa.number }))}
        />
      </div>
    </div>
  );
};
