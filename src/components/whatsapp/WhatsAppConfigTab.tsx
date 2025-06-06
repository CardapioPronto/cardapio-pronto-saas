
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { MessageCircle, Phone, Settings, Send, AlertCircle, CheckCircle } from "lucide-react";
import { WhatsAppService } from "@/services/whatsapp/whatsappService";
import { UltraMsgService } from "@/services/whatsapp/ultraMsgService";
import { WhatsAppIntegration } from "@/services/whatsapp/types";
import { useWhatsAppIntegration } from "@/hooks/useWhatsAppIntegration";
import { toast } from "sonner";

export const WhatsAppConfigTab: React.FC = () => {
  const { integration: loadedIntegration, loading, restaurantId, loadIntegration } = useWhatsAppIntegration();
  
  const [config, setConfig] = useState<WhatsAppIntegration>({
    restaurant_id: "",
    phone_number: "",
    api_token: "",
    webhook_url: "",
    is_enabled: false,
    auto_send_orders: true,
    welcome_message: "Olá! Bem-vindo ao nosso restaurante. Como posso ajudá-lo?",
    order_confirmation_message: "Seu pedido foi recebido e está sendo preparado. Obrigado!"
  });
  
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [ultraMsgConfigured, setUltraMsgConfigured] = useState(false);

  // Verificar se as variáveis do UltraMsg estão configuradas
  useEffect(() => {
    const instanceId = import.meta.env.VITE_ULTRAMSG_INSTANCE_ID;
    const token = import.meta.env.VITE_ULTRAMSG_TOKEN;
    setUltraMsgConfigured(!!(instanceId && token));
  }, []);

  useEffect(() => {
    if (restaurantId) {
      setConfig(prevConfig => ({ ...prevConfig, restaurant_id: restaurantId }));
    }
  }, [restaurantId]);

  useEffect(() => {
    if (loadedIntegration) {
      setConfig(loadedIntegration);
    } else if (restaurantId) {
      setConfig(prevConfig => ({ ...prevConfig, restaurant_id: restaurantId }));
    }
  }, [loadedIntegration, restaurantId]);

  const handleSave = async () => {
    if (!restaurantId) {
      toast.error('ID do restaurante não encontrado');
      return;
    }

    setSaving(true);
    try {
      const configToSave = { ...config, restaurant_id: restaurantId };
      const success = await WhatsAppService.saveIntegration(configToSave);
      if (success) {
        await loadIntegration();
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar configurações do WhatsApp');
    } finally {
      setSaving(false);
    }
  };

  const sendTestMessage = async () => {
    if (!config.phone_number) {
      toast.error('Informe o número do WhatsApp primeiro');
      return;
    }

    if (!ultraMsgConfigured) {
      toast.error('Configure as variáveis ULTRAMSG_INSTANCE_ID e ULTRAMSG_TOKEN primeiro');
      return;
    }

    if (!UltraMsgService.validatePhoneNumber(config.phone_number)) {
      toast.error('Formato do número de telefone inválido');
      return;
    }

    if (!restaurantId) {
      toast.error('ID do restaurante não encontrado');
      return;
    }

    setSendingTest(true);
    try {
      const success = await WhatsAppService.sendMessage(
        restaurantId,
        config.phone_number,
        "🚀 Esta é uma mensagem de teste da integração WhatsApp via UltraMsg!\n\nSua integração está funcionando perfeitamente! ✅"
      );
      
      if (success) {
        toast.success('Mensagem de teste enviada com sucesso via UltraMsg!');
      }
    } catch (error) {
      console.error('Erro ao enviar teste:', error);
      toast.error('Erro ao enviar mensagem de teste');
    } finally {
      setSendingTest(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="text-muted-foreground">Carregando configurações...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!restaurantId) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="text-muted-foreground">Erro: Restaurante não encontrado</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-green-600" />
          <CardTitle>Integração WhatsApp</CardTitle>
        </div>
        <CardDescription>
          Configure a integração com WhatsApp usando UltraMsg para enviar mensagens automaticamente
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status da Configuração UltraMsg */}
        <div className={`p-4 rounded-lg border ${ultraMsgConfigured ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-center gap-2 mb-2">
            {ultraMsgConfigured ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600" />
            )}
            <h3 className="font-medium">Status da Configuração UltraMsg</h3>
          </div>
          <p className={`text-sm ${ultraMsgConfigured ? 'text-green-700' : 'text-red-700'}`}>
            {ultraMsgConfigured 
              ? 'Variáveis ULTRAMSG_INSTANCE_ID e ULTRAMSG_TOKEN configuradas corretamente' 
              : 'Configure as variáveis ULTRAMSG_INSTANCE_ID e ULTRAMSG_TOKEN nas configurações do projeto'
            }
          </p>
        </div>

        {/* Configurações Básicas */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <h3 className="text-lg font-medium">Configurações Básicas</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone_number">Número do WhatsApp</Label>
              <div className="flex gap-2">
                <Phone className="h-4 w-4 mt-3 text-muted-foreground" />
                <Input
                  id="phone_number"
                  placeholder="+55 11 99999-9999"
                  value={config.phone_number}
                  onChange={(e) => setConfig({...config, phone_number: e.target.value})}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="api_token">Token da API (Opcional)</Label>
              <Input
                id="api_token"
                type="password"
                placeholder="Token para integração avançada"
                value={config.api_token ?? ""}
                onChange={(e) => setConfig({...config, api_token: e.target.value})}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Habilitar WhatsApp</Label>
              <div className="text-sm text-muted-foreground">
                Ativa a integração com WhatsApp
              </div>
            </div>
            <Switch
              checked={config.is_enabled}
              onCheckedChange={(checked) => setConfig({...config, is_enabled: checked})}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Envio Automático de Pedidos</Label>
              <div className="text-sm text-muted-foreground">
                Envia confirmação automática quando pedido é finalizado
              </div>
            </div>
            <Switch
              checked={config.auto_send_orders}
              onCheckedChange={(checked) => setConfig({...config, auto_send_orders: checked})}
            />
          </div>
        </div>

        <Separator />

        {/* Mensagens Personalizadas */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            <h3 className="text-lg font-medium">Mensagens Personalizadas</h3>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="welcome_message">Mensagem de Boas-vindas</Label>
              <Textarea
                id="welcome_message"
                placeholder="Mensagem enviada quando cliente faz contato"
                value={config.welcome_message}
                onChange={(e) => setConfig({...config, welcome_message: e.target.value})}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="order_confirmation_message">Mensagem de Confirmação de Pedido</Label>
              <Textarea
                id="order_confirmation_message"
                placeholder="Mensagem enviada quando pedido é confirmado"
                value={config.order_confirmation_message}
                onChange={(e) => setConfig({...config, order_confirmation_message: e.target.value})}
                rows={3}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Ações */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="flex-1"
          >
            {saving ? "Salvando..." : "Salvar Configurações"}
          </Button>
          
          <Button 
            variant="outline" 
            onClick={sendTestMessage}
            disabled={!config.phone_number || !config.is_enabled || !ultraMsgConfigured || sendingTest}
            className="flex items-center gap-2"
          >
            <Send className="h-4 w-4" />
            {sendingTest ? "Enviando..." : "Enviar Teste"}
          </Button>
        </div>

        {/* Informações sobre a Integração */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-medium mb-2">Como Funciona a Nova Integração</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Agora usa a API UltraMsg para envio direto de mensagens</li>
            <li>• Configure o número do WhatsApp do seu restaurante</li>
            <li>• Habilite o envio automático para confirmar pedidos</li>
            <li>• Personalize as mensagens conforme sua necessidade</li>
            <li>• Todas as mensagens são registradas no histórico</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
