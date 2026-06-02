import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  CalendarClock,
  Copy,
  FileText,
  Gift,
  Inbox,
  Mail,
  Plus,
  RefreshCw,
  Save,
  Send,
  Tags,
  Target,
  TicketPercent,
  TrendingUp,
  Users,
} from "lucide-react";
import type { ComponentType } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/components/ui/sonner-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useSearchParams } from "react-router-dom";
import { EmailIntegrationScope } from "@/services/emailIntegrationService";
import {
  copyAllowedEmailTemplate,
  EmailContact,
  EmailCampaignEntitlement,
  EmailCampaignCategory,
  EmailCampaignMetrics,
  EmailCampaignAudiencePreview,
  EmailSendLog,
  EmailTemplate,
  getEmailCampaignEntitlement,
  getEmailCampaignMetrics,
  listEmailCampaignCategories,
  listEmailCampaigns,
  listEmailContacts,
  listEmailLogs,
  listEmailTemplates,
  previewEmailCampaignAudience,
  saveEmailCampaign,
  saveEmailTemplate,
  EmailCampaignCouponConfig,
  EmailCampaign,
  generateEmailCampaignCoupon,
  sendEmailCampaign,
  sendEmailCampaignTest,
} from "@/services/emailOperationsService";
import { EmailIntegrationForm } from "./EmailIntegrationForm";

interface Props {
  scope: EmailIntegrationScope;
}

const STATUS_LABEL: Record<string, string> = {
  queued: "Na fila",
  sent: "Enviado",
  delivered: "Entregue",
  delivery_delayed: "Atrasado",
  opened: "Aberto",
  clicked: "Clique",
  bounced: "Rejeitado",
  complained: "Spam",
  failed: "Falhou",
};

const CAMPAIGN_STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho",
  sending: "Enviando",
  sent: "Enviada",
  failed: "Falhou",
};

type CampaignAudienceType =
  | "marketing_opt_in"
  | "recent_customers"
  | "inactive_customers"
  | "first_order_no_repurchase"
  | "high_ticket"
  | "loyalty_balance"
  | "purchased_category"
  | "birthday";

type CampaignPreset = {
  name: string;
  subject: string;
  message: string;
  audience: CampaignAudienceType;
  days?: number;
};

type CampaignAutomationCard = {
  key: keyof typeof CAMPAIGN_PRESETS;
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  audience: string;
};

const CAMPAIGN_PRESETS: Record<string, CampaignPreset> = {
  inactive_30: {
    name: "Reativacao - 30 dias sem pedido",
    subject: "Sentimos sua falta",
    message: "Preparamos uma oferta especial para voce voltar a pedir com a gente.",
    audience: "inactive_customers",
    days: 30,
  },
  first_repurchase: {
    name: "Segunda compra",
    subject: "Seu proximo pedido pode ser ainda melhor",
    message: "Obrigado pelo primeiro pedido. Volte hoje e aproveite uma condicao especial.",
    audience: "first_order_no_repurchase",
    days: 30,
  },
  high_ticket: {
    name: "Clientes VIP",
    subject: "Um mimo para clientes especiais",
    message: "Voce esta entre nossos clientes especiais. Temos uma oferta pensada para voce.",
    audience: "high_ticket",
  },
  loyalty_balance: {
    name: "Saldo de fidelidade",
    subject: "Voce tem beneficio esperando",
    message: "Seu saldo de fidelidade pode deixar o proximo pedido ainda melhor.",
    audience: "loyalty_balance",
  },
  purchased_category: {
    name: "Recompra por categoria",
    subject: "Uma sugestao especial para seu proximo pedido",
    message: "Selecionamos uma oferta especial baseada nos produtos que voce costuma pedir.",
    audience: "purchased_category",
    days: 180,
  },
  birthday: {
    name: "Aniversariantes",
    subject: "Seu aniversario merece um presente",
    message: "Preparamos uma oferta especial para celebrar com voce.",
    audience: "birthday",
    days: 30,
  },
};

const CAMPAIGN_AUTOMATIONS: CampaignAutomationCard[] = [
  {
    key: "inactive_30",
    title: "Cliente inativo",
    description: "Recupere clientes que ficaram tempo demais sem pedir.",
    icon: CalendarClock,
    audience: "Opt-in marketing",
  },
  {
    key: "first_repurchase",
    title: "Primeira recompra",
    description: "Transforme quem fez só um pedido em cliente recorrente.",
    icon: Target,
    audience: "Primeira compra sem recompra",
  },
  {
    key: "high_ticket",
    title: "Cliente VIP",
    description: "Aborde clientes de maior valor com uma campanha especial.",
    icon: TrendingUp,
    audience: "Alto ticket",
  },
  {
    key: "loyalty_balance",
    title: "Saldo de fidelidade",
    description: "Convide clientes com beneficio acumulado a voltar ao cardapio.",
    icon: Gift,
    audience: "Saldo positivo",
  },
  {
    key: "purchased_category",
    title: "Comprou categoria",
    description: "Crie uma campanha para quem comprou produtos de uma categoria.",
    icon: Tags,
    audience: "Categoria específica",
  },
  {
    key: "birthday",
    title: "Aniversariantes",
    description: "Encante clientes que fazem aniversário nos próximos dias.",
    icon: CalendarClock,
    audience: "Aniversário cadastrado",
  },
];

const makeCampaignHtml = (title: string, message: string) =>
  `<h2>${title}</h2><p>${message}</p>`;

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

type CouponFormState = {
  discountType: EmailCampaignCouponConfig["discountType"];
  discountValue: string;
  validDays: string;
  minimumOrderValue: string;
};

const DEFAULT_COUPON_CONFIG: CouponFormState = {
  discountType: "percentage",
  discountValue: "10",
  validDays: "30",
  minimumOrderValue: "0",
};

