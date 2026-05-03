import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import {
  Plus, Trash2, Save, Loader2, Bot, Shield, Clock, Users,
  AlertTriangle, CheckCircle2, ArrowRightLeft, Webhook, Info,
} from "lucide-react";
import { useWhatsAppInstances } from "@/hooks/useWhatsAppInstances";
import { AutomationService } from "@/services/atendimento/automationService";
import { AutomationSettings, AIHandoffRule, HandoffRuleType } from "@/types/atendimento";
import { usePermissionsV2 } from "@/hooks/usePermissionsV2";
import { toast } from "sonner";

const WEEKDAYS = [
  { key: "mon", label: "Segunda" },
  { key: "tue", label: "Terça" },
  { key: "wed", label: "Quarta" },
  { key: "thu", label: "Quinta" },
  { key: "fri", label: "Sexta" },
  { key: "sat", label: "Sábado" },
  { key: "sun", label: "Domingo" },
] as const;

type DaySchedule = { enabled: boolean; start: string; end: string };
type BusinessHoursMap = Record<string, DaySchedule>;

const DEFAULT_HOURS: BusinessHoursMap = Object.fromEntries(
  WEEKDAYS.map(d => [d.key, { enabled: d.key !== "sun", start: "08:00", end: "22:00" }])
);

const N8N_ENV_VARS = [
  "EVOLUTION_API_URL",
  "EVOLUTION_API_KEY",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "PUBLIC_SITE_URL",
];

const EDGE_ENV_VARS = [
  "EVOLUTION_API_URL",
  "EVOLUTION_API_KEY",
  "N8N_WEBHOOK_URL",
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];

