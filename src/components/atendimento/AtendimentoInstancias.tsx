import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Wifi, WifiOff, QrCode, Trash2, RefreshCw, Loader2, Smartphone } from "lucide-react";
import { useWhatsAppInstances } from "@/hooks/useWhatsAppInstances";
import { WhatsAppInstance } from "@/types/atendimento";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
  CONNECTED: { label: "Conectado", variant: "default", icon: <Wifi className="h-3 w-3" /> },
  DISCONNECTED: { label: "Desconectado", variant: "destructive", icon: <WifiOff className="h-3 w-3" /> },
  CONNECTING: { label: "Conectando...", variant: "secondary", icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  QRCODE: { label: "Aguardando QR", variant: "outline", icon: <QrCode className="h-3 w-3" /> },
};

function InstanceCard({ instance, onConnect, onDisconnect, onDelete }: {
  instance: WhatsAppInstance;
  onConnect: (id: string) => void;
  onDisconnect: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const status = statusConfig[instance.status] || statusConfig.DISCONNECTED;

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
        <CardDescription>
          {instance.phone_number ? `📱 ${instance.phone_number}` : "Número não conectado"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {instance.status === 'QRCODE' && instance.qrcode_base64 && (
          <div className="mb-4 flex justify-center">
            <img 
              src={`data:image/png;base64,${instance.qrcode_base64}`} 
              alt="QR Code" 
              className="w-48 h-48 rounded-lg border"
            />
          </div>
        )}
        <div className="flex gap-2 flex-wrap">
          {instance.status === 'DISCONNECTED' && (
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
        </div>
      </CardContent>
    </Card>
  );
}

const AtendimentoInstancias = () => {
  const { instances, loading, createInstance, deleteInstance, connectInstance, disconnectInstance, refetch } = useWhatsAppInstances();
  const [newName, setNewName] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!newName.trim()) return;
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
          <Button onClick={() => setDialogOpen(true)} className="gap-1">
            <Plus className="h-4 w-4" />
            Criar Instância
          </Button>
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
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default AtendimentoInstancias;
