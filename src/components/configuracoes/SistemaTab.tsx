
import React from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { ConfiguracoesSistema } from "@/services/configuracoes";

interface SistemaTabProps {
  configuracoesSistema: ConfiguracoesSistema;
  setConfiguracoesSistema: React.Dispatch<React.SetStateAction<ConfiguracoesSistema>>;
  loading: boolean;
  salvarConfiguracoesDoSistema: () => Promise<void>;
}

export const SistemaTab: React.FC<SistemaTabProps> = ({
  configuracoesSistema,
  setConfiguracoesSistema,
  loading,
  salvarConfiguracoesDoSistema
}) => {
  return (
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
          disabled={loading}
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar configurações
        </Button>
      </CardFooter>
    </Card>
  );
};