const AtendimentoAutomacao = () => {
  const { instances, loading: instancesLoading } = useWhatsAppInstances();
  const { hasPermission, isOwner, isSuperAdmin, loading: permissionsLoading } = usePermissionsV2();
  const canConfigure = isOwner() || isSuperAdmin() || hasPermission("whatsapp_configure_automation");

  const [selectedInstanceId, setSelectedInstanceId] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // --- form state ---
  const [aiEnabled, setAiEnabled] = useState(true);
  const [botName, setBotName] = useState("Atendente Virtual");
  const [aiPersona, setAiPersona] = useState("");
  const [welcomeMessage, setWelcomeMessage] = useState("Olá! Como posso ajudá-lo?");
  const [fallbackMessage, setFallbackMessage] = useState(
    "Desculpe, não consegui entender. Vou transferir você para um atendente humano."
  );
  const [useMenuKnowledge, setUseMenuKnowledge] = useState(true);
  const [additionalInstructions, setAdditionalInstructions] = useState("");

  // handoff
  const [autoHandoffEnabled, setAutoHandoffEnabled] = useState(false);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.3);
  const [allowManualReturn, setAllowManualReturn] = useState(true);

  // business hours
  const [businessHoursOnly, setBusinessHoursOnly] = useState(false);
  const [businessHours, setBusinessHours] = useState<BusinessHoursMap>(DEFAULT_HOURS);

  // rules
  const [rules, setRules] = useState<AIHandoffRule[]>([]);
  const [newRuleType, setNewRuleType] = useState<HandoffRuleType>("keyword");
  const [newRuleValue, setNewRuleValue] = useState("");

  // --- effects ---
  useEffect(() => {
    if (instances.length > 0 && !selectedInstanceId) {
      setSelectedInstanceId(instances[0].id);
    }
  }, [instances, selectedInstanceId]);

  useEffect(() => {
    if (!selectedInstanceId) return;
    const load = async () => {
      setLoading(true);
      try {
        const [s, r] = await Promise.all([
          AutomationService.getSettings(selectedInstanceId),
          AutomationService.getHandoffRules(selectedInstanceId),
        ]);
        setRules(r);
        if (s) {
          setAiEnabled(s.ai_enabled);
          setBotName(s.bot_name);
          setAiPersona(s.ai_persona);
          setWelcomeMessage(s.welcome_message);
          setUseMenuKnowledge(s.use_menu_knowledge);
          setAutoHandoffEnabled(s.auto_handoff_enabled);
          setConfidenceThreshold(s.auto_handoff_confidence_threshold);
          setBusinessHoursOnly(s.business_hours_only);
          setAdditionalInstructions(s.additional_instructions || "");
          if (s.business_hours && typeof s.business_hours === "object") {
            setBusinessHours({ ...DEFAULT_HOURS, ...(s.business_hours as BusinessHoursMap) });
          }
          // fallback & allowManualReturn from additional_instructions JSON or defaults
          try {
            const extra = s.additional_instructions ? JSON.parse(s.additional_instructions) : null;
            if (extra?.fallback_message) setFallbackMessage(extra.fallback_message);
            if (extra?.allow_manual_return !== undefined) setAllowManualReturn(extra.allow_manual_return);
            if (extra?.additional_text) setAdditionalInstructions(extra.additional_text);
          } catch {
            // not JSON, use raw text
          }
        }
      } catch (e) {
        console.error("Erro ao carregar configurações:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [selectedInstanceId]);

  // --- handlers ---
  const handleSave = async () => {
    if (!selectedInstanceId || !canConfigure) return;
    const instance = instances.find(i => i.id === selectedInstanceId);
    if (!instance) return;

    setSaving(true);
    try {
      const extraData = JSON.stringify({
        fallback_message: fallbackMessage,
        allow_manual_return: allowManualReturn,
        additional_text: additionalInstructions,
      });

      await AutomationService.upsertSettings(selectedInstanceId, instance.restaurant_id, {
        ai_enabled: aiEnabled,
        bot_name: botName,
        ai_persona: aiPersona,
        welcome_message: welcomeMessage,
        use_menu_knowledge: useMenuKnowledge,
        auto_handoff_enabled: autoHandoffEnabled,
        auto_handoff_confidence_threshold: confidenceThreshold,
        business_hours_only: businessHoursOnly,
        business_hours: businessHours as any,
        additional_instructions: extraData,
      });
      toast.success("Configurações salvas com sucesso!");
    } catch {
      toast.error("Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
  };

  const handleAddRule = async () => {
    if (!selectedInstanceId || !newRuleValue.trim() || !canConfigure) return;
    const instance = instances.find(i => i.id === selectedInstanceId);
    if (!instance) return;
    try {
      const rule = await AutomationService.addHandoffRule({
        instanceId: selectedInstanceId,
        restaurantId: instance.restaurant_id,
        ruleType: newRuleType,
        ruleValue: newRuleValue.trim(),
      });
      setRules(prev => [...prev, rule]);
      setNewRuleValue("");
      toast.success("Regra adicionada!");
    } catch {
      toast.error("Erro ao adicionar regra");
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!canConfigure) return;
    try {
      await AutomationService.deleteHandoffRule(id);
      setRules(prev => prev.filter(r => r.id !== id));
      toast.success("Regra removida");
    } catch {
      toast.error("Erro ao remover regra");
    }
  };

  const updateDaySchedule = (day: string, field: keyof DaySchedule, value: string | boolean) => {
    setBusinessHours(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  };

  const ruleTypeLabels: Record<HandoffRuleType, string> = {
    keyword: "Palavra-chave",
    low_confidence: "Baixa confiança",
    customer_request: "Solicitação do cliente",
    timeout: "Timeout",
  };

  // --- render ---
  if (instancesLoading || permissionsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (instances.length === 0) {
    return (
      <Card className="p-12 text-center">
        <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">Nenhuma instância disponível</h3>
        <p className="text-muted-foreground">
          Crie uma instância WhatsApp na aba "Instâncias" para configurar a automação.
        </p>
      </Card>
    );
  }

  if (!canConfigure) {
    return (
      <Card className="p-12 text-center">
        <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">Sem permissão</h3>
        <p className="text-muted-foreground">
          Você não tem permissão para configurar a automação. Solicite ao administrador.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Instance selector */}
      <div className="flex items-center gap-4">
        <Label className="whitespace-nowrap">Instância:</Label>
        <Select value={selectedInstanceId} onValueChange={setSelectedInstanceId}>
          <SelectTrigger className="w-72">
            <SelectValue placeholder="Selecione uma instância" />
          </SelectTrigger>
          <SelectContent>
            {instances.map(i => (
              <SelectItem key={i.id} value={i.id}>
                {i.instance_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Behavior summary */}
          <BehaviorSummary
            aiEnabled={aiEnabled}
            autoHandoffEnabled={autoHandoffEnabled}
            businessHoursOnly={businessHoursOnly}
            keywordCount={rules.filter(r => r.rule_type === "keyword").length}
            allowManualReturn={allowManualReturn}
          />

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Col 1: AI + Messages */}
            <div className="space-y-6">
              {/* AI Config Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Bot className="h-5 w-5" />
                    Configurações da IA
                  </CardTitle>
                  <CardDescription>Comportamento do atendente virtual</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="ai-enabled">IA habilitada</Label>
                      <p className="text-xs text-muted-foreground">Ativar respostas automáticas</p>
                    </div>
                    <Switch id="ai-enabled" checked={aiEnabled} onCheckedChange={setAiEnabled} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bot-name">Nome do bot</Label>
                    <Input id="bot-name" value={botName} onChange={e => setBotName(e.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="persona">Persona / tom de voz</Label>
                    <Textarea
                      id="persona"
                      value={aiPersona}
                      onChange={e => setAiPersona(e.target.value)}
                      placeholder="Você é um atendente simpático e profissional..."
                      rows={3}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Base de conhecimento do cardápio</Label>
                      <p className="text-xs text-muted-foreground">IA responde usando seus produtos</p>
                    </div>
                    <Switch checked={useMenuKnowledge} onCheckedChange={setUseMenuKnowledge} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="extra-instructions">Instruções adicionais</Label>
                    <Textarea
                      id="extra-instructions"
                      value={additionalInstructions}
                      onChange={e => setAdditionalInstructions(e.target.value)}
                      placeholder="Ex: Nunca ofereça desconto sem autorização..."
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Messages Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ArrowRightLeft className="h-5 w-5" />
                    Mensagens Automáticas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="welcome">Mensagem de saudação</Label>
                    <Textarea
                      id="welcome"
                      value={welcomeMessage}
                      onChange={e => setWelcomeMessage(e.target.value)}
                      rows={2}
                    />
                    <p className="text-xs text-muted-foreground">Enviada quando o cliente inicia uma conversa</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fallback">Mensagem de fallback</Label>
                    <Textarea
                      id="fallback"
                      value={fallbackMessage}
                      onChange={e => setFallbackMessage(e.target.value)}
                      rows={2}
                    />
                    <p className="text-xs text-muted-foreground">
                      Enviada quando a IA não consegue responder ou detecta handoff
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* n8n Integration Info */}
              <Card className="border-dashed">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Webhook className="h-5 w-5" />
                    Integração n8n
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <Info className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>
                        As configurações desta tela são consumidas pelo workflow n8n que roteia as mensagens.
                        O n8n lê <strong>ai_enabled</strong>, <strong>status da conversa</strong> e <strong>regras de handoff</strong> para decidir se envia para a IA ou para a fila humana.
                      </p>
                      <p>
                        Webhook configurado via Edge Function <code>evolution-api</code>.
                      </p>
                    </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg border p-3">
                        <p className="mb-2 text-xs font-semibold text-muted-foreground">Variáveis do n8n</p>
                        <div className="flex flex-wrap gap-1.5">
                          {N8N_ENV_VARS.map(name => (
                            <Badge key={name} variant="secondary" className="font-mono text-[10px]">
                              {name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="mb-2 text-xs font-semibold text-muted-foreground">Secrets da Edge Function</p>
                        <div className="flex flex-wrap gap-1.5">
                          {EDGE_ENV_VARS.map(name => (
                            <Badge key={name} variant="secondary" className="font-mono text-[10px]">
                              {name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Workflow pronto para importar: <code>docs/Evolution_Whatsapp_Generic_N8N.json</code>
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Col 2: Handoff + Hours + Queue */}
            <div className="space-y-6">
              {/* Handoff Rules */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Shield className="h-5 w-5" />
                    Regras de Transferência (Handoff)
                  </CardTitle>
                  <CardDescription>Quando a IA deve transferir para humano</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Handoff automático</Label>
                      <p className="text-xs text-muted-foreground">Transferir com base em regras</p>
                    </div>
                    <Switch checked={autoHandoffEnabled} onCheckedChange={setAutoHandoffEnabled} />
                  </div>

                  {autoHandoffEnabled && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>Limite de confiança da IA</Label>
                          <span className="text-sm font-medium text-primary">
                            {(confidenceThreshold * 100).toFixed(0)}%
                          </span>
                        </div>
                        <Slider
                          value={[confidenceThreshold]}
                          onValueChange={([v]) => setConfidenceThreshold(v)}
                          min={0}
                          max={1}
                          step={0.05}
                          className="py-2"
                        />
                        <p className="text-xs text-muted-foreground">
                          Abaixo deste valor a conversa é transferida automaticamente
                        </p>
                      </div>

                      <Separator />

                      <div className="space-y-2">
                        <Label>Palavras-chave de handoff</Label>
                        {rules.length === 0 ? (
                          <p className="text-sm text-muted-foreground">Nenhuma regra configurada</p>
                        ) : (
                          <div className="space-y-1.5 max-h-48 overflow-y-auto">
                            {rules.map(rule => (
                              <div
                                key={rule.id}
                                className="flex items-center justify-between p-2 bg-muted rounded-md"
                              >
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs shrink-0">
                                    {ruleTypeLabels[rule.rule_type]}
                                  </Badge>
                                  <span className="text-sm truncate">{rule.rule_value}</span>
                                </div>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteRule(rule.id)}>
                                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Select value={newRuleType} onValueChange={v => setNewRuleType(v as HandoffRuleType)}>
                          <SelectTrigger className="w-36">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="keyword">Palavra-chave</SelectItem>
                            <SelectItem value="customer_request">Pedido cliente</SelectItem>
                            <SelectItem value="timeout">Timeout (s)</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          placeholder="Ex: falar com atendente"
                          value={newRuleValue}
                          onChange={e => setNewRuleValue(e.target.value)}
                          className="flex-1"
                          onKeyDown={e => e.key === "Enter" && handleAddRule()}
                        />
                        <Button size="icon" onClick={handleAddRule} disabled={!newRuleValue.trim()}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Business Hours */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Clock className="h-5 w-5" />
                    Horário Comercial
                  </CardTitle>
                  <CardDescription>Defina quando a IA deve operar</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Apenas no horário comercial</Label>
                      <p className="text-xs text-muted-foreground">
                        Fora do horário, as mensagens aguardam na fila
                      </p>
                    </div>
                    <Switch checked={businessHoursOnly} onCheckedChange={setBusinessHoursOnly} />
                  </div>

                  {businessHoursOnly && (
                    <div className="space-y-2 pt-2">
                      {WEEKDAYS.map(day => {
                        const schedule = businessHours[day.key] || { enabled: false, start: "08:00", end: "22:00" };
                        return (
                          <div key={day.key} className="flex items-center gap-3">
                            <Switch
                              checked={schedule.enabled}
                              onCheckedChange={v => updateDaySchedule(day.key, "enabled", v)}
                              className="shrink-0"
                            />
                            <span className="text-sm w-16 shrink-0">{day.label}</span>
                            {schedule.enabled ? (
                              <div className="flex items-center gap-1.5 flex-1">
                                <Input
                                  type="time"
                                  value={schedule.start}
                                  onChange={e => updateDaySchedule(day.key, "start", e.target.value)}
                                  className="h-8 text-xs"
                                />
                                <span className="text-xs text-muted-foreground">às</span>
                                <Input
                                  type="time"
                                  value={schedule.end}
                                  onChange={e => updateDaySchedule(day.key, "end", e.target.value)}
                                  className="h-8 text-xs"
                                />
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">Fechado</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Human Queue Config */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Users className="h-5 w-5" />
                    Fila Humana
                  </CardTitle>
                  <CardDescription>Comportamento quando conversa vai para humano</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Permitir retorno manual para IA</Label>
                      <p className="text-xs text-muted-foreground">
                        Atendentes podem devolver a conversa para a IA
                      </p>
                    </div>
                    <Switch checked={allowManualReturn} onCheckedChange={setAllowManualReturn} />
                  </div>

                  <div className="p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p className="font-medium">Regras de status da conversa:</p>
                        <ul className="list-disc pl-4 space-y-0.5">
                          <li><strong>bot_active</strong> → IA responde normalmente</li>
                          <li><strong>waiting_human</strong> → IA pausada, aguardando atendente</li>
                          <li><strong>human_active</strong> → IA totalmente pausada</li>
                          <li><strong>closed</strong> → Conversa encerrada</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Save button */}
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving} className="gap-2 min-w-[200px]" size="lg">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar Configurações
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

/* ---------- Behavior Summary ---------- */
interface BehaviorSummaryProps {
  aiEnabled: boolean;
  autoHandoffEnabled: boolean;
  businessHoursOnly: boolean;
  keywordCount: number;
  allowManualReturn: boolean;
}

const BehaviorSummary = ({
  aiEnabled, autoHandoffEnabled, businessHoursOnly, keywordCount, allowManualReturn,
}: BehaviorSummaryProps) => {
  const items = [
    { label: "IA ativa", active: aiEnabled },
    { label: "Handoff automático", active: autoHandoffEnabled },
    { label: "Horário comercial", active: businessHoursOnly },
    { label: `${keywordCount} palavra(s)-chave`, active: keywordCount > 0 },
    { label: "Retorno manual → IA", active: allowManualReturn },
  ];

  return (
    <Card className="bg-muted/30">
      <CardContent className="py-4">
        <div className="flex items-center gap-2 mb-3">
          <Info className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Resumo do comportamento</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {items.map(item => (
            <Badge
              key={item.label}
              variant={item.active ? "default" : "secondary"}
              className="gap-1.5"
            >
              {item.active ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <AlertTriangle className="h-3 w-3" />
              )}
              {item.label}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default AtendimentoAutomacao;
