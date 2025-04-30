
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/sonner';
import { Loader2, CheckCircle, XCircle, AlertCircle, Settings, RefreshCw } from 'lucide-react';

import {
  loadIfoodConfig,
  configureIfoodCredentials,
  setIfoodIntegrationEnabled,
  configureIfoodPolling,
  testIfoodConnection,
  startIfoodSync,
  stopIfoodSync
} from '@/services/ifoodService';

// Schema de validação para o formulário de credenciais
const credentialsSchema = z.object({
  clientId: z.string().min(1, 'Client ID é obrigatório'),
  clientSecret: z.string().min(1, 'Client Secret é obrigatório'),
  merchantId: z.string().min(1, 'Merchant ID é obrigatório'),
  restaurantId: z.string().optional()
});

// Schema de validação para as configurações de sincronização
const syncSchema = z.object({
  isEnabled: z.boolean(),
  pollingEnabled: z.boolean(),
  pollingInterval: z.number().min(30, 'Intervalo mínimo de 30 segundos').max(3600, 'Intervalo máximo de 3600 segundos (1 hora)')
});

const IfoodIntegracao = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'success' | 'error'>('unknown');
  const config = loadIfoodConfig();
  
  // Formulário para credenciais
  const credentialsForm = useForm<z.infer<typeof credentialsSchema>>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: {
      clientId: config.credentials?.clientId || '',
      clientSecret: config.credentials?.clientSecret || '',
      merchantId: config.credentials?.merchantId || '',
      restaurantId: config.credentials?.restaurantId || ''
    }
  });

  // Formulário para configurações de sincronização
  const syncForm = useForm<z.infer<typeof syncSchema>>({
    resolver: zodResolver(syncSchema),
    defaultValues: {
      isEnabled: config.isEnabled,
      pollingEnabled: config.pollingEnabled,
      pollingInterval: config.pollingInterval
    }
  });

  // Salvar credenciais
  const onCredentialsSubmit = async (data: z.infer<typeof credentialsSchema>) => {
    setIsLoading(true);
    try {
      configureIfoodCredentials(data);
      toast.success('Credenciais salvas com sucesso');
      
      // Testar a conexão automaticamente após salvar
      await testConnection();
    } finally {
      setIsLoading(false);
    }
  };

  // Salvar configurações de sincronização
  const onSyncSubmit = (data: z.infer<typeof syncSchema>) => {
    setIsLoading(true);
    try {
      setIfoodIntegrationEnabled(data.isEnabled);
      configureIfoodPolling(data.pollingEnabled, data.pollingInterval);

      if (data.isEnabled && data.pollingEnabled) {
        stopIfoodSync(); // Para reiniciar com as novas configurações
        startIfoodSync();
      } else {
        stopIfoodSync();
      }
      
      toast.success('Configurações de sincronização salvas com sucesso');
    } finally {
      setIsLoading(false);
    }
  };

  // Testar conexão com a API do iFood
  const testConnection = async () => {
    setTestingConnection(true);
    setConnectionStatus('unknown');
    
    try {
      const result = await testIfoodConnection();
      setConnectionStatus(result ? 'success' : 'error');
      
      if (result) {
        toast.success('Conexão com iFood estabelecida com sucesso');
      } else {
        toast.error('Falha na conexão com iFood');
      }
    } catch (error) {
      setConnectionStatus('error');
      toast.error('Erro ao testar conexão com iFood');
      console.error('Erro ao testar conexão:', error);
    } finally {
      setTestingConnection(false);
    }
  };

  // Forçar sincronização manual
  const forceSyncNow = async () => {
    setIsLoading(true);
    try {
      await stopIfoodSync();
      await startIfoodSync();
      toast.success('Sincronização manual iniciada');
    } catch (error) {
      toast.error('Erro ao iniciar sincronização manual');
    } finally {
      setIsLoading(false);
    }
  };

  // Status da conexão
  const ConnectionStatus = () => {
    if (connectionStatus === 'success') {
      return <Badge className="bg-green text-white"><CheckCircle className="w-4 h-4 mr-1" /> Conectado</Badge>;
    } else if (connectionStatus === 'error') {
      return <Badge variant="destructive"><XCircle className="w-4 h-4 mr-1" /> Falha na conexão</Badge>;
    } else {
      return <Badge variant="outline"><AlertCircle className="w-4 h-4 mr-1" /> Não verificado</Badge>;
    }
  };

  return (
    <DashboardLayout title="Integração com iFood">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Integração com iFood</h1>
          <p className="text-muted-foreground">
            Configure a integração com iFood para receber e gerenciar pedidos diretamente no seu painel.
          </p>
        </div>

        <Tabs defaultValue="credentials" className="w-full">
          <TabsList>
            <TabsTrigger value="credentials" className="flex items-center">
              <Settings className="w-4 h-4 mr-2" />
              <span>Credenciais</span>
            </TabsTrigger>
            <TabsTrigger value="sync" className="flex items-center">
              <RefreshCw className="w-4 h-4 mr-2" />
              <span>Sincronização</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="credentials">
            <Card>
              <CardHeader>
                <CardTitle>Credenciais do iFood</CardTitle>
                <CardDescription>
                  Configure suas credenciais de acesso à API do iFood.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...credentialsForm}>
                  <form onSubmit={credentialsForm.handleSubmit(onCredentialsSubmit)} className="space-y-4">
                    <FormField
                      control={credentialsForm.control}
                      name="clientId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Client ID</FormLabel>
                          <FormControl>
                            <Input placeholder="Insira o Client ID do iFood" {...field} />
                          </FormControl>
                          <FormDescription>
                            Identificador único da sua aplicação no iFood.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={credentialsForm.control}
                      name="clientSecret"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Client Secret</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Insira o Client Secret do iFood" {...field} />
                          </FormControl>
                          <FormDescription>
                            Chave secreta para autenticação com a API do iFood.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={credentialsForm.control}
                      name="merchantId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Merchant ID</FormLabel>
                          <FormControl>
                            <Input placeholder="Insira o ID do comerciante" {...field} />
                          </FormControl>
                          <FormDescription>
                            Identificador único do seu estabelecimento no iFood.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={credentialsForm.control}
                      name="restaurantId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Restaurant ID (Opcional)</FormLabel>
                          <FormControl>
                            <Input placeholder="Insira o ID do restaurante (opcional)" {...field} />
                          </FormControl>
                          <FormDescription>
                            ID específico do restaurante, se aplicável.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="pt-4 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <ConnectionStatus />
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          type="button" 
                          variant="outline"
                          onClick={testConnection}
                          disabled={testingConnection}
                        >
                          {testingConnection ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Testando
                            </>
                          ) : (
                            'Testar Conexão'
                          )}
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                          {isLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Salvando
                            </>
                          ) : (
                            'Salvar Credenciais'
                          )}
                        </Button>
                      </div>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="sync">
            <Card>
              <CardHeader>
                <CardTitle>Configuração de Sincronização</CardTitle>
                <CardDescription>
                  Gerencie como e quando os pedidos do iFood são sincronizados com o sistema.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...syncForm}>
                  <form onSubmit={syncForm.handleSubmit(onSyncSubmit)} className="space-y-6">
                    <FormField
                      control={syncForm.control}
                      name="isEnabled"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-md border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Ativar Integração</FormLabel>
                            <FormDescription>
                              Ativa ou desativa completamente a integração com o iFood.
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <Separator />
                    
                    <div className="space-y-4">
                      <FormField
                        control={syncForm.control}
                        name="pollingEnabled"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-md border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Verificação Periódica</FormLabel>
                              <FormDescription>
                                Sistema verificará periodicamente novos pedidos no iFood.
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                disabled={!syncForm.getValues('isEnabled')}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={syncForm.control}
                        name="pollingInterval"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Intervalo de Verificação (segundos)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                                disabled={!syncForm.getValues('isEnabled') || !syncForm.getValues('pollingEnabled')}
                                min={30}
                                max={3600}
                              />
                            </FormControl>
                            <FormDescription>
                              Frequência de verificação de novos pedidos (recomendado: 60 segundos).
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="pt-4 flex justify-between">
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={forceSyncNow}
                        disabled={isLoading || !syncForm.getValues('isEnabled')}
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Sincronizar Agora
                      </Button>
                      
                      <Button type="submit" disabled={isLoading}>
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Salvando
                          </>
                        ) : (
                          'Salvar Configurações'
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
              <CardFooter className="bg-muted/50 flex flex-col items-start">
                <h3 className="font-medium mb-2">Importante</h3>
                <p className="text-sm text-muted-foreground">
                  A sincronização via webhook é a forma mais eficiente de receber pedidos em tempo real.
                  Entre em contato com o suporte do iFood para configurar webhooks para seu estabelecimento.
                </p>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default IfoodIntegracao;
