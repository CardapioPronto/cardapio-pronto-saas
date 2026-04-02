import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Wifi, WifiOff, QrCode, Trash2, RefreshCw, Loader2, Smartphone, AlertCircle, Clock, User, ShieldAlert } from "lucide-react";
import { useWhatsAppInstances } from "@/hooks/useWhatsAppInstances";
import { usePermissionsV2 } from "@/hooks/usePermissionsV2";
import { WhatsAppInstance } from "@/types/atendimento";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type DisplayStatus = 'created' | 'connecting' | 'connected' | 'disconnected' | 'error' | 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING' | 'QRCODE';

const normalizeStatus = (status: string): string => {
  const map: Record<string, string> = {
    CONNECTED: 'connected',
    DISCONNECTED: 'disconnected',
    CONNECTING: 'connecting',
    QRCODE: 'connecting',
    created: 'created',
    connecting: 'connecting',
    connected: 'connected',
    disconnected: 'disconnected',
    error: 'error',
  };
  return map[status] || 'disconnected';
};

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode; color: string }> = {
  created: { label: "Criada", variant: "outline", icon: <Clock className="h-3 w-3" />, color: "text-muted-foreground" },
  connecting: { label: "Conectando...", variant: "secondary", icon: <Loader2 className="h-3 w-3 animate-spin" />, color: "text-yellow-600" },
  connected: { label: "Conectado", variant: "default", icon: <Wifi className="h-3 w-3" />, color: "text-green-600" },
  disconnected: { label: "Desconectado", variant: "destructive", icon: <WifiOff className="h-3 w-3" />, color: "text-destructive" },
  error: { label: "Erro", variant: "destructive", icon: <AlertCircle className="h-3 w-3" />, color: "text-destructive" },
};

function InstanceCard({ instance, onConnect, onDisconnect, onDelete, canManage }: {
  instance: WhatsAppInstance;
  onConnect: (id: string) => void;
  onDisconnect: (id: string) => void;
  onDelete: (id: string) => void;
  canManage: boolean;
}) {
  const normalized = normalizeStatus(instance.status);
  const status = statusConfig[normalized] || statusConfig.disconnected;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{instance.instance_name}</CardTitle>
          <Badge variant={status.variant} className="gap-1">
            {status.icon}
            {status.label}
          </Badge>
        </div>
        <CardDescription className="space-y-1">
          <span className="flex items-center gap-1">
            <Smartphone className="h-3 w-3" />
            {instance.phone_number ? instance.phone_number : "Número não conectado"}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* QR Code display */}
        {(instance.status === 'QRCODE' || instance.status === 'connecting') && instance.qrcode_base64 && (
          <div className="flex justify-center p-2 bg-muted/30 rounded-lg">
            <img 
              src={instance.qrcode_base64.startsWith('data:') ? instance.qrcode_base64 : `data:image/png;base64,${instance.qrcode_base64}`}
              alt="QR Code para conexão" 
              className="w-48 h-48 rounded-lg border"
            />
          </div>
        )}

        {/* Metadata */}
        <div className="text-xs text-muted-foreground space-y-1">
          <div className="flex items-center gap-1">
            <User className="h-3 w-3" />
            <span>Criado por: {instance.created_by?.slice(0, 8)}...</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>Atualizado: {instance.updated_at ? format(new Date(instance.updated_at), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "—"}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 flex-wrap pt-1">
          {canManage ? (
            <>
              {(normalized === 'disconnected' || normalized === 'created') && (
                <Button size="sm" onClick={() => onConnect(instance.id)} className="gap-1">
                  <QrCode className="h-4 w-4" />
                  Conectar
                </Button>
              )}
              {normalized === 'connected' && (
                <Button size="sm" variant="outline" onClick={() => onDisconnect(instance.id)} className="gap-1">
                  <WifiOff className="h-4 w-4" />
                  Desconectar
                </Button>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="destructive" className="gap-1">
                    <Trash2 className="h-4 w-4" />
                    Remover
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remover instância?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Essa ação é irreversível. A instância "{instance.instance_name}" será removida permanentemente.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onDelete(instance.id)}>
                      Remover
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          ) : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <ShieldAlert className="h-3 w-3" />
                    Sem permissão para gerenciar
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Você precisa da permissão "Gerenciar Instâncias WhatsApp" para executar ações.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

const AtendimentoInstancias = () => {
  const { instances, loading, createInstance, deleteInstance, connectInstance, disconnectInstance, refetch } = useWhatsAppInstances();
  const { hasPermission, isOwner, isSuperAdmin } = usePermissionsV2();
  const [newName, setNewName] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const canManage = isOwner() || isSuperAdmin() || hasPermission('whatsapp_manage_instances');

  const handleCreate = async () => {
    if (!newName.trim() || !canManage) return;
    setCreating(true);
    const result = await createInstance(newName.trim());
    if (result) {
      setNewName("");
      setDialogOpen(false);
    }
    setCreating(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Instâncias WhatsApp</h2>
          <p className="text-sm text-muted-foreground">
            Gerencie as conexões WhatsApp do seu estabelecimento
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={refetch} className="gap-1">
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
          {canManage && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1">
                  <Plus className="h-4 w-4" />
                  Nova Instância
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Nova Instância</DialogTitle>
                  <DialogDescription>
                    Crie uma nova conexão WhatsApp para o seu estabelecimento.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="instance-name">Nome da instância</Label>
                    <Input
                      id="instance-name"
                      placeholder="Ex: Atendimento Principal"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreate} disabled={creating || !newName.trim()}>
                    {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Criar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : instances.length === 0 ? (
        <Card className="p-12 text-center">
          <Smartphone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Nenhuma instância criada</h3>
          <p className="text-muted-foreground mb-4">
            Crie sua primeira instância WhatsApp para começar a receber mensagens.
          </p>
          {canManage && (
            <Button onClick={() => setDialogOpen(true)} className="gap-1">
              <Plus className="h-4 w-4" />
              Criar Instância
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {instances.map((instance) => (
            <InstanceCard
              key={instance.id}
              instance={instance}
              onConnect={connectInstance}
              onDisconnect={disconnectInstance}
              onDelete={deleteInstance}
              canManage={canManage}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default AtendimentoInstancias;
