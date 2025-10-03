import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageCircle, Phone, Settings, Send, ExternalLink, Brain, Zap } from "lucide-react";
import { WhatsAppService } from "@/services/whatsapp/whatsappService";
import { TwilioService } from "@/services/whatsapp/twilioService";
import { WhatsAppIntegration } from "@/services/whatsapp/types";
import { useWhatsAppIntegration } from "@/hooks/useWhatsAppIntegration";
import { toast } from "sonner";

export const TwilioConfigTab: React.FC = () => {
  const { integration: loadedIntegration, loading, restaurantId, loadIntegration } = useWhatsAppIntegration();
  
  const [config, setConfig] = useState<WhatsAppIntegration>({
    restaurant_id: "",
    phone_number: "",
    provider: "twilio",
    twilio_account_sid: "",
    twilio_auth_token: "",
    twilio_phone_number: "",
    n8n_webhook_url: "",
    n8n_enabled: false,
    ai_provider: "gemini",
    ai_enabled: false,
    ai_system_prompt: "",
    is_enabled: false,
    auto_send_orders: true,
    welcome_message: "Olá! Bem-vindo ao nosso restaurante. Como posso ajudá-lo?",
    order_confirmation_message: "Seu pedido foi recebido e está sendo preparado. Obrigado!"
  });
  
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  useEffect(() => {
    if (restaurantId) {
      setConfig(prev => ({ ...prev, restaurant_id: restaurantId }));
    }
  }, [restaurantId]);

  useEffect(() => {
    if (loadedIntegration) {
      setConfig({
        ...loadedIntegration,
        provider: loadedIntegration.provider || 'twilio'
      });
    }
  }, [loadedIntegration]);

  const handleSave = async () => {
    if (!restaurantId) {
      toast.error('ID do restaurante não encontrado');
      return;
    }

    setSaving(true);
    try {
      const success = await WhatsAppService.saveIntegration({ ...config, restaurant_id: restaurantId });
      if (success) {
        await loadIntegration();
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const sendTestMessage = async () => {
    if (!config.phone_number) {
      toast.error('Informe o número do WhatsApp');
      return;
    }

    if (!config.twilio_account_sid || !config.twilio_auth_token || !config.twilio_phone_number) {
      toast.error('Configure as credenciais do Twilio primeiro');
      return;
    }

    setSendingTest(true);
    try {
      const success = await WhatsAppService.sendMessage(
        restaurantId!,
        config.phone_number,
        "🚀 Teste de integração Twilio!\n\nSua configuração está funcionando perfeitamente! ✅"
      );
      
      if (success) {
        toast.success('Mensagem de teste enviada via Twilio!');
      }
    } catch (error) {
      console.error('Erro ao enviar teste:', error);
      toast.error('Erro ao enviar mensagem de teste');
    } finally {
      setSendingTest(false);
    }
  };

  if (loading || !restaurantId) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center text-muted-foreground">
            {loading ? 'Carregando...' : 'Erro ao carregar'}
          </div>
        </CardContent>
      </Card>
    );
  }

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/twilio-webhook`;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-green-600" />
          <CardTitle>Integração WhatsApp com Twilio</CardTitle>
        </div>
        <CardDescription>
          Configure a integração profissional com WhatsApp usando Twilio
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Credenciais Twilio */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <h3 className="text-lg font-medium">Credenciais Twilio</h3>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.open('https://console.twilio.com/', '_blank')}
              className="ml-auto"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Acessar Twilio Console
            </Button>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-lg space-y-2">
            <h4 className="font-medium">Como configurar:</h4>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Crie uma conta no <a href="https://www.twilio.com/try-twilio" target="_blank" className="text-blue-600 hover:underline">Twilio</a></li>
              <li>Compre um número WhatsApp Business</li>
              <li>Copie o Account SID e Auth Token do Console</li>
              <li>Configure o webhook do Twilio para: <code className="bg-white px-2 py-1 rounded text-xs">{webhookUrl}</code></li>
            </ol>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="twilio_account_sid">Account SID *</Label>
              <Input
                id="twilio_account_sid"
                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                value={config.twilio_account_sid || ""}
                onChange={(e) => setConfig({...config, twilio_account_sid: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="twilio_auth_token">Auth Token *</Label>
              <Input
                id="twilio_auth_token"
                type="password"
                placeholder="seu_auth_token"
                value={config.twilio_auth_token || ""}
                onChange={(e) => setConfig({...config, twilio_auth_token: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="twilio_phone_number">Número Twilio WhatsApp *</Label>
              <Input
                id="twilio_phone_number"
                placeholder="+1 555 123 4567"
                value={config.twilio_phone_number || ""}
                onChange={(e) => setConfig({...config, twilio_phone_number: e.target.value})}
              />
              <p className="text-xs text-muted-foreground">
                Número WhatsApp comprado no Twilio (formato internacional)
              </p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Integração n8n */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            <h3 className="text-lg font-medium">Automação com n8n</h3>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Ativar integração n8n</Label>
              <div className="text-sm text-muted-foreground">
                Envie mensagens para n8n para automações
              </div>
            </div>
            <Switch
              checked={config.n8n_enabled}
              onCheckedChange={(checked) => setConfig({...config, n8n_enabled: checked})}
            />
          </div>

          {config.n8n_enabled && (
            <div className="space-y-2">
              <Label htmlFor="n8n_webhook_url">URL do Webhook n8n</Label>
              <Input
                id="n8n_webhook_url"
                placeholder="https://seu-n8n.com/webhook/..."
                value={config.n8n_webhook_url || ""}
                onChange={(e) => setConfig({...config, n8n_webhook_url: e.target.value})}
              />
              <p className="text-xs text-muted-foreground">
                Crie um webhook no n8n e cole a URL aqui
              </p>
            </div>
          )}
        </div>

        <Separator />

        {/* Integração IA */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            <h3 className="text-lg font-medium">Respostas Automáticas com IA</h3>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Ativar respostas automáticas</Label>
              <div className="text-sm text-muted-foreground">
                IA responde automaticamente mensagens dos clientes
              </div>
            </div>
            <Switch
              checked={config.ai_enabled}
              onCheckedChange={(checked) => setConfig({...config, ai_enabled: checked})}
            />
          </div>

          {config.ai_enabled && (
            <>
              <div className="space-y-2">
                <Label htmlFor="ai_provider">Provedor de IA</Label>
                <Select
                  value={config.ai_provider || 'gemini'}
                  onValueChange={(value: 'gemini' | 'chatgpt') => setConfig({...config, ai_provider: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gemini">Google Gemini (Grátis via Lovable AI)</SelectItem>
                    <SelectItem value="chatgpt">ChatGPT (Requer API Key OpenAI)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ai_system_prompt">Prompt do Sistema</Label>
                <Textarea
                  id="ai_system_prompt"
                  placeholder="Defina como a IA deve se comportar..."
                  value={config.ai_system_prompt || ""}
                  onChange={(e) => setConfig({...config, ai_system_prompt: e.target.value})}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  Instruções para a IA sobre como responder aos clientes
                </p>
              </div>
            </>
          )}
        </div>

        <Separator />

        {/* Configurações Básicas */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Configurações Gerais</h3>
          
          <div className="space-y-2">
            <Label htmlFor="phone_number">Número para Teste</Label>
            <Input
              id="phone_number"
              placeholder="+55 11 99999-9999"
              value={config.phone_number}
              onChange={(e) => setConfig({...config, phone_number: e.target.value})}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>Habilitar WhatsApp</Label>
            <Switch
              checked={config.is_enabled}
              onCheckedChange={(checked) => setConfig({...config, is_enabled: checked})}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>Envio Automático de Pedidos</Label>
            <Switch
              checked={config.auto_send_orders}
              onCheckedChange={(checked) => setConfig({...config, auto_send_orders: checked})}
            />
          </div>
        </div>

        <Separator />

        {/* Ações */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={handleSave} disabled={saving} className="flex-1">
            {saving ? "Salvando..." : "Salvar Configurações"}
          </Button>
          
          <Button 
            variant="outline" 
            onClick={sendTestMessage}
            disabled={!config.phone_number || sendingTest}
            className="flex items-center gap-2"
          >
            <Send className="h-4 w-4" />
            {sendingTest ? "Enviando..." : "Enviar Teste"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
