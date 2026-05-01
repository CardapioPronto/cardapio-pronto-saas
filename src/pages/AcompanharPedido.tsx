import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { deliveryOrderService } from '@/services/deliveryOrderService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Clock,
  CheckCircle2,
  ChefHat,
  Bike,
  PackageCheck,
  XCircle,
  Phone,
  MapPin,
  Wifi,
  Share2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type StatusKey =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

const STATUS_FLOW: { key: StatusKey; label: string; icon: any }[] = [
  { key: 'pending', label: 'Pedido recebido', icon: Clock },
  { key: 'confirmed', label: 'Confirmado pela loja', icon: CheckCircle2 },
  { key: 'preparing', label: 'Em preparo', icon: ChefHat },
  { key: 'out_for_delivery', label: 'Saiu para entrega', icon: Bike },
  { key: 'delivered', label: 'Entregue', icon: PackageCheck },
];

const LOCAL_STATUS_FLOW: { key: StatusKey; label: string; icon: any }[] = [
  { key: 'pending', label: 'Pedido recebido', icon: Clock },
  { key: 'confirmed', label: 'Confirmado pela loja', icon: CheckCircle2 },
  { key: 'preparing', label: 'Em preparo', icon: ChefHat },
  { key: 'delivered', label: 'Pronto/concluído', icon: PackageCheck },
];

const STATUS_INDEX: Record<StatusKey, number> = {
  pending: 0,
  confirmed: 1,
  preparing: 2,
  out_for_delivery: 3,
  delivered: 4,
  cancelled: -1,
};