const formatCouponDiscount = (campaign: EmailCampaign) => {
  const coupon = campaign.coupon;
  if (!coupon) return "";
  if (coupon.discount_type === "percentage") return `${coupon.discount_value}%`;
  return money.format(coupon.discount_value);
};

const normalizeNumber = (value: string, fallback: number) => {
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : fallback;
};

const couponValidDaysFromNow = (validUntil?: string | null) => {
  if (!validUntil) return DEFAULT_COUPON_CONFIG.validDays;
  const diff = new Date(validUntil).getTime() - Date.now();
  return String(Math.max(1, Math.ceil(diff / 86_400_000)));
};

const campaignContentUsesCoupon = (campaign: EmailCampaign) =>
  /\{\{\s*coupon\s*\}\}/.test(campaign.html_content) ||
  /\{\{\s*coupon\s*\}\}/.test(campaign.text_content || "");

export function EmailOperationsPanel({ scope }: Props) {
  const [searchParams] = useSearchParams();
  const queryTab = searchParams.get("tab");
  const initialTab =
    queryTab === "automations" || queryTab === "campaigns" || queryTab === "templates" || queryTab === "logs"
      ? queryTab
      : "settings";
  const autoCreatedCampaignRef = useRef(false);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [logs, setLogs] = useState<EmailSendLog[]>([]);
  const [contacts, setContacts] = useState<EmailContact[]>([]);
  const [campaignCategories, setCampaignCategories] = useState<EmailCampaignCategory[]>([]);
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [campaignEntitlement, setCampaignEntitlement] = useState<EmailCampaignEntitlement | null>(null);
  const [campaignMetrics, setCampaignMetrics] = useState<EmailCampaignMetrics | null>(null);
  const [audiencePreview, setAudiencePreview] = useState<EmailCampaignAudiencePreview | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copyingTemplate, setCopyingTemplate] = useState<string | null>(null);
  const [savingCampaign, setSavingCampaign] = useState(false);
  const [sendingCampaign, setSendingCampaign] = useState(false);
  const [sendingCampaignTest, setSendingCampaignTest] = useState(false);
  const [campaignTestEmail, setCampaignTestEmail] = useState("");
  const [previewingAudience, setPreviewingAudience] = useState(false);
  const [generatingCoupon, setGeneratingCoupon] = useState(false);
  const [couponConfig, setCouponConfig] = useState<CouponFormState>(DEFAULT_COUPON_CONFIG);

  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId) || templates[0];
  const selectedCampaign = campaigns.find((campaign) => campaign.id === selectedCampaignId) || campaigns[0];
  const selectedCampaignCoupon = selectedCampaign?.coupon;
  const isSystemScope = scope === "system";
  const isRestaurantScope = scope === "restaurant";
  const queryAudience = searchParams.get("audience");
  const queryPreset = searchParams.get("preset");
  const selectedPreset = queryPreset ? CAMPAIGN_PRESETS[queryPreset] : undefined;
  const supportedAudienceTypes: CampaignAudienceType[] = [
    "marketing_opt_in",
    "recent_customers",
    "inactive_customers",
    "first_order_no_repurchase",
    "high_ticket",
    "loyalty_balance",
    "purchased_category",
    "birthday",
  ];
  const initialAudience: CampaignAudienceType =
    supportedAudienceTypes.includes(queryAudience as CampaignAudienceType)
      ? queryAudience as CampaignAudienceType
      : "marketing_opt_in";
  const canEditSelected = Boolean(selectedTemplate && (isSystemScope || selectedTemplate.restaurant_id));
  const campaignTemplates = templates.filter((template) => template.category === "marketing" || template.template_key === "campaign_basic");
  const campaignUsagePercent = campaignEntitlement?.monthlyLimit
    ? Math.min(100, Math.round((campaignEntitlement.usedThisMonth / campaignEntitlement.monthlyLimit) * 100))
    : 0;
  const templateTitle = isSystemScope ? "Templates do Pubfy" : "Templates do restaurante";
  const templateDescription = isSystemScope
    ? "Modelos globais usados por e-mails do sistema, assinatura, contato e recibos."
    : "Modelos próprios deste restaurante. Templates globais do Pubfy ficam somente no dashboard de super admin.";
  const emptyTemplatesMessage = isSystemScope
    ? "Nenhum template global encontrado."
    : "Nenhum template próprio ainda. Os e-mails automáticos continuam usando os modelos padrão do Pubfy.";

  const load = async () => {
    setLoading(true);
    setLoaded(false);
    try {
      const [templateData, logData, contactData, campaignData] = await Promise.all([
        listEmailTemplates(scope),
        listEmailLogs(scope),
        listEmailContacts(scope),
        listEmailCampaigns(scope),
      ]);
      const categoryData = scope === "restaurant" ? await listEmailCampaignCategories(scope) : [];
      const entitlementData = scope === "restaurant" ? await getEmailCampaignEntitlement() : null;
      setTemplates(templateData);
      setLogs(logData);
      setContacts(contactData);
      setCampaignCategories(categoryData);
      setCampaigns(campaignData);
      setCampaignEntitlement(entitlementData);
      setLoaded(true);
      setSelectedTemplateId((currentId) => {
        if (currentId && templateData.some((template) => template.id === currentId)) return currentId;
        return templateData[0]?.id ?? null;
      });
      setSelectedCampaignId((currentId) => {
        if (currentId && campaignData.some((campaign) => campaign.id === currentId)) return currentId;
        return campaignData[0]?.id ?? null;
      });
    } catch (error) {
      console.error("Erro ao carregar operações de e-mail:", error);
      toast.error("Erro ao carregar operações de e-mail");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope]);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (!selectedCampaign?.id) {
      setCampaignMetrics(null);
      return;
    }
    void getEmailCampaignMetrics(selectedCampaign.id)
      .then(setCampaignMetrics)
      .catch((error) => {
        console.error("Erro ao carregar métricas da campanha:", error);
        setCampaignMetrics(null);
      });
  }, [selectedCampaign?.id]);

  useEffect(() => {
    setAudiencePreview(null);
  }, [selectedCampaign?.id]);

  useEffect(() => {
    if (!selectedCampaignCoupon) {
      setCouponConfig(DEFAULT_COUPON_CONFIG);
      return;
    }

    setCouponConfig({
      discountType: selectedCampaignCoupon.discount_type === "fixed" ? "fixed" : "percentage",
      discountValue: String(selectedCampaignCoupon.discount_value || 10),
      validDays: couponValidDaysFromNow(selectedCampaignCoupon.valid_until),
      minimumOrderValue: String(selectedCampaignCoupon.minimum_order_value ?? 0),
    });
  }, [selectedCampaignCoupon]);

  const updateSelected = (patch: Partial<EmailTemplate>) => {
    if (!selectedTemplate) return;
    setTemplates((current) =>
      current.map((template) =>
        template.id === selectedTemplate.id ? { ...template, ...patch } : template,
      ),
    );
  };

  const updateSelectedCampaign = (patch: Partial<EmailCampaign>) => {
    if (!selectedCampaign) return;
    setAudiencePreview(null);
    setCampaigns((current) =>
      current.map((campaign) =>
        campaign.id === selectedCampaign.id ? { ...campaign, ...patch } : campaign,
      ),
    );
  };

  const validateCampaignAudience = (campaign: EmailCampaign) => {
    if (campaign.audience_filter?.type === "purchased_category" && !campaign.audience_filter?.categoryId) {
      toast.error("Selecione uma categoria para esta campanha");
      return false;
    }
    return true;
  };

  const validateCampaignCoupon = (campaign: EmailCampaign) => {
    if (campaignContentUsesCoupon(campaign) && !campaign.coupon_id) {
      toast.error("Gere um cupom para usar a variável {{coupon}} nesta campanha");
      return false;
    }
    return true;
  };

  const validateCampaignBasics = (campaign: EmailCampaign) => {
    if (!campaign.name.trim() || !campaign.subject.trim() || !campaign.html_content.trim()) {
      toast.error("Informe nome, assunto e conteúdo da campanha");
      return false;
    }
    return true;
  };

  const handleCopyTemplate = async (templateKey: "order_confirmation" | "campaign_basic") => {
    setCopyingTemplate(templateKey);
    try {
      const copied = await copyAllowedEmailTemplate(templateKey);
      setTemplates((current) => {
        const exists = current.some((template) => template.id === copied.id);
        return exists
          ? current.map((template) => (template.id === copied.id ? copied : template))
          : [...current, copied];
      });
      setSelectedTemplateId(copied.id);
      toast.success("Template copiado para este restaurante");
    } catch (error) {
      console.error("Erro ao copiar template:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao copiar template");
    } finally {
      setCopyingTemplate(null);
    }
  };

  const handleSaveTemplate = async () => {
    if (!selectedTemplate) return;
    if (!canEditSelected) {
      toast.error("Templates globais do Pubfy devem ser gerenciados no dashboard de super admin.");
      return;
    }
    setSaving(true);
    try {
      const saved = await saveEmailTemplate(scope, selectedTemplate);
      setTemplates((current) =>
        current.map((template) => (template.id === saved.id ? saved : template)),
      );
      toast.success("Template salvo");
    } catch (error) {
      console.error("Erro ao salvar template:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao salvar template");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateCampaign = (preset = selectedPreset) => {
    const baseTemplate = campaignTemplates.find((template) => template.template_key === "campaign_basic") || campaignTemplates[0];
    const tempId = `new-${Date.now()}`;
    const campaign = {
      id: tempId,
      restaurant_id: "",
      template_id: baseTemplate?.id || null,
      name: preset?.name || "Nova campanha",
      subject: preset?.subject || baseTemplate?.subject || "",
      html_content: preset
        ? makeCampaignHtml(preset.subject, preset.message)
        : baseTemplate?.html_content || "<h2>{{title}}</h2><p>{{message}}</p>",
      text_content: preset?.message || baseTemplate?.text_content || "{{title}} - {{message}}",
      status: "draft",
      audience_filter: {
        type: preset?.audience || initialAudience,
        ...(preset?.days ? { days: preset.days } : {}),
        ...(preset?.audience === "purchased_category" && campaignCategories[0]?.id
          ? { categoryId: campaignCategories[0].id }
          : {}),
      },
      recipient_count: 0,
      sent_count: 0,
      failed_count: 0,
      last_error: null,
      coupon_id: null,
      coupon: null,
      created_at: new Date().toISOString(),
      sent_at: null,
    };
    setCampaigns((current) => [campaign, ...current]);
    setSelectedCampaignId(tempId);
    setActiveTab("campaigns");
  };

  const handleDuplicateCampaign = () => {
    if (!selectedCampaign) return;
    const tempId = `new-${Date.now()}`;
    const duplicated: EmailCampaign = {
      ...selectedCampaign,
      id: tempId,
      name: `Cópia - ${selectedCampaign.name}`,
      status: "draft",
      recipient_count: 0,
      sent_count: 0,
      failed_count: 0,
      last_error: null,
      coupon_id: null,
      coupon: null,
      sent_at: null,
      created_at: new Date().toISOString(),
    };

    setCampaigns((current) => [duplicated, ...current]);
    setSelectedCampaignId(tempId);
    setAudiencePreview(null);
    setActiveTab("campaigns");
    toast.success("Campanha duplicada como rascunho");
  };

  useEffect(() => {
    if (
      !isRestaurantScope ||
      !loaded ||
      autoCreatedCampaignRef.current ||
      searchParams.get("tab") !== "campaigns" ||
      searchParams.get("create") !== "1"
    ) {
      return;
    }

    autoCreatedCampaignRef.current = true;
    handleCreateCampaign();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignTemplates.length, isRestaurantScope, loaded, searchParams]);

  const handleApplyCampaignTemplate = (templateId: string) => {
    const template = templates.find((item) => item.id === templateId);
    if (!template) return;
    updateSelectedCampaign({
      template_id: template.id,
      subject: template.subject,
      html_content: template.html_content,
      text_content: template.text_content,
    });
  };

  const handleSaveCampaign = async () => {
    if (!selectedCampaign) return;
    if (!validateCampaignBasics(selectedCampaign)) return;
    if (!validateCampaignAudience(selectedCampaign)) return;
    setSavingCampaign(true);
    try {
      const campaignToSave = selectedCampaign.id.startsWith("new-")
        ? { ...selectedCampaign, id: undefined }
        : selectedCampaign;
      const saved = await saveEmailCampaign(campaignToSave);
      setCampaigns((current) =>
        current.map((campaign) => (campaign.id === selectedCampaign.id ? saved : campaign)),
      );
      setSelectedCampaignId(saved.id);
      toast.success("Campanha salva");
    } catch (error) {
      console.error("Erro ao salvar campanha:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao salvar campanha");
    } finally {
      setSavingCampaign(false);
    }
  };

  const persistSelectedCampaignForDispatch = async () => {
    if (!selectedCampaign) return null;
    if (selectedCampaign.status === "sent") return selectedCampaign;

    const campaignToSave = selectedCampaign.id.startsWith("new-")
      ? { ...selectedCampaign, id: undefined }
      : selectedCampaign;
    const saved = await saveEmailCampaign(campaignToSave);
    setCampaigns((current) =>
      current.map((campaign) => (campaign.id === selectedCampaign.id ? saved : campaign)),
    );
    setSelectedCampaignId(saved.id);
    return saved;
  };

  const handleGenerateCampaignCoupon = async () => {
    if (!selectedCampaign) return;
    if (selectedCampaign.status === "sent") {
      toast.error("Campanhas enviadas não podem receber novo cupom");
      return;
    }

    const discountValue = normalizeNumber(couponConfig.discountValue, 0);
    const validDays = Math.trunc(normalizeNumber(couponConfig.validDays, 30));
    const minimumOrderValue = normalizeNumber(couponConfig.minimumOrderValue, 0);

    if (couponConfig.discountType === "percentage" && (discountValue <= 0 || discountValue > 80)) {
      toast.error("Percentual de desconto deve ficar entre 0,01 e 80");
      return;
    }
    if (couponConfig.discountType === "fixed" && discountValue <= 0) {
      toast.error("Valor de desconto deve ser maior que zero");
      return;
    }
    if (validDays < 1 || validDays > 365) {
      toast.error("Validade deve ficar entre 1 e 365 dias");
      return;
    }
    if (minimumOrderValue < 0) {
      toast.error("Pedido mínimo não pode ser negativo");
      return;
    }

    setGeneratingCoupon(true);
    try {
      let campaign = selectedCampaign;
      if (campaign.id.startsWith("new-")) {
        const saved = await saveEmailCampaign({ ...campaign, id: undefined });
        setCampaigns((current) =>
          current.map((item) => (item.id === campaign.id ? saved : item)),
        );
        setSelectedCampaignId(saved.id);
        campaign = saved;
      }

      const coupon = await generateEmailCampaignCoupon(campaign.id, {
        discountType: couponConfig.discountType,
        discountValue,
        validDays,
        minimumOrderValue,
      });
      setCampaigns((current) =>
        current.map((item) =>
          item.id === campaign.id
            ? {
                ...item,
                coupon_id: coupon.id,
                coupon,
                html_content: item.html_content.includes("{{coupon}}")
                  ? item.html_content
                  : `${item.html_content}<p><strong>Cupom: {{coupon}}</strong></p>`,
                text_content: item.text_content?.includes("{{coupon}}")
                  ? item.text_content
                  : `${item.text_content || ""}\nCupom: {{coupon}}`,
              }
            : item,
        ),
      );
      toast.success(`Cupom ${coupon.code} vinculado à campanha`);
    } catch (error) {
      console.error("Erro ao gerar cupom da campanha:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao gerar cupom");
    } finally {
      setGeneratingCoupon(false);
    }
  };

  const handlePreviewCampaignAudience = async () => {
    if (!selectedCampaign) return;
    if (!validateCampaignAudience(selectedCampaign)) return;

    setPreviewingAudience(true);
    try {
      const preview = await previewEmailCampaignAudience(selectedCampaign);
      setAudiencePreview(preview);
      toast.success(`${preview.recipientCount} contato(s) encontrados para este público`);
    } catch (error) {
      console.error("Erro ao calcular prévia do público:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao calcular público");
    } finally {
      setPreviewingAudience(false);
    }
  };

  const handleSendCampaign = async () => {
    if (!selectedCampaign) return;
    if (selectedCampaign.id.startsWith("new-")) {
      toast.error("Salve a campanha antes de enviar");
      return;
    }
    if (!validateCampaignAudience(selectedCampaign)) return;
    if (!validateCampaignCoupon(selectedCampaign)) return;
    setSendingCampaign(true);
    try {
      const result = await sendEmailCampaign(selectedCampaign.id);
      toast.success(`Campanha enviada para ${result.sent} contato(s)`);
      await load();
    } catch (error) {
      console.error("Erro ao enviar campanha:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao enviar campanha");
      await load();
    } finally {
      setSendingCampaign(false);
    }
  };

  const handleSendCampaignTest = async () => {
    if (!selectedCampaign) return;
    const email = campaignTestEmail.trim().toLowerCase();
    if (!email) {
      toast.error("Informe um e-mail para teste");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Informe um e-mail válido para teste");
      return;
    }
    if (!validateCampaignBasics(selectedCampaign)) return;
    if (!validateCampaignCoupon(selectedCampaign)) return;

    setSendingCampaignTest(true);
    try {
      const savedCampaign = await persistSelectedCampaignForDispatch();
      if (!savedCampaign) return;
      await sendEmailCampaignTest(savedCampaign.id, email);
      toast.success("Teste da campanha enviado");
    } catch (error) {
      console.error("Erro ao enviar teste da campanha:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao enviar teste da campanha");
    } finally {
      setSendingCampaignTest(false);
    }
  };

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <TabsList className="h-auto flex-wrap justify-start">
          <TabsTrigger value="settings">Configuração</TabsTrigger>
          <TabsTrigger value="automations">Automações</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="campaigns">Campanhas</TabsTrigger>
        </TabsList>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Atualizar
        </Button>
      </div>

      <TabsContent value="settings">
        <EmailIntegrationForm scope={scope} />
      </TabsContent>

      <TabsContent value="automations">
        {!isRestaurantScope ? (
          <Card>
            <CardHeader>
              <CardTitle>Campanhas automáticas</CardTitle>
              <CardDescription>
                Gatilhos comerciais são configurados dentro de cada restaurante.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4 lg:grid-cols-[1fr,280px]">
              <Card>
                <CardHeader>
                  <CardTitle>Campanhas automáticas</CardTitle>
                  <CardDescription>
                    Gatilhos comerciais prontos para criar campanhas de recompra usando a base capturada no Pubfy.
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Base apta</CardTitle>
                  <CardDescription>Contatos com opt-in de marketing.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold">
                    {contacts.filter((contact) => contact.accepts_marketing && !contact.unsubscribed_at).length}
                  </div>
                </CardContent>
              </Card>
            </div>

            {!campaignEntitlement?.campaignsEnabled && (
              <Alert>
                <AlertDescription>
                  Campanhas automáticas ficam reservadas para planos avançados. Configure o domínio de envio e confirme o plano antes de disparar campanhas.
                </AlertDescription>
              </Alert>
            )}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {CAMPAIGN_AUTOMATIONS.map((automation) => {
                const Icon = automation.icon;
                const preset = CAMPAIGN_PRESETS[automation.key];
                return (
                  <Card key={automation.key} className="flex h-full flex-col">
                    <CardHeader className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
                          <Icon className="h-5 w-5" />
                        </div>
                        <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                          Pronto
                        </Badge>
                      </div>
                      <div>
                        <CardTitle className="text-base">{automation.title}</CardTitle>
                        <CardDescription className="mt-1 min-h-12">{automation.description}</CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent className="mt-auto space-y-4">
                      <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                        Público inicial: <span className="font-medium text-foreground">{automation.audience}</span>
                      </div>
                      <Button
                        type="button"
                        className="w-full"
                        onClick={() => handleCreateCampaign(preset)}
                        disabled={!campaignEntitlement?.campaignsEnabled}
                      >
                        Criar campanha
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </TabsContent>

      <TabsContent value="templates">
        <div className="grid gap-6 lg:grid-cols-[280px,1fr]">
          <Card>
            <CardHeader>
              <CardTitle>{templateTitle}</CardTitle>
              <CardDescription>{templateDescription}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {isRestaurantScope && (
                <div className="mb-3 space-y-2 rounded-md border bg-muted/30 p-3">
                  <p className="text-xs font-medium text-muted-foreground">Modelos permitidos do Pubfy</p>
                  <div className="grid gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyTemplate("order_confirmation")}
                      disabled={copyingTemplate === "order_confirmation"}
                      className="justify-start"
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Pedido confirmado
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyTemplate("campaign_basic")}
                      disabled={copyingTemplate === "campaign_basic"}
                      className="justify-start"
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Campanha simples
                    </Button>
                  </div>
                </div>
              )}
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => setSelectedTemplateId(template.id)}
                  className={`w-full rounded-md border p-3 text-left text-sm transition-colors ${
                    selectedTemplate?.id === template.id ? "border-primary bg-primary/5" : "hover:bg-muted"
                  }`}
                >
                  <div className="font-medium">{template.name}</div>
                  <div className="text-xs text-muted-foreground">{template.template_key}</div>
                  <Badge variant="outline" className="mt-2 border-slate-200 bg-slate-50 text-slate-700">
                    {template.category}
                  </Badge>
                </button>
              ))}
              {!templates.length && (
                <EmptyState
                  icon={FileText}
                  title="Nenhum template disponível"
                  description={emptyTemplatesMessage}
                  compact
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Editor</CardTitle>
              <CardDescription>Use variáveis no formato {"{{variavel}}"}. O conteúdo é escapado no envio.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedTemplate ? (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Nome</Label>
                      <Input value={selectedTemplate.name} onChange={(event) => updateSelected({ name: event.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Chave</Label>
                      <Input value={selectedTemplate.template_key} disabled />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Assunto</Label>
                    <Input value={selectedTemplate.subject} onChange={(event) => updateSelected({ subject: event.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>HTML</Label>
                    <Textarea
                      rows={10}
                      value={selectedTemplate.html_content}
                      onChange={(event) => updateSelected({ html_content: event.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Texto simples</Label>
                    <Textarea
                      rows={4}
                      value={selectedTemplate.text_content || ""}
                      onChange={(event) => updateSelected({ text_content: event.target.value })}
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={handleSaveTemplate} disabled={saving || !canEditSelected}>
                      <Save className="mr-2 h-4 w-4" />
                      Salvar template
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Selecione um template.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="logs">
        <Card>
          <CardHeader>
            <CardTitle>Logs de envio</CardTitle>
            <CardDescription>Status enviado pelo Pubfy e atualizado por webhooks do Resend.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {logs.map((log) => (
              <div key={log.id} className="rounded-md border p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">{log.subject}</p>
                    <p className="text-sm text-muted-foreground">{log.recipient_email}</p>
                  </div>
                  <Badge>{STATUS_LABEL[log.status] || log.status}</Badge>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {new Date(log.created_at).toLocaleString("pt-BR")} · {log.template_key || "sem template"}
                  {log.error_message && <span className="text-destructive"> · {log.error_message}</span>}
                  {log.provider_message_id && <span> · Resend: {log.provider_message_id}</span>}
                </div>
              </div>
            ))}
            {!logs.length && (
              <EmptyState
                icon={Inbox}
                title="Nenhum envio registrado"
                description="Os envios aparecerão aqui assim que e-mails forem processados pelo Pubfy."
                compact
              />
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="campaigns">
        {!isRestaurantScope ? (
          <Card>
            <CardHeader>
              <CardTitle>Campanhas dos restaurantes</CardTitle>
              <CardDescription>
                Campanhas comerciais são gerenciadas dentro de cada restaurante. O super admin acompanha os envios pela aba de logs.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Plano</CardTitle>
                  <CardDescription>{campaignEntitlement?.planName || "Carregando..."}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Badge
                    variant="outline"
                    className={
                      campaignEntitlement?.campaignsEnabled
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-amber-200 bg-amber-50 text-amber-700"
                    }
                  >
                    {campaignEntitlement?.campaignsEnabled ? "Campanhas habilitadas" : "Recurso avançado"}
                  </Badge>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Uso mensal</span>
                      <span>
                        {campaignEntitlement?.usedThisMonth || 0}/{campaignEntitlement?.monthlyLimit || 0}
                      </span>
                    </div>
                    <Progress value={campaignUsagePercent} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Até {campaignEntitlement?.contactLimit || 0} contatos por campanha neste plano.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Público</CardTitle>
                  <CardDescription>Contatos capturados por pedidos e opt-in.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-2xl font-semibold">
                    {contacts.filter((contact) => contact.accepts_marketing && !contact.unsubscribed_at).length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    contatos aptos para marketing de {contacts.length} capturados.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Métricas</CardTitle>
                  <CardDescription>{selectedCampaign?.name || "Nenhuma campanha selecionada"}</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="font-semibold">{campaignMetrics?.sent || selectedCampaign?.sent_count || 0}</span> enviados</div>
                  <div><span className="font-semibold">{campaignMetrics?.delivered || 0}</span> entregues</div>
                  <div><span className="font-semibold">{campaignMetrics?.opened || 0}</span> abertos</div>
                  <div><span className="font-semibold">{campaignMetrics?.clicked || 0}</span> cliques</div>
                  <div><span className="font-semibold">{campaignMetrics?.bounced || 0}</span> rejeitados</div>
                  <div><span className="font-semibold">{campaignMetrics?.failed || selectedCampaign?.failed_count || 0}</span> falhas</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Resultado</CardTitle>
                  <CardDescription>{selectedCampaign?.coupon?.code || "Sem cupom vinculado"}</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="font-semibold">{campaignMetrics?.ordersCount || 0}</span> pedidos
                  </div>
                  <div>
                    <span className="font-semibold">{campaignMetrics?.finalizedOrdersCount || 0}</span> finalizados
                  </div>
                  <div className="col-span-2">
                    <span className="font-semibold">{money.format(campaignMetrics?.attributedRevenue || 0)}</span> receita atribuida
                  </div>
                  <div className="col-span-2 text-xs text-muted-foreground">
                    {money.format(campaignMetrics?.discountAmount || 0)} em descontos concedidos
                  </div>
                </CardContent>
              </Card>
            </div>

            {!campaignEntitlement?.campaignsEnabled && (
              <Alert>
                <AlertDescription>
                  Campanhas por e-mail ficam reservadas para planos avançados. O restaurante ainda pode usar e-mails transacionais, como confirmação de pedido.
                </AlertDescription>
              </Alert>
            )}

            <div className="grid gap-6 xl:grid-cols-[320px,1fr]">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <CardTitle>Campanhas</CardTitle>
                      <CardDescription>Rascunhos e envios recentes.</CardDescription>
                    </div>
                    <Button size="icon" variant="outline" onClick={handleCreateCampaign} disabled={!campaignEntitlement?.campaignsEnabled}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {campaigns.map((campaign) => (
                    <button
                      key={campaign.id}
                      onClick={() => setSelectedCampaignId(campaign.id)}
                      className={`w-full rounded-md border p-3 text-left text-sm transition-colors ${
                        selectedCampaign?.id === campaign.id ? "border-primary bg-primary/5" : "hover:bg-muted"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-medium">{campaign.name}</div>
                          <div className="line-clamp-1 text-xs text-muted-foreground">{campaign.subject}</div>
                        </div>
                        <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
                          {CAMPAIGN_STATUS_LABEL[campaign.status] || campaign.status}
                        </Badge>
                      </div>
                    </button>
                  ))}
                  {!campaigns.length && (
                    <EmptyState
                      icon={Mail}
                      title="Nenhuma campanha criada"
                      description="Crie a primeira campanha quando o plano permitir e houver contatos com opt-in."
                      compact
                    />
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Editor de campanha</CardTitle>
                  <CardDescription>Envios respeitam opt-in, descadastro e limite comercial do plano.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedCampaign ? (
                    <>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Nome interno</Label>
                          <Input
                            value={selectedCampaign.name}
                            onChange={(event) => updateSelectedCampaign({ name: event.target.value })}
                            disabled={selectedCampaign.status === "sent"}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Template base</Label>
                          <Select
                            value={selectedCampaign.template_id || "none"}
                            onValueChange={(value) => {
                              if (value !== "none") handleApplyCampaignTemplate(value);
                            }}
                            disabled={selectedCampaign.status === "sent"}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecionar template" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Sem template</SelectItem>
                              {campaignTemplates.map((template) => (
                                <SelectItem key={template.id} value={template.id}>
                                  {template.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Público</Label>
                          <Select
                            value={selectedCampaign.audience_filter?.type || "marketing_opt_in"}
                            onValueChange={(value) =>
                              updateSelectedCampaign({
                                audience_filter: {
                                  ...selectedCampaign.audience_filter,
                                  type: value as CampaignAudienceType,
                                },
                              })
                            }
                            disabled={selectedCampaign.status === "sent"}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="marketing_opt_in">Todos com opt-in</SelectItem>
                              <SelectItem value="recent_customers">Clientes recentes</SelectItem>
                              <SelectItem value="inactive_customers">Clientes inativos</SelectItem>
                              <SelectItem value="first_order_no_repurchase">Primeira compra sem recompra</SelectItem>
                              <SelectItem value="high_ticket">Alto ticket</SelectItem>
                              <SelectItem value="loyalty_balance">Saldo de fidelidade</SelectItem>
                              <SelectItem value="purchased_category">Comprou categoria</SelectItem>
                              <SelectItem value="birthday">Aniversariantes</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Janela em dias</Label>
                          <Input
                            type="number"
                            min={1}
                            value={selectedCampaign.audience_filter?.days || 90}
                            onChange={(event) =>
                              updateSelectedCampaign({
                                audience_filter: {
                                  ...selectedCampaign.audience_filter,
                                  days: Number(event.target.value) || 90,
                                },
                              })
                            }
                            disabled={selectedCampaign.status === "sent"}
                          />
                        </div>
                      </div>

                      {selectedCampaign.audience_filter?.type === "purchased_category" && (
                        <div className="space-y-2">
                          <Label>Categoria comprada</Label>
                          <Select
                            value={selectedCampaign.audience_filter?.categoryId || ""}
                            onValueChange={(value) =>
                              updateSelectedCampaign({
                                audience_filter: {
                                  ...selectedCampaign.audience_filter,
                                  categoryId: value,
                                },
                              })
                            }
                            disabled={selectedCampaign.status === "sent" || campaignCategories.length === 0}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecionar categoria" />
                            </SelectTrigger>
                            <SelectContent>
                              {campaignCategories.map((category) => (
                                <SelectItem key={category.id} value={category.id}>
                                  {category.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {campaignCategories.length === 0 && (
                            <p className="text-xs text-muted-foreground">
                              Cadastre categorias de produtos antes de usar este público.
                            </p>
                          )}
                        </div>
                      )}

                      <div className="rounded-md border bg-muted/20 p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm font-medium">
                              <Users className="h-4 w-4 text-primary" />
                              Prévia do público
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {audiencePreview
                                ? `${audiencePreview.recipientCount} contato(s) dentro do limite de ${audiencePreview.cappedAt}.`
                                : "Calcule os contatos antes do envio."}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handlePreviewCampaignAudience}
                            disabled={previewingAudience || !campaignEntitlement?.campaignsEnabled}
                          >
                            <RefreshCw className={`mr-2 h-4 w-4 ${previewingAudience ? "animate-spin" : ""}`} />
                            Atualizar prévia
                          </Button>
                        </div>

                        {audiencePreview && (
                          <div className="mt-4 space-y-3">
                            <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                              <div className="rounded-md border bg-background px-3 py-2">
                                <span className="block font-medium text-foreground">{audiencePreview.recipientCount}</span>
                                encontrados
                              </div>
                              <div className="rounded-md border bg-background px-3 py-2">
                                <span className="block font-medium text-foreground">{audiencePreview.remainingThisMonth}</span>
                                saldo mensal
                              </div>
                              <div className="rounded-md border bg-background px-3 py-2">
                                <span className="block font-medium text-foreground">{audiencePreview.contactLimit}</span>
                                limite por campanha
                              </div>
                            </div>

                            {audiencePreview.sample.length > 0 ? (
                              <div className="grid gap-2 md:grid-cols-2">
                                {audiencePreview.sample.map((contact) => (
                                  <div key={contact.id} className="rounded-md border bg-background px-3 py-2 text-xs">
                                    <div className="font-medium text-foreground">{contact.name || contact.email}</div>
                                    <div className="text-muted-foreground">{contact.email}</div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground">
                                Nenhum contato encontrado para este recorte.
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="space-y-4 rounded-md border bg-muted/20 p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm font-medium">
                              <TicketPercent className="h-4 w-4 text-primary" />
                              Cupom rastreável
                            </div>
                            {selectedCampaign.coupon ? (
                              <>
                                <div className="flex flex-wrap items-center gap-2">
                                  <code className="rounded bg-background px-2 py-1 text-sm font-semibold">
                                    {selectedCampaign.coupon.code}
                                  </code>
                                  <Badge variant="outline">
                                    {formatCouponDiscount(selectedCampaign)}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Valido ate{" "}
                                  {selectedCampaign.coupon.valid_until
                                    ? new Date(selectedCampaign.coupon.valid_until).toLocaleDateString("pt-BR")
                                    : "sem data final"}
                                </p>
                              </>
                            ) : (
                              <p className="text-xs text-muted-foreground">
                                Gere um cupom para identificar pedidos vindos desta campanha.
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            {selectedCampaign.coupon && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => navigator.clipboard.writeText(selectedCampaign.coupon?.code || "")}
                              >
                                <Copy className="mr-2 h-4 w-4" />
                                Copiar
                              </Button>
                            )}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleGenerateCampaignCoupon}
                              disabled={generatingCoupon || selectedCampaign.status === "sent"}
                            >
                              <TicketPercent className="mr-2 h-4 w-4" />
                              {selectedCampaign.coupon ? "Atualizar cupom" : "Gerar cupom"}
                            </Button>
                          </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-[1fr,1fr,1fr,1fr]">
                          <div className="space-y-2">
                            <Label>Tipo</Label>
                            <Select
                              value={couponConfig.discountType}
                              onValueChange={(value) =>
                                setCouponConfig((current) => ({
                                  ...current,
                                  discountType: value as EmailCampaignCouponConfig["discountType"],
                                }))
                              }
                              disabled={selectedCampaign.status === "sent"}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="percentage">Percentual</SelectItem>
                                <SelectItem value="fixed">Valor fixo</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>{couponConfig.discountType === "percentage" ? "Desconto %" : "Desconto R$"}</Label>
                            <Input
                              type="number"
                              min={0}
                              step={couponConfig.discountType === "percentage" ? "1" : "0.01"}
                              max={couponConfig.discountType === "percentage" ? 80 : undefined}
                              value={couponConfig.discountValue}
                              onChange={(event) =>
                                setCouponConfig((current) => ({ ...current, discountValue: event.target.value }))
                              }
                              disabled={selectedCampaign.status === "sent"}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Validade</Label>
                            <Input
                              type="number"
                              min={1}
                              max={365}
                              value={couponConfig.validDays}
                              onChange={(event) =>
                                setCouponConfig((current) => ({ ...current, validDays: event.target.value }))
                              }
                              disabled={selectedCampaign.status === "sent"}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Pedido mínimo</Label>
                            <Input
                              type="number"
                              min={0}
                              step="0.01"
                              value={couponConfig.minimumOrderValue}
                              onChange={(event) =>
                                setCouponConfig((current) => ({
                                  ...current,
                                  minimumOrderValue: event.target.value,
                                }))
                              }
                              disabled={selectedCampaign.status === "sent"}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Assunto</Label>
                        <Input
                          value={selectedCampaign.subject}
                          onChange={(event) => updateSelectedCampaign({ subject: event.target.value })}
                          disabled={selectedCampaign.status === "sent"}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>HTML da campanha</Label>
                        <Textarea
                          rows={10}
                          value={selectedCampaign.html_content}
                          onChange={(event) => updateSelectedCampaign({ html_content: event.target.value })}
                          disabled={selectedCampaign.status === "sent"}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Texto simples</Label>
                        <Textarea
                          rows={4}
                          value={selectedCampaign.text_content || ""}
                          onChange={(event) => updateSelectedCampaign({ text_content: event.target.value })}
                          disabled={selectedCampaign.status === "sent"}
                        />
                      </div>

                      {selectedCampaign.last_error && (
                        <Alert variant="destructive">
                          <AlertDescription>{selectedCampaign.last_error}</AlertDescription>
                        </Alert>
                      )}

                      <div className="rounded-md border bg-muted/20 p-4">
                        <div className="grid gap-3 md:grid-cols-[1fr,auto] md:items-end">
                          <div className="space-y-2">
                            <Label>E-mail de teste</Label>
                            <Input
                              type="email"
                              placeholder="email@restaurante.com"
                              value={campaignTestEmail}
                              onChange={(event) => setCampaignTestEmail(event.target.value)}
                            />
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleSendCampaignTest}
                            disabled={sendingCampaignTest || !campaignEntitlement?.campaignsEnabled}
                          >
                            <Send className="mr-2 h-4 w-4" />
                            {sendingCampaignTest ? "Enviando..." : "Enviar teste"}
                          </Button>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleDuplicateCampaign}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Duplicar
                        </Button>
                        <Button
                          variant="outline"
                          onClick={handleSaveCampaign}
                          disabled={savingCampaign || selectedCampaign.status === "sent"}
                        >
                          <Save className="mr-2 h-4 w-4" />
                          Salvar campanha
                        </Button>
                        <Button
                          onClick={handleSendCampaign}
                          disabled={
                            sendingCampaign ||
                            selectedCampaign.status === "sent" ||
                            !campaignEntitlement?.campaignsEnabled ||
                            !contacts.some((contact) => contact.accepts_marketing && !contact.unsubscribed_at)
                          }
                        >
                          <Send className="mr-2 h-4 w-4" />
                          Enviar campanha
                        </Button>
                      </div>
                    </>
                  ) : (
                    <EmptyState
                      icon={Mail}
                      title="Selecione uma campanha"
                      description="Escolha uma campanha existente ou crie uma nova para editar conteúdo, público e envio."
                      className="min-h-[260px]"
                    />
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Contatos</CardTitle>
                <CardDescription>Base alimentada por pedidos com e-mail e autorização de marketing.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {contacts.slice(0, 12).map((contact) => (
                  <div key={contact.id} className="rounded-md border p-3 text-sm">
                    <div className="font-medium">{contact.name || contact.email}</div>
                    <div className="text-muted-foreground">{contact.email}</div>
                    <Badge
                      variant="outline"
                      className={
                        contact.accepts_marketing && !contact.unsubscribed_at
                          ? "mt-2 border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "mt-2 border-slate-200 bg-slate-50 text-slate-700"
                      }
                    >
                      {contact.unsubscribed_at
                        ? "Descadastrado"
                        : contact.accepts_marketing
                          ? "Aceita marketing"
                          : "Sem opt-in"}
                    </Badge>
                  </div>
                ))}
                {!contacts.length && (
                  <div className="md:col-span-2 xl:col-span-3">
                    <EmptyState
                      icon={Users}
                      title="Nenhum contato capturado"
                      description="Contatos com e-mail e autorização de marketing aparecerão aqui após novos pedidos."
                      compact
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
