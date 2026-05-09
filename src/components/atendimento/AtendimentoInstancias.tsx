import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Wifi, WifiOff, QrCode, Trash2, RefreshCw, Loader2, Smartphone, AlertCircle, Clock, User, ShieldAlert, Bot, Webhook, CheckCircle2 } from "lucide-react";
import { useWhatsAppInstances } from "@/hooks/useWhatsAppInstances";
import { usePermissionsV2 } from "@/hooks/usePermissionsV2";
import { WhatsAppInstance, InstanceStatus } from "@/types/atendimento";
import { InstancesService } from "@/services/atendimento/instancesService";
import { QRCodeConnectModal } from "./QRCodeConnectModal";
import { supabase } from "@/integrations/supabase/client";
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

function formatWhatsAppPhone(value: string | null) {
  if (!value) return "Número não conectado";

  const digits = value.replace(/\D/g, "");
  if (digits.length === 13 && digits.startsWith("55")) {
    return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
  }
  if (digits.length === 12 && digits.startsWith("55")) {
    return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 8)}-${digits.slice(8)}`;
  }

  return digits ? `+${digits}` : value;
}

function InstanceCard({ instance, canManage, creatorName, configuringWebhook, onConnect, onDisconnect, onDelete, onRefresh, onToggleAutomation, onConfigureWebhook }: {
  instance: WhatsAppInstance;
  canManage: boolean;
  creatorName: string;
  configuringWebhook: boolean;
  onConnect: (id: string) => void;
  onDisconnect: (id: string) => void;
  onDelete: (id: string) => void;
  onRefresh: (id: string) => void;
  onToggleAutomation: (id: string, enabled: boolean) => void;
  onConfigureWebhook: (id: string) => void;
}) {
  const cfg = statusConfig[instance.status] || statusConfig.DISCONNECTED;
  const webhookConfigured = Boolean(instance.webhook_url);

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
          {formatWhatsAppPhone(instance.phone_number)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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

        <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
          <div className="flex items-center gap-2 min-w-0">
            <Webhook className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <span className="block text-sm font-medium">Webhook n8n</span>
              <span className="block truncate text-xs text-muted-foreground">
                {webhookConfigured ? "Configurado para receber mensagens" : "Pendente de configuração"}
              </span>
            </div>
          </div>
          <Badge variant={webhookConfigured ? "default" : "outline"} className="gap-1 shrink-0">
            {webhookConfigured && <CheckCircle2 className="h-3 w-3" />}
            {webhookConfigured ? "OK" : "Pendente"}
          </Badge>
        </div>

        {/* Metadata */}
        <div className="text-xs text-muted-foreground space-y-1">
          <div className="flex items-center gap-1">
            <User className="h-3 w-3" />
            <span>Criado por: {creatorName}</span>
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
              {(instance.status === 'DISCONNECTED' || instance.status === 'CREATED' || instance.status === 'ERROR') && (
                <Button size="sm" onClick={() => onConnect(instance.id)} className="gap-1">
                  <QrCode className="h-4 w-4" />
                  Conectar
                </Button>
              )}
              {instance.status === 'CONNECTING' && (
                <Button size="sm" onClick={() => onConnect(instance.id)} className="gap-1">
                  <QrCode className="h-4 w-4" />
                  Ver QR Code
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
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onConfigureWebhook(instance.id)}
                disabled={configuringWebhook}
                className="gap-1"
              >
                {configuringWebhook ? <Loader2 className="h-4 w-4 animate-spin" /> : <Webhook className="h-4 w-4" />}
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
  const { hasPermission, isOwner, isSuperAdmin, loading: permissionsLoading } = usePermissionsV2();
  const [newName, setNewName] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [configuringWebhookId, setConfiguringWebhookId] = useState<string | null>(null);
  const [creatorNames, setCreatorNames] = useState<Record<string, string>>({});
  
  // QR Code modal state
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState<WhatsAppInstance | null>(null);

  const canManage = isOwner() || isSuperAdmin() || hasPermission('whatsapp_manage_instances');

  // Fetch creator names for all instances
  useEffect(() => {
    const uniqueCreatorIds = [
      ...new Set(instances.map(i => i.created_by).filter((id): id is string => Boolean(id))),
    ];
    if (uniqueCreatorIds.length === 0) return;

    const fetchNames = async () => {
      const { data } = await supabase
        .from('users')
        .select('id, name, email')
        .in('id', uniqueCreatorIds);

      if (data) {
        const names: Record<string, string> = {};
        for (const user of data) {
          names[user.id] = user.name || user.email || 'Desconhecido';
        }
        setCreatorNames(names);
      }
    };
    fetchNames();
  }, [instances]);

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

  const handleConnect = (id: string) => {
    const instance = instances.find(i => i.id === id);
    if (instance) {
      setSelectedInstance(instance);
      setQrModalOpen(true);
    }
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

  const handleRefreshAll = async () => {
    if (!restaurantId) {
      await refetch();
      return;
    }

    try {
      await Promise.all(
        instances.map((instance) =>
          InstancesService.refreshStatus(instance.id, restaurantId).catch((error) => {
            console.error("Erro ao atualizar instância:", instance.instance_name, error);
            return null;
          }),
        ),
      );
      await refetch();
      toast.success("Instâncias atualizadas");
    } catch {
      toast.error("Erro ao atualizar instâncias");
    }
  };

  const handleConfigureWebhook = async (id: string) => {
    if (!restaurantId) return;
    setConfiguringWebhookId(id);
    try {
      await InstancesService.configureWebhook(id, restaurantId);
      await refetch();
      toast.success("Webhook n8n configurado");
    } catch (error) {
      console.error("Erro ao configurar webhook:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao configurar webhook");
    } finally {
      setConfiguringWebhookId(null);
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
          <Button variant="outline" size="sm" onClick={handleRefreshAll} className="gap-1">
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

      {instances.length > 0 && (
        <Card className="border-dashed bg-muted/20">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <Webhook className="mt-0.5 h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Integração Evolution API + n8n</p>
                <p className="text-xs text-muted-foreground">
                  Ao criar ou configurar o webhook, esta instância passa a enviar eventos para o workflow n8n definido em <code>N8N_WEBHOOK_URL</code>.
                </p>
              </div>
            </div>
            <Badge variant="outline" className="w-fit">
              {instances.filter(i => i.webhook_url).length}/{instances.length} configuradas
            </Badge>
          </CardContent>
        </Card>
      )}

      {loading || permissionsLoading ? (
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
              creatorName={creatorNames[instance.created_by] || 'Carregando...'}
              configuringWebhook={configuringWebhookId === instance.id}
              onConnect={handleConnect}
              onDisconnect={disconnectInstance}
              onDelete={deleteInstance}
              onRefresh={handleRefresh}
              onToggleAutomation={handleToggleAutomation}
              onConfigureWebhook={handleConfigureWebhook}
            />
          ))}
        </div>
      )}

      {/* QR Code Connect Modal */}
      {selectedInstance && (
        <QRCodeConnectModal
          open={qrModalOpen}
          onOpenChange={setQrModalOpen}
          instanceId={selectedInstance.id}
          instanceName={selectedInstance.instance_name}
          restaurantId={restaurantId}
          onConnected={() => {
            refetch();
            setSelectedInstance(null);
          }}
        />
      )}
    </div>
  );
};

export default AtendimentoInstancias;