function brl(v: number | string) {
  const n = typeof v === 'string' ? Number(v) : v;
  return (n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AcompanharPedido() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<any | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trackingUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/pedido/${id}` : '';

  async function handleShare() {
    const shortId = (id || '').substring(0, 8).toUpperCase();
    const shareText = `Acompanhe seu pedido #${shortId} em tempo real:\n${trackingUrl}`;

    // 1) Web Share API (mobile)
    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      try {
        await (navigator as any).share({
          title: `Pedido #${shortId}`,
          text: shareText,
          url: trackingUrl,
        });
        return;
      } catch (e: any) {
        if (e?.name === 'AbortError') return; // usuário cancelou
      }
    }

    // 2) Fallback: abre WhatsApp Web/app com a mensagem pronta
    const waUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    const win = window.open(waUrl, '_blank', 'noopener,noreferrer');

    // 3) Copia o link como conveniência adicional
    try {
      await navigator.clipboard.writeText(trackingUrl);
      if (!win) toast.success('Link copiado! Cole no WhatsApp para compartilhar.');
      else toast.success('Link também copiado para a área de transferência.');
    } catch {
      if (!win) toast.error('Não foi possível abrir o WhatsApp. Copie o link manualmente.');
    }
  }

  const loadOrder = async (trackingId: string, cancelled?: () => boolean) => {
    const o = await deliveryOrderService.getById(trackingId);
    if (cancelled?.()) return;
    if (!o) {
      setError('Pedido não encontrado.');
      return;
    }
    setOrder(o);
    setHistory(o.history || []);
    setLive(true);
    setError(null);
  };

  // Carga inicial e atualização periódica por RPC pública.
  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        await loadOrder(id, () => cancelled);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Erro ao carregar pedido.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    const interval = window.setInterval(() => {
      loadOrder(id, () => cancelled).catch(() => setLive(false));
    }, 15000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="mx-auto max-w-3xl space-y-4">
          <Skeleton className="h-12 w-2/3" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Pedido não encontrado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              {error || 'Verifique o link informado.'}
            </p>
            <Button asChild variant="outline">
              <Link to="/">Voltar para a página inicial</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const restaurant = order.restaurant;
  const currentStatus = order.status as StatusKey;
  const isCancelled = currentStatus === 'cancelled';
  const statusFlow = order.fulfillment_type === 'delivery' ? STATUS_FLOW : LOCAL_STATUS_FLOW;
  const currentIdx = Math.min(STATUS_INDEX[currentStatus] ?? 0, statusFlow.length - 1);
  const isDelivery = order.fulfillment_type === 'delivery';

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-card border-b sticky top-0 z-10">
        <div className="mx-auto max-w-3xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {restaurant?.logo_url && (
              <img
                src={restaurant.logo_url}
                alt={restaurant?.name}
                className="h-10 w-10 rounded-full object-cover border"
              />
            )}
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Pedido em</p>
              <h1 className="font-semibold truncate">{restaurant?.name || 'Restaurante'}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={live ? 'default' : 'secondary'} className="gap-1">
              <Wifi className="h-3 w-3" />
              {live ? 'Atualizado' : 'Atualizando...'}
            </Badge>
            <Button
              size="sm"
              variant="outline"
              onClick={handleShare}
              className="gap-2"
              aria-label="Compartilhar link do pedido no WhatsApp"
            >
              <Share2 className="h-4 w-4" />
              <span className="hidden sm:inline">Compartilhar</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 space-y-6">
        {/* Status atual */}
        <Card className="overflow-hidden">
          <div
            className={cn(
              'h-2',
              isCancelled ? 'bg-destructive' : 'bg-primary',
            )}
          />
          <CardContent className="p-6 space-y-1">
            <p className="text-sm text-muted-foreground">
              Pedido <span className="font-mono">#{order.id.substring(0, 8).toUpperCase()}</span>
            </p>
            <h2 className="text-2xl font-bold">
              {isCancelled
                ? 'Pedido cancelado'
                : statusFlow[currentIdx]?.label || 'Recebido'}
            </h2>
            {!isCancelled && isDelivery && order.estimated_delivery_minutes && currentStatus !== 'delivered' && (
              <p className="text-sm text-muted-foreground">
                Tempo estimado de entrega: <strong>{order.estimated_delivery_minutes} min</strong>
              </p>
            )}
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Acompanhe seu pedido</CardTitle>
          </CardHeader>
          <CardContent>
            {isCancelled ? (
              <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/30">
                <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-destructive">Pedido cancelado</p>
                  <p className="text-sm text-muted-foreground">
                    Entre em contato com a loja para mais informações.
                  </p>
                </div>
              </div>
            ) : (
              <ol className="relative space-y-6">
                {statusFlow.map((step, idx) => {
                  const Icon = step.icon;
                  const reached = idx <= currentIdx;
                  const active = idx === currentIdx;
                  const event = history.find((h) => h.new_status === step.key);

                  return (
                    <li key={step.key} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div
                          className={cn(
                            'h-10 w-10 rounded-full flex items-center justify-center border-2 transition-colors',
                            reached
                              ? 'bg-primary border-primary text-primary-foreground'
                              : 'bg-background border-muted text-muted-foreground',
                            active && 'ring-4 ring-primary/20 animate-pulse',
                          )}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        {idx < statusFlow.length - 1 && (
                          <div
                            className={cn(
                              'w-0.5 flex-1 mt-1 min-h-[20px]',
                              idx < currentIdx ? 'bg-primary' : 'bg-muted',
                            )}
                          />
                        )}
                      </div>
                      <div className="flex-1 pb-2">
                        <p
                          className={cn(
                            'font-medium',
                            reached ? 'text-foreground' : 'text-muted-foreground',
                          )}
                        >
                          {step.label}
                        </p>
                        {event ? (
                          <p className="text-xs text-muted-foreground">
                            {formatTime(event.created_at)}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground/60">Aguardando…</p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </CardContent>
        </Card>

        {/* Resumo do pedido */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resumo do pedido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {Array.isArray(order.items) && order.items.length > 0 && (
              <div className="space-y-2 pb-3 border-b">
                {order.items.map((item: any) => (
                  <div key={item.id} className="flex justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{item.quantity}x {item.name}</p>
                      {item.observations && (
                        <p className="text-xs text-muted-foreground">Obs: {item.observations}</p>
                      )}
                    </div>
                    <span className="shrink-0">{brl(Number(item.price) * Number(item.quantity))}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{brl(order.subtotal)}</span>
            </div>
            {isDelivery && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Taxa de entrega</span>
                <span>{brl(order.delivery_fee)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-base pt-2 border-t">
              <span>Total</span>
              <span>{brl(order.total)}</span>
            </div>
            {order.payment_method && (
              <div className="flex justify-between pt-2">
                <span className="text-muted-foreground">Pagamento</span>
                <span className="capitalize">{order.payment_method}</span>
              </div>
            )}
            {order.change_for && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Troco para</span>
                <span>{brl(order.change_for)}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {isDelivery ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Endereço de entrega
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <p className="font-medium">{order.customer_name}</p>
              <p className="text-muted-foreground">
                {order.street}, {order.number}
                {order.complement ? ` - ${order.complement}` : ''}
              </p>
              <p className="text-muted-foreground">
                {order.neighborhood} • {order.city}/{order.state}
              </p>
              <p className="text-muted-foreground">CEP: {order.zip_code}</p>
              {order.reference_point && (
                <p className="text-muted-foreground italic">Ref: {order.reference_point}</p>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Retirada/atendimento local
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <p className="font-medium">{order.customer_name || 'Cliente'}</p>
              <p className="text-muted-foreground">
                {order.fulfillment_type === 'table'
                  ? 'Pedido enviado para atendimento na mesa.'
                  : 'Pedido enviado para retirada ou pagamento no balcão.'}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Contato com a loja */}
        {restaurant?.phone_whatsapp && (
          <Card>
            <CardContent className="p-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-medium truncate">Precisa de ajuda?</p>
                <p className="text-xs text-muted-foreground">Fale com a loja pelo WhatsApp</p>
              </div>
              <Button asChild size="sm">
                <a
                  href={`https://wa.me/${(restaurant.phone_whatsapp || '').replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Phone className="h-4 w-4 mr-2" />
                  WhatsApp
                </a>
              </Button>
            </CardContent>
          </Card>
        )}

        <p className="text-center text-xs text-muted-foreground pt-4">
          Pedido feito em {formatDate(order.created_at)}
        </p>
      </main>
    </div>
  );
}
