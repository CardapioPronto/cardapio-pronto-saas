import { useEffect, useState } from "react";
import { RefreshCw, Save } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { EmailIntegrationScope } from "@/services/emailIntegrationService";
import {
  EmailContact,
  EmailSendLog,
  EmailTemplate,
  listEmailCampaigns,
  listEmailContacts,
  listEmailLogs,
  listEmailTemplates,
  saveEmailTemplate,
  EmailCampaign,
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

export function EmailOperationsPanel({ scope }: Props) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [logs, setLogs] = useState<EmailSendLog[]>([]);
  const [contacts, setContacts] = useState<EmailContact[]>([]);
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId) || templates[0];

  const load = async () => {
    setLoading(true);
    try {
      const [templateData, logData, contactData, campaignData] = await Promise.all([
        listEmailTemplates(scope),
        listEmailLogs(scope),
        listEmailContacts(scope),
        listEmailCampaigns(scope),
      ]);
      setTemplates(templateData);
      setLogs(logData);
      setContacts(contactData);
      setCampaigns(campaignData);
      if (!selectedTemplateId && templateData[0]) setSelectedTemplateId(templateData[0].id);
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

  const updateSelected = (patch: Partial<EmailTemplate>) => {
    if (!selectedTemplate) return;
    setTemplates((current) =>
      current.map((template) =>
        template.id === selectedTemplate.id ? { ...template, ...patch } : template,
      ),
    );
  };

  const handleSaveTemplate = async () => {
    if (!selectedTemplate) return;
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

  return (
    <Tabs defaultValue="settings" className="space-y-6">
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
              <CardTitle>Templates</CardTitle>
              <CardDescription>Modelos transacionais e comerciais.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
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
                  <Badge variant="outline" className="mt-2">{template.category}</Badge>
                </button>
              ))}
              {!templates.length && <p className="text-sm text-muted-foreground">Nenhum template encontrado.</p>}
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
                    <Button onClick={handleSaveTemplate} disabled={saving}>
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
            {!logs.length && <p className="text-sm text-muted-foreground">Nenhum envio registrado ainda.</p>}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="campaigns">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Contatos</CardTitle>
              <CardDescription>Base inicial alimentada por pedidos com e-mail e opt-in.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {contacts.map((contact) => (
                <div key={contact.id} className="rounded-md border p-3 text-sm">
                  <div className="font-medium">{contact.name || contact.email}</div>
                  <div className="text-muted-foreground">{contact.email}</div>
                  <Badge variant={contact.accepts_marketing ? "default" : "outline"} className="mt-2">
                    {contact.accepts_marketing ? "Aceita marketing" : "Sem opt-in"}
                  </Badge>
                </div>
              ))}
              {!contacts.length && <p className="text-sm text-muted-foreground">Nenhum contato capturado ainda.</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Campanhas</CardTitle>
              <CardDescription>Estrutura pronta para campanhas comerciais dos restaurantes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {campaigns.map((campaign) => (
                <div key={campaign.id} className="rounded-md border p-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-medium">{campaign.name}</div>
                      <div className="text-muted-foreground">{campaign.subject}</div>
                    </div>
                    <Badge variant="outline">{campaign.status}</Badge>
                  </div>
                </div>
              ))}
              {!campaigns.length && (
                <p className="text-sm text-muted-foreground">
                  O disparo de campanhas em massa entra no próximo passo, já usando contatos, templates e logs criados aqui.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </TabsContent>
    </Tabs>
  );
}
