
import { useState, ChangeEvent } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/sonner";
import { Loader2 } from "lucide-react";
import { useConfiguracoes } from "@/hooks/useConfiguracoes";
import { Link } from "react-router-dom";

const Configuracoes = () => {
  const {
    dadosEstabelecimento,
    setDadosEstabelecimento,
    dadosUsuario,
    setDadosUsuario,
    configuracoesSistema,
    setConfiguracoesSistema,
    loading,
    salvarDadosEstabelecimento,
    salvarDadosUsuario,
    salvarConfiguracoesDoSistema,
    fazerUploadLogo
  } = useConfiguracoes();

  const handleLogoChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      await fazerUploadLogo(file);
    }
  };

  const atualizarDadosEstabelecimento = (e: React.FormEvent) => {
    e.preventDefault();
    salvarDadosEstabelecimento();
  };
  
  const atualizarDadosUsuario = (e: React.FormEvent) => {
    e.preventDefault();
    salvarDadosUsuario();
  };

  return (
    <DashboardLayout title="Configurações">
      <Tabs defaultValue="estabelecimento" className="space-y-6">
        <TabsList>
          <TabsTrigger value="estabelecimento">Estabelecimento</TabsTrigger>
          <TabsTrigger value="usuario">Usuário</TabsTrigger>
          <TabsTrigger value="sistema">Sistema</TabsTrigger>
          <TabsTrigger value="integracoes">Integrações</TabsTrigger>
        </TabsList>
        
        {/* Tab: Estabelecimento */}
        <TabsContent value="estabelecimento">
          <Card>
            <CardHeader>
              <CardTitle>Dados do Estabelecimento</CardTitle>
              <CardDescription>
                Informações que aparecerão no cardápio digital e recibos
              </CardDescription>
            </CardHeader>
            <form onSubmit={atualizarDadosEstabelecimento}>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="nome-estabelecimento">Nome do Estabelecimento</Label>
                  <Input 
                    id="nome-estabelecimento" 
                    value={dadosEstabelecimento.nome}
                    onChange={(e) => setDadosEstabelecimento({...dadosEstabelecimento, nome: e.target.value})}
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="endereco">Endereço</Label>
                  <Input 
                    id="endereco" 
                    value={dadosEstabelecimento.endereco || ''}
                    onChange={(e) => setDadosEstabelecimento({...dadosEstabelecimento, endereco: e.target.value})}
                  />
                </div>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="telefone">Telefone</Label>
                    <Input 
                      id="telefone" 
                      value={dadosEstabelecimento.telefone || ''}
                      onChange={(e) => setDadosEstabelecimento({...dadosEstabelecimento, telefone: e.target.value})}
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input 
                      id="email" 
                      type="email"
                      value={dadosEstabelecimento.email || ''}
                      onChange={(e) => setDadosEstabelecimento({...dadosEstabelecimento, email: e.target.value})}
                    />
                  </div>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="horario">Horário de Funcionamento</Label>
                  <Input 
                    id="horario" 
                    value={dadosEstabelecimento.horarioFuncionamento || ''}
                    onChange={(e) => setDadosEstabelecimento({...dadosEstabelecimento, horarioFuncionamento: e.target.value})}
                    placeholder="Segunda a Domingo: 11h às 23h"
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="logo">Logo do Estabelecimento</Label>
                  <Input id="logo" type="file" accept="image/*" onChange={handleLogoChange} />
                  <p className="text-sm text-muted-foreground">
                    Tamanho recomendado: 200x200px. Formatos: JPG, PNG
                  </p>
                  
                  {dadosEstabelecimento.logo_url && (
                    <div className="mt-2">
                      <p className="text-sm font-medium mb-1">Logo atual:</p>
                      <img 
                        src={dadosEstabelecimento.logo_url} 
                        alt="Logo do estabelecimento" 
                        className="w-20 h-20 object-contain border rounded" 
                      />
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={loading.estabelecimento}>
                  {loading.estabelecimento && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar alterações
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
        
        {/* Tab: Usuário */}
        <TabsContent value="usuario">
          <Card>
            <CardHeader>
              <CardTitle>Dados do Usuário</CardTitle>
              <CardDescription>
                Gerencie suas informações pessoais e senha de acesso
              </CardDescription>
            </CardHeader>
            <form onSubmit={atualizarDadosUsuario}>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="nome-usuario">Nome</Label>
                  <Input 
                    id="nome-usuario" 
                    value={dadosUsuario.nome}
                    onChange={(e) => setDadosUsuario({...dadosUsuario, nome: e.target.value})}
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="email-usuario">Email</Label>
                  <Input 
                    id="email-usuario" 
                    type="email"
                    value={dadosUsuario.email}
                    onChange={(e) => setDadosUsuario({...dadosUsuario, email: e.target.value})}
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="senha-atual">Senha atual</Label>
                  <Input 
                    id="senha-atual" 
                    type="password"
                    value={dadosUsuario.senha}
                    readOnly
                  />
                </div>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="nova-senha">Nova senha</Label>
                    <Input 
                      id="nova-senha" 
                      type="password"
                      value={dadosUsuario.novaSenha}
                      onChange={(e) => setDadosUsuario({...dadosUsuario, novaSenha: e.target.value})}
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="confirmar-senha">Confirmar senha</Label>
                    <Input 
                      id="confirmar-senha" 
                      type="password"
                      value={dadosUsuario.confirmarSenha}
                      onChange={(e) => setDadosUsuario({...dadosUsuario, confirmarSenha: e.target.value})}
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={loading.usuario}>
                  {loading.usuario && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Atualizar dados
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
        
        {/* Tab: Sistema */}
        <TabsContent value="sistema">
          <Card>
            <CardHeader>
              <CardTitle>Configurações do Sistema</CardTitle>
              <CardDescription>
                Personalize a experiência e funcionalidades do sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="notificacao-pedido">Notificação de novo pedido</Label>
                  <p className="text-sm text-muted-foreground">
                    Receba notificações quando houver um novo pedido
                  </p>
                </div>
                <Switch 
                  id="notificacao-pedido" 
                  checked={configuracoesSistema.notification_new_order}
                  onCheckedChange={(value) => setConfiguracoesSistema({...configuracoesSistema, notification_new_order: value})}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="notificacao-email">Notificações por email</Label>
                  <p className="text-sm text-muted-foreground">
                    Receba um email com resumo diário de vendas
                  </p>
                </div>
                <Switch 
                  id="notificacao-email" 
                  checked={configuracoesSistema.notification_email}
                  onCheckedChange={(value) => setConfiguracoesSistema({...configuracoesSistema, notification_email: value})}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="modo-escuro">Modo escuro</Label>
                  <p className="text-sm text-muted-foreground">
                    Use a interface com tema escuro
                  </p>
                </div>
                <Switch 
                  id="modo-escuro" 
                  checked={configuracoesSistema.dark_mode}
                  onCheckedChange={(value) => setConfiguracoesSistema({...configuracoesSistema, dark_mode: value})}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="impressao-automatica">Impressão automática</Label>
                  <p className="text-sm text-muted-foreground">
                    Imprimir pedidos automaticamente
                  </p>
                </div>
                <Switch 
                  id="impressao-automatica" 
                  checked={configuracoesSistema.auto_print}
                  onCheckedChange={(value) => setConfiguracoesSistema({...configuracoesSistema, auto_print: value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="idioma">Idioma</Label>
                <select 
                  id="idioma"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={configuracoesSistema.language}
                  onChange={(e) => setConfiguracoesSistema({...configuracoesSistema, language: e.target.value})}
                >
                  <option value="pt-BR">Português (Brasil)</option>
                  <option value="en-US">English (US)</option>
                  <option value="es">Español</option>
                </select>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={salvarConfiguracoesDoSistema} 
                disabled={loading.configuracoes}
              >
                {loading.configuracoes && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar configurações
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* Tab: Integrações */}
        <TabsContent value="integracoes">
          <Card>
            <CardHeader>
              <CardTitle>Integrações</CardTitle>
              <CardDescription>
                Conecte o sistema com outras plataformas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-[#6B3DE3] rounded flex items-center justify-center text-white font-bold">
                      P
                    </div>
                    <div>
                      <h3 className="font-medium">Pagar.me</h3>
                      <p className="text-sm text-muted-foreground">
                        Integração para pagamentos online
                      </p>
                    </div>
                  </div>
                  <Button onClick={() => window.location.href = "/pagarme-config"}>Configurar</Button>
                </div>
              </div>
              
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-[#24B47E] rounded flex items-center justify-center text-white font-bold">
                      I
                    </div>
                    <div>
                      <h3 className="font-medium">iFood</h3>
                      <p className="text-sm text-muted-foreground">
                        Receba pedidos do iFood diretamente no sistema
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" onClick={() => window.location.href = "/ifood-integracao"}>Configurar</Button>
                </div>
              </div>
              
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-[#4CB050] rounded flex items-center justify-center text-white font-bold">
                      W
                    </div>
                    <div>
                      <h3 className="font-medium">WhatsApp</h3>
                      <p className="text-sm text-muted-foreground">
                        Envio de notificações e pedidos via WhatsApp
                      </p>
                    </div>
                  </div>
                  <Button variant="outline">Em breve</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default Configuracoes;
