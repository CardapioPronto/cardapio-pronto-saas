
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
import { useProdutos } from "@/hooks/useProdutos";
import { formatPhone, validatePhone } from "@/utils/phoneValidation";

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
    mesaSelecionada
  } = usePDVHook(restaurantId);

  const { produtos } = useProdutos(restaurantId);

  const [nomeCliente, setNomeCliente] = useState("");
  const [telefoneCliente, setTelefoneCliente] = useState("");
  const [telefoneError, setTelefoneError] = useState("");

  // Filter products based on search and category
  const produtosFiltrados = produtos.filter((produto) => {
    const matchesSearch = busca === "" || 
      produto.name.toLowerCase().includes(busca.toLowerCase()) ||
      produto.description.toLowerCase().includes(busca.toLowerCase());
    
    const matchesCategory = categoriaAtiva === "todas" || 
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
      // Call the original function without arguments since it expects 0 parameters
      const pedidoId = await finalizarPedidoOriginal();
      
      // Tentar enviar notificação WhatsApp se telefone foi fornecido
      if (telefoneCliente && pedidoId) {
        try {
          await WhatsAppService.sendOrderConfirmation(
            restaurantId,
            telefoneCliente,
            pedidoId
          );
          toast.success("Pedido finalizado e notificação WhatsApp enviada!");
        } catch (error) {
          console.error('Erro ao enviar WhatsApp:', error);
          toast.success("Pedido finalizado! (Erro ao enviar WhatsApp)");
        }
      } else {
        toast.success("Pedido finalizado com sucesso!");
      }

      // Limpar campos após sucesso
      setNomeCliente("");
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
        />
      </div>
    </div>
  );
};
