import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";

const AdminPagarme = () => {
  const [apiKey, setApiKey] = useState("");
  const [isLive, setIsLive] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Carregar configuração existente
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('pagarme_config')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao carregar config:', error);
        return;
      }

      if (data) {
        setApiKey(data.api_key);
        setIsLive(data.is_live || false);
        setIsConfigured(true);
      }
    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!apiKey.trim()) {
      toast.error("Chave de API é obrigatória");
      return;
    }

    setIsSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Usuário não autenticado");
        return;
      }

      // Deletar configurações antigas
      await supabase.from('pagarme_config').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      // Inserir nova configuração
      const { error } = await supabase
        .from('pagarme_config')
        .insert({
          api_key: apiKey,
          is_live: isLive,
          created_by: user.id
        });

      if (error) throw error;

      setIsConfigured(true);
      toast.success("Configuração salva com sucesso!");
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error("Erro ao salvar configuração");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearConfig = async () => {
    try {
      await supabase.from('pagarme_config').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      
      setApiKey("");
      setIsLive(false);
      setIsConfigured(false);
      toast.success("Configuração removida");
    } catch (error) {
      console.error('Erro:', error);
      toast.error("Erro ao remover configuração");
    }
  };

  if (isLoading) {
    return (
      <AdminLayout title="Configuração PagarMe">
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Configuração PagarMe">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Integração com PagarMe</CardTitle>
            <CardDescription>
              Configure as credenciais do PagarMe para processar pagamentos de assinaturas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="api-key">Chave de API (Secret Key)</Label>
                <Input
                  id="api-key"
                  placeholder="sk_test_... ou sk_live_..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  type="password"
                />
                <p className="text-sm text-muted-foreground">
                  Encontre suas chaves de API no{" "}
                  <a 
                    href="https://dash.pagar.me/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Dashboard do Pagar.me
                  </a>
                  {" "}em Configurações → Chaves de API
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="environment"
                  checked={isLive}
                  onCheckedChange={setIsLive}
                />
                <Label htmlFor="environment" className="flex items-center gap-1">
                  {isLive ? (
                    <>
                      <span className="text-red-500 font-medium">Produção</span>
                      <span className="text-sm text-muted-foreground">(cobrará clientes reais)</span>
                    </>
                  ) : (
                    <>
                      <span className="text-green-500 font-medium">Homologação</span>
                      <span className="text-sm text-muted-foreground">(ambiente de testes)</span>
                    </>
                  )}
                </Label>
              </div>
            </div>

            {isConfigured && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Configuração ativa</AlertTitle>
                <AlertDescription>
                  O PagarMe está configurado e pronto para processar pagamentos.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={handleClearConfig}
              disabled={!isConfigured || isSaving}
            >
              Limpar
            </Button>
            <Button 
              onClick={handleSaveConfig}
              disabled={isSaving}
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar configuração
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Informações Importantes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Planos Configurados</h3>
              <ul className="list-disc ml-5 space-y-1 text-sm text-muted-foreground">
                <li>Básico: R$ 97/mês ou R$ 970/ano</li>
                <li>Profissional: R$ 197/mês ou R$ 1.970/ano</li>
                <li>Empresarial: R$ 397/mês ou R$ 3.970/ano</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium mb-2">Período de Teste</h3>
              <p className="text-sm text-muted-foreground">
                Todos os novos clientes recebem 7 dias de teste gratuito do plano Profissional.
              </p>
            </div>
            <div>
              <h3 className="font-medium mb-2">Webhook</h3>
              <p className="text-sm text-muted-foreground">
                Configure no PagarMe: <code className="bg-muted px-1 py-0.5 rounded">{window.location.origin}/api/webhooks/pagarme</code>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminPagarme;
