
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { usePDVHook } from "@/features/pdv/hooks/usePDVHook";
import { ListaProdutos } from "./ListaProdutos";
import { ComandaPedido } from "./ComandaPedido";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { WhatsAppService } from "@/services/whatsapp/whatsappService";

export const NovoPedido: React.FC = () => {
  const { user } = useCurrentUser();
  const restaurantId = user?.restaurant_id || "";
  
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
    finalizarPedido: finalizarPedidoOriginal,
    tipoPedido,
    mesaSelecionada,
    produtosFiltrados
  } = usePDVHook();

  const [nomeCliente, setNomeCliente] = useState("");
  const [telefoneCliente, setTelefoneCliente] = useState("");

  const finalizarPedido = async () => {
    if (itensPedido.length === 0) {
      toast.error("Adicione pelo menos um item ao pedido");
      return;
    }

    if (!nomeCliente.trim()) {
      toast.error("Nome do cliente é obrigatório");
      return;
    }

    try {
      const pedidoId = await finalizarPedidoOriginal();
      
      // Tentar enviar notificação WhatsApp se telefone foi fornecido
      if (telefoneCliente && pedidoId) {
        try {
          await WhatsAppService.sendOrderConfirmation(
            restaurantId,
            telefoneCliente,
            pedidoId
          );
        } catch (error) {
          console.error('Erro ao enviar WhatsApp:', error);
          // Não bloquear o pedido se o WhatsApp falhar
        }
      }

      // Limpar campos após sucesso
      setNomeCliente("");
      setTelefoneCliente("");
      
      toast.success("Pedido finalizado com sucesso!");
    } catch (error) {
      console.error("Erro ao finalizar pedido:", error);
      toast.error("Erro ao finalizar pedido");
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
          <CardContent>
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
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="telefoneCliente">Telefone/WhatsApp</Label>
              <Input
                id="telefoneCliente"
                value={telefoneCliente}
                onChange={(e) => setTelefoneCliente(e.target.value)}
                placeholder="(11) 99999-9999"
              />
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
        />
      </div>
    </div>
  );
};
