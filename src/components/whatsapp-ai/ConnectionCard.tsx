import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, QrCode, Wifi, WifiOff, Trash2, RefreshCw } from "lucide-react";
import { WhatsAppAIConfig } from "@/types/whatsappAI";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ConnectionCardProps {
  config: WhatsAppAIConfig | null;
  connecting: boolean;
  onCreateInstance: (name: string) => Promise<boolean>;
  onConnect: () => Promise<any>;
  onDisconnect: () => Promise<void>;
  onDeleteInstance: () => Promise<void>;
  onCheckStatus: () => Promise<void>;
}

export function ConnectionCard({
  config,
  connecting,
  onCreateInstance,
  onConnect,
  onDisconnect,
  onDeleteInstance,
  onCheckStatus
}: ConnectionCardProps) {
  const [instanceName, setInstanceName] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!instanceName.trim()) return;
    
    setCreating(true);
    const success = await onCreateInstance(instanceName.trim().toLowerCase().replace(/\s+/g, '-'));
    if (success) {
      setInstanceName("");
    }
    setCreating(false);
  };

  const getStatusBadge = () => {
    switch (config?.status) {
      case 'CONNECTED':
        return <Badge className="bg-green-500 hover:bg-green-600"><Wifi className="w-3 h-3 mr-1" /> Online</Badge>;
      case 'QRCODE':
        return <Badge variant="secondary"><QrCode className="w-3 h-3 mr-1" /> Aguardando QR Code</Badge>;
      case 'CONNECTING':
        return <Badge variant="secondary"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Conectando...</Badge>;
      default:
        return <Badge variant="destructive"><WifiOff className="w-3 h-3 mr-1" /> Offline</Badge>;
    }
  };

  // Se não há configuração, mostra formulário de criação
  if (!config) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Conectar WhatsApp
          </CardTitle>
          <CardDescription>
            Crie uma instância para conectar o WhatsApp do seu estabelecimento
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="instanceName">Nome da Instância</Label>
            <Input
              id="instanceName"
              placeholder="minha-pizzaria"
              value={instanceName}
              onChange={(e) => setInstanceName(e.target.value)}
              disabled={creating}
            />
            <p className="text-xs text-muted-foreground">
              Use letras minúsculas, números e hífens. Exemplo: minha-pizzaria
            </p>
          </div>
          <Button 
            onClick={handleCreate} 
            disabled={!instanceName.trim() || creating}
            className="w-full"
          >
            {creating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Criando...
              </>
            ) : (
              'Criar Instância'
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Conexão WhatsApp
            </CardTitle>
            <CardDescription>
              Instância: <code className="bg-muted px-1 rounded">{config.instance_name}</code>
            </CardDescription>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* QR Code */}
        {config.status === 'QRCODE' && config.qrcode_base64 && (
          <div className="flex flex-col items-center p-4 bg-white rounded-lg border">
            <img 
              src={`data:image/png;base64,${config.qrcode_base64}`} 
              alt="QR Code" 
              className="w-64 h-64"
            />
            <p className="text-sm text-muted-foreground mt-2 text-center">
              Escaneie o QR Code com o WhatsApp do estabelecimento
            </p>
          </div>
        )}

        {/* Telefone conectado */}
        {config.status === 'CONNECTED' && config.phone_connected && (
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <p className="text-sm font-medium text-green-800 dark:text-green-200">
              📱 Conectado: {config.phone_connected}
            </p>
          </div>
        )}

        {/* Botões de ação */}
        <div className="flex flex-wrap gap-2">
          {config.status === 'DISCONNECTED' && (
            <Button onClick={onConnect} disabled={connecting}>
              {connecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Gerando QR...
                </>
              ) : (
                <>
                  <QrCode className="mr-2 h-4 w-4" />
                  Gerar QR Code
                </>
              )}
            </Button>
          )}

          {config.status === 'QRCODE' && (
            <Button variant="outline" onClick={onConnect} disabled={connecting}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Novo QR Code
            </Button>
          )}

          <Button variant="outline" onClick={onCheckStatus}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Verificar Status
          </Button>

          {config.status === 'CONNECTED' && (
            <Button variant="secondary" onClick={onDisconnect}>
              <WifiOff className="mr-2 h-4 w-4" />
              Desconectar
            </Button>
          )}

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir instância?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação irá desconectar o WhatsApp e remover toda a configuração. 
                  O histórico de conversas será mantido.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={onDeleteInstance}>
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}