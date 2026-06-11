import React from "react";
import QRCode from "qrcode";
import { subDays } from "date-fns";
import { Link } from "react-router-dom";
import {
  BarChart3,
  Copy,
  Download,
  ExternalLink,
  Globe2,
  Instagram,
  MapPin,
  MessageCircle,
  QrCode,
  RefreshCw,
  Share2,
  Target,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { supabase } from "@/integrations/supabase/client";
import {
  getPublicMenuConversionFunnel,
  type PublicMenuConversionFunnel,
  type PublicMenuFunnelSource,
} from "@/services/publicMenuAnalyticsService";

type ChannelPreset = {
  id: string;
  label: string;
  source: string;
  medium: string;
  defaultCampaign: string;
  shortText: string;
  shareText: string;
};

const CHANNEL_PRESETS: ChannelPreset[] = [
  {
    id: "instagram_bio",
    label: "Instagram bio",
    source: "instagram",
    medium: "bio",
    defaultCampaign: "cardapio_bio",
    shortText: "Link fixo para perfil e destaques.",
    shareText: "Nosso cardapio online esta aqui:",
  },
  {
    id: "instagram_stories",
    label: "Instagram stories",
    source: "instagram",
    medium: "stories",
    defaultCampaign: "stories_cardapio",
    shortText: "Link para stories, reels e destaques.",
    shareText: "Peca direto pelo nosso cardapio:",
  },
  {
    id: "google_business",
    label: "Google Business",
    source: "google",
    medium: "business_profile",
    defaultCampaign: "google_cardapio",
    shortText: "Link para o perfil da empresa no Google.",
    shareText: "Veja nosso cardapio antes de vir:",
  },
  {
    id: "whatsapp_status",
    label: "WhatsApp status",
    source: "whatsapp",
    medium: "status",
    defaultCampaign: "status_cardapio",
    shortText: "Link para status, lista de transmissao e atendimento.",
    shareText: "Confira o cardapio e faca seu pedido:",
  },
  {
    id: "qr_delivery",
    label: "QR delivery",
    source: "qrcode",
    medium: "delivery",
    defaultCampaign: "impresso_delivery",
    shortText: "QR para embalagem, folder e balcão.",
    shareText: "Aponte a camera e faca seu pedido:",
  },
  {
    id: "custom",
    label: "Campanha personalizada",
    source: "campanha",
    medium: "link",
    defaultCampaign: "campanha_cardapio",
    shortText: "Crie um link para uma acao especifica.",
    shareText: "Acesse nosso cardapio:",
  },
];

const getPreset = (id: string) => CHANNEL_PRESETS.find((preset) => preset.id === id) || CHANNEL_PRESETS[0];

const numberFormatter = new Intl.NumberFormat("pt-BR");
const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const sanitizeTrackingValue = (value: string, fallback: string) => {
  const normalized = value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized || fallback;
};

const formatPercent = (value: number) =>
  `${Number(value || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;

const emptySourceMetric = (source: string): PublicMenuFunnelSource => ({
  source,
  menuViews: 0,
  productClicks: 0,
  addToCart: 0,
  checkoutStarted: 0,
  ordersCompleted: 0,
  revenue: 0,
  conversionRate: 0,
});

export const MarketingLinkKit = () => {
  const { user } = useCurrentUser();
  const [baseUrl, setBaseUrl] = React.useState("");
  const [selectedPresetId, setSelectedPresetId] = React.useState(CHANNEL_PRESETS[0].id);
  const [campaignName, setCampaignName] = React.useState(CHANNEL_PRESETS[0].defaultCampaign);
  const [customSource, setCustomSource] = React.useState(CHANNEL_PRESETS[0].source);
  const [customMedium, setCustomMedium] = React.useState(CHANNEL_PRESETS[0].medium);
  const [qrCodeUrl, setQrCodeUrl] = React.useState("");
  const [loadingQr, setLoadingQr] = React.useState(false);
  const [analytics, setAnalytics] = React.useState<PublicMenuConversionFunnel | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = React.useState(false);
  const [analyticsError, setAnalyticsError] = React.useState<string | null>(null);

  const preset = React.useMemo(() => getPreset(selectedPresetId), [selectedPresetId]);
  const source = selectedPresetId === "custom" ? customSource : preset.source;
  const medium = selectedPresetId === "custom" ? customMedium : preset.medium;
  const normalizedSource = sanitizeTrackingValue(source, preset.source);
  const normalizedMedium = sanitizeTrackingValue(medium, preset.medium);
  const normalizedCampaign = sanitizeTrackingValue(campaignName, preset.defaultCampaign);

  const trackedUrl = React.useMemo(() => {
    if (!baseUrl) return "";

    const url = new URL(baseUrl);
    url.searchParams.set("utm_source", normalizedSource);
    url.searchParams.set("utm_medium", normalizedMedium);
    url.searchParams.set("utm_campaign", normalizedCampaign);
    return url.toString();
  }, [baseUrl, normalizedCampaign, normalizedMedium, normalizedSource]);

  const shareMessage = `${preset.shareText}\n${trackedUrl}`;
  const analyticsRange = React.useMemo(() => {
    const dateTo = new Date();
    return {
      dateFrom: subDays(dateTo, 29),
      dateTo,
    };
  }, []);

  const loadAnalytics = React.useCallback(async () => {
    if (!user?.restaurant_id) return;

    setLoadingAnalytics(true);
    setAnalyticsError(null);

    try {
      const result = await getPublicMenuConversionFunnel(analyticsRange.dateFrom, analyticsRange.dateTo);
      setAnalytics(result);
    } catch (error) {
      console.error("Erro ao carregar resultado dos canais:", error);
      setAnalyticsError(error instanceof Error ? error.message : "Nao foi possivel carregar o resultado dos canais.");
    } finally {
      setLoadingAnalytics(false);
    }
  }, [analyticsRange.dateFrom, analyticsRange.dateTo, user?.restaurant_id]);

  const selectedSourceMetric = React.useMemo(() => {
    return analytics?.sources.find((item) => item.source === normalizedSource) || emptySourceMetric(normalizedSource);
  }, [analytics?.sources, normalizedSource]);

  const topSources = React.useMemo(() => {
    return [...(analytics?.sources || [])]
      .sort((a, b) => b.ordersCompleted - a.ordersCompleted || b.menuViews - a.menuViews || b.revenue - a.revenue)
      .slice(0, 4);
  }, [analytics?.sources]);

  React.useEffect(() => {
    if (!user?.restaurant_id) return;

    supabase
      .from("restaurants")
      .select("slug")
      .eq("id", user.restaurant_id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          toast.error("Nao foi possivel carregar o link do cardapio.");
          return;
        }

        const publicId = data?.slug || user.restaurant_id;
        setBaseUrl(`${window.location.origin}/cardapio/${publicId}`);
      });
  }, [user?.restaurant_id]);

  React.useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  React.useEffect(() => {
    if (!trackedUrl) {
      setQrCodeUrl("");
      return;
    }

    let cancelled = false;
    setLoadingQr(true);

    QRCode.toDataURL(trackedUrl, {
      width: 220,
      margin: 2,
      color: {
        dark: "#1f2937",
        light: "#ffffff",
      },
    })
      .then((dataUrl) => {
        if (!cancelled) setQrCodeUrl(dataUrl);
      })
      .catch((error) => {
        console.error("Erro ao gerar QR Code rastreavel:", error);
        if (!cancelled) toast.error("Nao foi possivel gerar o QR Code rastreavel.");
      })
      .finally(() => {
        if (!cancelled) setLoadingQr(false);
      });

    return () => {
      cancelled = true;
    };
  }, [trackedUrl]);

  const handlePresetChange = (value: string) => {
    const nextPreset = getPreset(value);
    setSelectedPresetId(value);
    setCampaignName(nextPreset.defaultCampaign);
    setCustomSource(nextPreset.source);
    setCustomMedium(nextPreset.medium);
  };

  const copyToClipboard = async (value: string, label: string) => {
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copiado.`);
    } catch (error) {
      console.error("Erro ao copiar:", error);
      toast.error("Nao foi possivel copiar.");
    }
  };

  const handleDownloadQr = () => {
    if (!qrCodeUrl) return;

    const link = document.createElement("a");
    link.href = qrCodeUrl;
    link.download = `pubfy-${normalizedSource}-${normalizedCampaign}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("QR Code rastreavel baixado.");
  };

  const handleShare = async () => {
    if (!navigator.share || !trackedUrl) {
      copyToClipboard(shareMessage, "Mensagem");
      return;
    }

    try {
      await navigator.share({
        title: "Cardapio digital",
        text: preset.shareText,
        url: trackedUrl,
      });
    } catch (error) {
      console.error("Erro ao compartilhar:", error);
      copyToClipboard(shareMessage, "Mensagem");
    }
  };

  if (!user?.restaurant_id) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Links rastreaveis
          </CardTitle>
          <CardDescription>Complete o cadastro do restaurante para gerar links de divulgacao.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Links rastreaveis para divulgacao
            </CardTitle>
            <CardDescription>Gere links com UTM para Instagram, Google, WhatsApp e campanhas locais.</CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/relatorios?tab=conversao">
              <ExternalLink className="mr-2 h-4 w-4" />
              Ver conversao
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2 md:col-span-1">
                <Label htmlFor="tracking-channel">Canal</Label>
                <Select value={selectedPresetId} onValueChange={handlePresetChange}>
                  <SelectTrigger id="tracking-channel">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {CHANNEL_PRESETS.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="tracking-campaign">Campanha</Label>
                <Input
                  id="tracking-campaign"
                  value={campaignName}
                  onChange={(event) => setCampaignName(event.target.value)}
                  placeholder="cardapio_bio"
                />
              </div>
            </div>

            {selectedPresetId === "custom" && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="tracking-source">Origem</Label>
                  <Input
                    id="tracking-source"
                    value={customSource}
                    onChange={(event) => setCustomSource(event.target.value)}
                    placeholder="instagram"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tracking-medium">Meio</Label>
                  <Input
                    id="tracking-medium"
                    value={customMedium}
                    onChange={(event) => setCustomMedium(event.target.value)}
                    placeholder="bio"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="tracked-menu-url">Link rastreavel</Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input id="tracked-menu-url" value={trackedUrl} readOnly className="font-mono text-xs" />
                <Button type="button" variant="outline" onClick={() => copyToClipboard(trackedUrl, "Link")}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copiar
                </Button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-md border bg-muted/30 p-3">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <Instagram className="h-4 w-4" />
                  Instagram
                </div>
                <p className="text-xs text-muted-foreground">Use na bio, stories e destaques com campanhas separadas.</p>
              </div>
              <div className="rounded-md border bg-muted/30 p-3">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <MapPin className="h-4 w-4" />
                  Google
                </div>
                <p className="text-xs text-muted-foreground">Cole no campo de cardapio ou site do perfil da empresa.</p>
              </div>
              <div className="rounded-md border bg-muted/30 p-3">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </div>
                <p className="text-xs text-muted-foreground">Envie em status, listas e atendimento para medir retorno.</p>
              </div>
            </div>
          </div>

          <div className="rounded-md border p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium">QR da campanha</p>
                <p className="text-xs text-muted-foreground">{preset.shortText}</p>
              </div>
              <Badge variant="secondary">{normalizedSource}</Badge>
            </div>

            <div className="flex min-h-[220px] items-center justify-center rounded-md bg-muted/40">
              {loadingQr ? (
                <QrCode className="h-12 w-12 animate-pulse text-muted-foreground" />
              ) : qrCodeUrl ? (
                <img src={qrCodeUrl} alt="QR Code rastreavel da campanha" width={220} height={220} className="rounded-md" />
              ) : (
                <QrCode className="h-12 w-12 text-muted-foreground" />
              )}
            </div>

            <div className="mt-3 grid gap-2">
              <Button type="button" onClick={handleDownloadQr} disabled={!qrCodeUrl || loadingQr}>
                <Download className="mr-2 h-4 w-4" />
                Baixar QR
              </Button>
              <Button type="button" variant="outline" onClick={handleShare} disabled={!trackedUrl}>
                <Share2 className="mr-2 h-4 w-4" />
                Compartilhar
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-2">
            <Label htmlFor="tracking-share-message">Texto pronto</Label>
            <Textarea id="tracking-share-message" value={shareMessage} readOnly className="min-h-[108px]" />
            <Button type="button" variant="outline" onClick={() => copyToClipboard(shareMessage, "Mensagem")}>
              <Copy className="mr-2 h-4 w-4" />
              Copiar mensagem
            </Button>
          </div>

          <div className="rounded-md border bg-muted/30 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium">
              <Globe2 className="h-4 w-4" />
              Identificacao no relatorio
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">utm_source</span>
                <Badge variant="outline">{normalizedSource}</Badge>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">utm_medium</span>
                <Badge variant="outline">{normalizedMedium}</Badge>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">utm_campaign</span>
                <Badge variant="outline" className="max-w-[170px] truncate">
                  {normalizedCampaign}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-md border bg-muted/20 p-4">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-medium">
                <BarChart3 className="h-4 w-4" />
                Resultado dos canais nos ultimos 30 dias
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Compare o canal selecionado com as demais origens registradas no cardapio publico.
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={loadAnalytics} disabled={loadingAnalytics}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loadingAnalytics ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </div>

          {analyticsError ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {analyticsError}
            </div>
          ) : loadingAnalytics ? (
            <div className="grid gap-3 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-20 animate-pulse rounded-md bg-background" />
              ))}
            </div>
          ) : analytics && analytics.sources.length > 0 ? (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-4">
                <div className="rounded-md border bg-background p-3">
                  <p className="text-xs text-muted-foreground">Visitas do canal</p>
                  <p className="mt-1 text-xl font-semibold">{numberFormatter.format(selectedSourceMetric.menuViews)}</p>
                </div>
                <div className="rounded-md border bg-background p-3">
                  <p className="text-xs text-muted-foreground">Pedidos do canal</p>
                  <p className="mt-1 text-xl font-semibold">{numberFormatter.format(selectedSourceMetric.ordersCompleted)}</p>
                </div>
                <div className="rounded-md border bg-background p-3">
                  <p className="text-xs text-muted-foreground">Conversao</p>
                  <p className="mt-1 text-xl font-semibold">{formatPercent(selectedSourceMetric.conversionRate)}</p>
                </div>
                <div className="rounded-md border bg-background p-3">
                  <p className="text-xs text-muted-foreground">Receita atribuida</p>
                  <p className="mt-1 text-xl font-semibold">{currencyFormatter.format(selectedSourceMetric.revenue)}</p>
                </div>
              </div>

              <div className="space-y-2">
                {topSources.map((item) => (
                  <div key={item.source} className="grid gap-2 rounded-md border bg-background p-3 md:grid-cols-[1fr_90px_90px_110px] md:items-center">
                    <div className="flex items-center gap-2">
                      <Badge variant={item.source === normalizedSource ? "default" : "outline"}>{item.source}</Badge>
                      <span className="text-sm text-muted-foreground">{numberFormatter.format(item.menuViews)} visitas</span>
                    </div>
                    <span className="text-sm">{numberFormatter.format(item.ordersCompleted)} pedidos</span>
                    <span className="text-sm">{formatPercent(item.conversionRate)}</span>
                    <span className="text-sm font-medium md:text-right">{currencyFormatter.format(item.revenue)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-md border bg-background p-4 text-sm text-muted-foreground">
              Ainda nao ha visitas rastreadas. Abra o link gerado, faca um pedido de teste e volte aqui para conferir a origem.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
