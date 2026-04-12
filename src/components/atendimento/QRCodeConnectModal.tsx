import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, QrCode, RefreshCw, Wifi, CheckCircle2 } from "lucide-react";
import { InstancesService } from "@/services/atendimento/instancesService";
import { toast } from "sonner";

interface QRCodeConnectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instanceId: string;
  instanceName: string;
  restaurantId: string;
  onConnected: () => void;
}

const QR_REFRESH_INTERVAL = 30000; // 30 seconds

export function QRCodeConnectModal({
  open,
  onOpenChange,
  instanceId,
  instanceName,
  restaurantId,
  onConnected,
}: QRCodeConnectModalProps) {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [countdown, setCountdown] = useState(QR_REFRESH_INTERVAL / 1000);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const statusCheckRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimers = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (statusCheckRef.current) clearInterval(statusCheckRef.current);
    intervalRef.current = null;
    countdownRef.current = null;
    statusCheckRef.current = null;
  }, []);

  const fetchQRCode = useCallback(async () => {
    if (!instanceId || !restaurantId) return;
    setLoading(true);
    try {
      const result = await InstancesService.connectInstance(instanceId, restaurantId);
      if (result?.qrcode) {
        setQrCode(result.qrcode);
        setCountdown(QR_REFRESH_INTERVAL / 1000);
      } else {
        // If no QR code, maybe already connected — check status
        const status = await InstancesService.refreshStatus(instanceId, restaurantId);
        if (status === 'CONNECTED') {
          setConnected(true);
          toast.success('WhatsApp conectado com sucesso!');
          clearTimers();
          setTimeout(() => {
            onConnected();
            onOpenChange(false);
          }, 2000);
        }
      }
    } catch (err) {
      console.error('Error fetching QR code:', err);
      toast.error('Erro ao gerar QR Code');
    } finally {
      setLoading(false);
    }
  }, [instanceId, restaurantId, clearTimers, onConnected, onOpenChange]);

  const checkConnectionStatus = useCallback(async () => {
    if (!instanceId || !restaurantId || connected) return;
    try {
      const status = await InstancesService.refreshStatus(instanceId, restaurantId);
      if (status === 'CONNECTED') {
        setConnected(true);
        toast.success('WhatsApp conectado com sucesso!');
        clearTimers();
        setTimeout(() => {
          onConnected();
          onOpenChange(false);
        }, 2000);
      }
    } catch {
      // Silently fail status checks
    }
  }, [instanceId, restaurantId, connected, clearTimers, onConnected, onOpenChange]);

  useEffect(() => {
    if (open && !connected) {
      fetchQRCode();

      // Auto-refresh QR code
      intervalRef.current = setInterval(fetchQRCode, QR_REFRESH_INTERVAL);

      // Countdown timer
      countdownRef.current = setInterval(() => {
        setCountdown((prev) => (prev <= 1 ? QR_REFRESH_INTERVAL / 1000 : prev - 1));
      }, 1000);

      // Check connection status every 5 seconds
      statusCheckRef.current = setInterval(checkConnectionStatus, 5000);
    }

    return clearTimers;
  }, [open, connected, fetchQRCode, checkConnectionStatus, clearTimers]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setQrCode(null);
      setConnected(false);
      setLoading(false);
      setCountdown(QR_REFRESH_INTERVAL / 1000);
    }
  }, [open]);

  const qrSrc = qrCode
    ? qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Conectar WhatsApp
          </DialogTitle>
          <DialogDescription>
            Escaneie o QR Code abaixo com o WhatsApp no celular para conectar a instância <strong>{instanceName}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          {connected ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <CheckCircle2 className="h-16 w-16 text-green-500 animate-in zoom-in" />
              <p className="text-lg font-medium text-green-600">Conectado com sucesso!</p>
            </div>
          ) : loading && !qrSrc ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Gerando QR Code...</p>
            </div>
          ) : qrSrc ? (
            <>
              <div className="relative p-3 bg-white rounded-xl border shadow-sm">
                <img
                  src={qrSrc}
                  alt="QR Code WhatsApp"
                  className="w-64 h-64 rounded-lg"
                />
                {loading && (
                  <div className="absolute inset-0 bg-background/60 flex items-center justify-center rounded-xl">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <RefreshCw className="h-3 w-3" />
                <span>Atualização automática em {countdown}s</span>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={fetchQRCode}
                disabled={loading}
                className="gap-1"
              >
                <RefreshCw className="h-4 w-4" />
                Atualizar QR Code
              </Button>
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 py-8">
              <Wifi className="h-12 w-12 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Não foi possível gerar o QR Code</p>
              <Button variant="outline" size="sm" onClick={fetchQRCode}>
                Tentar novamente
              </Button>
            </div>
          )}

          {!connected && (
            <div className="text-xs text-muted-foreground text-center space-y-1 max-w-sm">
              <p>1. Abra o WhatsApp no celular</p>
              <p>2. Toque em <strong>Mais opções</strong> (⋮) → <strong>Aparelhos conectados</strong></p>
              <p>3. Toque em <strong>Conectar um aparelho</strong> e escaneie o código</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
