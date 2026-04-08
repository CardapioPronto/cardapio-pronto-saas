import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Wifi, WifiOff, QrCode, Trash2, RefreshCw, Loader2, Smartphone, AlertCircle, Clock, User, ShieldAlert, Bot } from "lucide-react";
import { useWhatsAppInstances } from "@/hooks/useWhatsAppInstances";
import { usePermissionsV2 } from "@/hooks/usePermissionsV2";
import { WhatsAppInstance, InstanceStatus } from "@/types/atendimento";
import { InstancesService } from "@/services/atendimento/instancesService";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

const statusConfig: Record<InstanceStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode; color: string }> = {
  CREATED: { label: "Criada", variant: "outline", icon: <Clock className="h-3 w-3" />, color: "text-muted-foreground" },
  CONNECTING: { label: "Conectando...", variant: "secondary", icon: <Loader2 className="h-3 w-3 animate-spin" />, color: "text-yellow-600" },
  CONNECTED: { label: "Conectado", variant: "default", icon: <Wifi className="h-3 w-3" />, color: "text-green-600" },
  DISCONNECTED: { label: "Desconectado", variant: "outline", icon: <WifiOff className="h-3 w-3" />, color: "text-muted-foreground" },
  ERROR: { label: "Erro", variant: "destructive", icon: <AlertCircle className="h-3 w-3" />, color: "text-destructive" },
};

function InstanceCard({ instance, canManage, onConnect, onDisconnect, onDelete, onRefresh, onToggleAutomation }: {
  instance: WhatsAppInstance;
  canManage: boolean;
  onConnect: (id: string) => void;
  onDisconnect: (id: string) => void;
  onDelete: (id: string) => void;
  onRefresh: (id: string) => void;
  onToggleAutomation: (id: string, enabled: boolean) => void;
}) {
  const cfg = statusConfig[instance.status] || statusConfig.DISCONNECTED;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg truncate">{instance.instance_name}</CardTitle>
          <Badge variant={cfg.variant} className="gap-1 shrink-0">
            {cfg.icon}
            {cfg.label}
          </Badge>
        </div>
        <CardDescription className="flex items-center gap-1">
          <Smartphone className="h-3 w-3" />
          {instance.phone_number || "Número não conectado"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* QR Code */}
        {instance.status === 'CONNECTING' && instance.qrcode_base64 && (
          <div className="flex justify-center p-3 bg-muted/30 rounded-lg">
            <img
              src={instance.qrcode_base64.startsWith('data:') ? instance.qrcode_base64 : `data:image/png;base64,${instance.qrcode_base64}`}
              alt="QR Code para conexão"
              className="w-48 h-48 rounded-lg border"
            />
          </div>
        )}

        {/* Automation toggle */}
        <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Automação IA</span>
          </div>
          <Switch
            checked={instance.automation_enabled}
            onCheckedChange={(checked) => onToggleAutomation(instance.id, checked)}
            disabled={!canManage}
          />
        </div>

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
          {instance.last_connection_update_at && (
            <div className="flex items-center gap-1">
              <Wifi className="h-3 w-3" />
              <span>Conexão: {format(new Date(instance.last_connection_update_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 flex-wrap pt-1">
          {canManage ? (
            <>
              {(instance.status === 'DISCONNECTED' || instance.status === 'CREATED' || instance.status === 'ERROR') && (
                <Button size="sm" onClick={() => onConnect(instance.id)} className="gap-1">
                  <QrCode className="h-4 w-4" />
                  Conectar
                </Button>
              )}
              {instance.status === 'CONNECTED' && (
                <Button size="sm" variant="outline" onClick={() => onDisconnect(instance.id)} className="gap-1">
                  <WifiOff className="h-4 w-4" />
                  Desconectar
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => onRefresh(instance.id)} className="gap-1">
                <RefreshCw className="h-4 w-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="destructive" className="gap-1 ml-auto">
                    <Trash2 className="h-4 w-4" />
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
                    <AlertDialogAction onClick={() => onDelete(instance.id)}>Remover</AlertDialogAction>
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
  const { instances, loading, restaurantId, createInstance, deleteInstance, connectInstance, disconnectInstance, refetch } = useWhatsAppInstances();
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

  const handleRefresh = async (id: string) => {
    if (!restaurantId) return;
    try {
      await InstancesService.refreshStatus(id, restaurantId);
      await refetch();
      toast.success("Status atualizado");
    } catch {
      toast.error("Erro ao atualizar status");
    }
  };

  const handleToggleAutomation = async (id: string, enabled: boolean) => {
    try {
      await InstancesService.toggleAutomation(id, enabled);
      await refetch();
      toast.success(enabled ? "Automação ativada" : "Automação desativada");
    } catch {
      toast.error("Erro ao alterar automação");
    }
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
                    O nome da instância deve ser único e será usado como identificador no sistema.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="instance-name">Nome da instância</Label>
                    <Input
                      id="instance-name"
                      placeholder="Ex: atendimento-principal"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                    />
                    <p className="text-xs text-muted-foreground">
                      Este nome será usado para identificação no n8n e Evolution API.
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
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
              canManage={canManage}
              onConnect={connectInstance}
              onDisconnect={disconnectInstance}
              onDelete={deleteInstance}
              onRefresh={handleRefresh}
              onToggleAutomation={handleToggleAutomation}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default AtendimentoInstancias;
