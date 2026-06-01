import { useEffect, useRef, useState } from "react";
import { Copy, FileText, Inbox, Mail, Plus, RefreshCw, Save, Send, Users } from "lucide-react";
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
  EmailCampaignMetrics,
  EmailSendLog,
  EmailTemplate,
  getEmailCampaignEntitlement,
  getEmailCampaignMetrics,
  listEmailCampaigns,
  listEmailContacts,
  listEmailLogs,
  listEmailTemplates,
  saveEmailCampaign,
  saveEmailTemplate,
  EmailCampaign,
  sendEmailCampaign,
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

type CampaignAudienceType = "marketing_opt_in" | "recent_customers" | "inactive_customers";

type CampaignPreset = {
  name: string;
  subject: string;
  message: string;
  audience: CampaignAudienceType;
  days?: number;
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
    audience: "recent_customers",
    days: 30,
  },
  high_ticket: {
    name: "Clientes VIP",
    subject: "Um mimo para clientes especiais",
    message: "Voce esta entre nossos clientes especiais. Temos uma oferta pensada para voce.",
    audience: "marketing_opt_in",
  },
  loyalty_balance: {
    name: "Saldo de fidelidade",
    subject: "Voce tem beneficio esperando",
    message: "Seu saldo de fidelidade pode deixar o proximo pedido ainda melhor.",
    audience: "marketing_opt_in",
  },
};

const makeCampaignHtml = (title: string, message: string) =>
  `<h2>${title}</h2><p>${message}</p>`;

export function EmailOperationsPanel({ scope }: Props) {
  const [searchParams] = useSearchParams();
  const autoCreatedCampaignRef = useRef(false);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [logs, setLogs] = useState<EmailSendLog[]>([]);
  const [contacts, setContacts] = useState<EmailContact[]>([]);
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [campaignEntitlement, setCampaignEntitlement] = useState<EmailCampaignEntitlement | null>(null);
  const [campaignMetrics, setCampaignMetrics] = useState<EmailCampaignMetrics | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copyingTemplate, setCopyingTemplate] = useState<string | null>(null);
  const [savingCampaign, setSavingCampaign] = useState(false);
  const [sendingCampaign, setSendingCampaign] = useState(false);

  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId) || templates[0];
  const selectedCampaign = campaigns.find((campaign) => campaign.id === selectedCampaignId) || campaigns[0];
  const isSystemScope = scope === "system";
  const isRestaurantScope = scope === "restaurant";
  const queryTab = searchParams.get("tab");
  const initialTab = queryTab === "campaigns" || queryTab === "templates" || queryTab === "logs"
    ? queryTab
    : "settings";
  const queryAudience = searchParams.get("audience");
  const queryPreset = searchParams.get("preset");
  const selectedPreset = queryPreset ? CAMPAIGN_PRESETS[queryPreset] : undefined;
  const initialAudience: CampaignAudienceType =
    queryAudience === "recent_customers" || queryAudience === "inactive_customers"
      ? queryAudience
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
      const entitlementData = scope === "restaurant" ? await getEmailCampaignEntitlement() : null;
      setTemplates(templateData);
      setLogs(logData);
      setContacts(contactData);
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
    setCampaigns((current) =>
      current.map((campaign) =>
        campaign.id === selectedCampaign.id ? { ...campaign, ...patch } : campaign,
      ),
    );
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

  const handleCreateCampaign = () => {
    const baseTemplate = campaignTemplates.find((template) => template.template_key === "campaign_basic") || campaignTemplates[0];
    const tempId = `new-${Date.now()}`;
    const campaign = {
      id: tempId,
      restaurant_id: "",
      template_id: baseTemplate?.id || null,
      name: selectedPreset?.name || "Nova campanha",
      subject: selectedPreset?.subject || baseTemplate?.subject || "",
      html_content: selectedPreset
        ? makeCampaignHtml(selectedPreset.subject, selectedPreset.message)
        : baseTemplate?.html_content || "<h2>{{title}}</h2><p>{{message}}</p>",
      text_content: selectedPreset?.message || baseTemplate?.text_content || "{{title}} - {{message}}",
      status: "draft",
      audience_filter: {
        type: selectedPreset?.audience || initialAudience,
        ...(selectedPreset?.days ? { days: selectedPreset.days } : {}),
      },
      recipient_count: 0,
      sent_count: 0,
      failed_count: 0,
      last_error: null,
      created_at: new Date().toISOString(),
      sent_at: null,
    };
    setCampaigns((current) => [campaign, ...current]);
    setSelectedCampaignId(tempId);
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
    if (!selectedCampaign.name.trim() || !selectedCampaign.subject.trim() || !selectedCampaign.html_content.trim()) {
      toast.error("Informe nome, assunto e conteúdo da campanha");
      return;
    }
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

  const handleSendCampaign = async () => {
    if (!selectedCampaign) return;
    if (selectedCampaign.id.startsWith("new-")) {
      toast.error("Salve a campanha antes de enviar");
      return;
    }
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

  return (
    <Tabs defaultValue={initialTab} className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <TabsList className="h-auto flex-wrap justify-start">
          <TabsTrigger value="settings">Configuração</TabsTrigger>
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
            <div className="grid gap-4 lg:grid-cols-3">
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
                          {campaign.status}
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
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Dias para clientes recentes</Label>
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

                      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
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
