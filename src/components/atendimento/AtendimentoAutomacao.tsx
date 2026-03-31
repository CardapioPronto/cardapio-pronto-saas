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
import { Plus, Trash2, Save, Loader2, Bot, Zap, Shield } from "lucide-react";
import { useWhatsAppInstances } from "@/hooks/useWhatsAppInstances";
import { AutomationService } from "@/services/atendimento/automationService";
import { AutomationSettings, AIHandoffRule, HandoffRuleType } from "@/types/atendimento";
import { toast } from "sonner";

const AtendimentoAutomacao = () => {
  const { instances, loading: instancesLoading } = useWhatsAppInstances();
  const [selectedInstanceId, setSelectedInstanceId] = useState<string>("");
  const [settings, setSettings] = useState<AutomationSettings | null>(null);
  const [rules, setRules] = useState<AIHandoffRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [aiEnabled, setAiEnabled] = useState(true);
  const [botName, setBotName] = useState("Atendente Virtual");
  const [aiPersona, setAiPersona] = useState("");
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [useMenuKnowledge, setUseMenuKnowledge] = useState(true);
  const [autoHandoffEnabled, setAutoHandoffEnabled] = useState(false);
  const [confidenceThreshold, setConfidenceThreshold] = useState("0.3");
  const [additionalInstructions, setAdditionalInstructions] = useState("");

  // New rule form
  const [newRuleType, setNewRuleType] = useState<HandoffRuleType>("keyword");
  const [newRuleValue, setNewRuleValue] = useState("");

  useEffect(() => {
    if (instances.length > 0 && !selectedInstanceId) {
      setSelectedInstanceId(instances[0].id);
    }
  }, [instances, selectedInstanceId]);

  useEffect(() => {
    if (!selectedInstanceId) return;
    
    const loadSettings = async () => {
      setLoading(true);
      try {
        const [settingsData, rulesData] = await Promise.all([
          AutomationService.getSettings(selectedInstanceId),
          AutomationService.getHandoffRules(selectedInstanceId),
        ]);
        
        setSettings(settingsData);
        setRules(rulesData);

        if (settingsData) {
          setAiEnabled(settingsData.ai_enabled);
          setBotName(settingsData.bot_name);
          setAiPersona(settingsData.ai_persona);
          setWelcomeMessage(settingsData.welcome_message);
          setUseMenuKnowledge(settingsData.use_menu_knowledge);
          setAutoHandoffEnabled(settingsData.auto_handoff_enabled);
          setConfidenceThreshold(String(settingsData.auto_handoff_confidence_threshold));
          setAdditionalInstructions(settingsData.additional_instructions || "");
        }
      } catch (error) {
        console.error('Erro ao carregar configurações:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [selectedInstanceId]);

  const handleSave = async () => {
    if (!selectedInstanceId) return;
    const instance = instances.find(i => i.id === selectedInstanceId);
    if (!instance) return;

    setSaving(true);
    try {
      await AutomationService.upsertSettings(selectedInstanceId, instance.restaurant_id, {
        ai_enabled: aiEnabled,
        bot_name: botName,
        ai_persona: aiPersona,
        welcome_message: welcomeMessage,
        use_menu_knowledge: useMenuKnowledge,
        auto_handoff_enabled: autoHandoffEnabled,
        auto_handoff_confidence_threshold: parseFloat(confidenceThreshold),
        additional_instructions: additionalInstructions || null,
      });
      toast.success("Configurações salvas com sucesso!");
    } catch (error) {
      toast.error("Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
  };

  const handleAddRule = async () => {
    if (!selectedInstanceId || !newRuleValue.trim()) return;
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
    } catch (error) {
      toast.error("Erro ao adicionar regra");
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    try {
      await AutomationService.deleteHandoffRule(ruleId);
      setRules(prev => prev.filter(r => r.id !== ruleId));
      toast.success("Regra removida");
    } catch (error) {
      toast.error("Erro ao remover regra");
    }
  };

  const ruleTypeLabels: Record<HandoffRuleType, string> = {
    keyword: "Palavra-chave",
    low_confidence: "Baixa confiança",
    customer_request: "Solicitação do cliente",
    timeout: "Timeout",
  };

  if (instancesLoading) {
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

  return (
    <div className="space-y-6">
      {/* Instance selector */}
      <div className="flex items-center gap-4">
        <Label>Instância:</Label>
        <Select value={selectedInstanceId} onValueChange={setSelectedInstanceId}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Selecione uma instância" />
          </SelectTrigger>
          <SelectContent>
            {instances.map(i => (
              <SelectItem key={i.id} value={i.id}>{i.instance_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* AI Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                Configurações da IA
              </CardTitle>
              <CardDescription>
                Configure o comportamento do atendente virtual
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="ai-enabled">IA habilitada</Label>
                <Switch id="ai-enabled" checked={aiEnabled} onCheckedChange={setAiEnabled} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bot-name">Nome do bot</Label>
                <Input
                  id="bot-name"
                  value={botName}
                  onChange={(e) => setBotName(e.target.value)}
                  placeholder="Atendente Virtual"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="welcome">Mensagem de boas-vindas</Label>
                <Textarea
                  id="welcome"
                  value={welcomeMessage}
                  onChange={(e) => setWelcomeMessage(e.target.value)}
                  placeholder="Olá! Como posso ajudá-lo?"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="persona">Persona da IA</Label>
                <Textarea
                  id="persona"
                  value={aiPersona}
                  onChange={(e) => setAiPersona(e.target.value)}
                  placeholder="Você é um atendente virtual simpático..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="instructions">Instruções adicionais</Label>
                <Textarea
                  id="instructions"
                  value={additionalInstructions}
                  onChange={(e) => setAdditionalInstructions(e.target.value)}
                  placeholder="Instruções específicas para o atendimento..."
                  rows={3}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Usar cardápio como base de conhecimento</Label>
                  <p className="text-xs text-muted-foreground">A IA usará seus produtos para responder</p>
                </div>
                <Switch checked={useMenuKnowledge} onCheckedChange={setUseMenuKnowledge} />
              </div>

              <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Salvar Configurações
              </Button>
            </CardContent>
          </Card>

          {/* Handoff Rules */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Regras de Transferência
              </CardTitle>
              <CardDescription>
                Configure quando a IA deve transferir para um atendente humano
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Transferência automática</Label>
                  <p className="text-xs text-muted-foreground">Habilitar handoff automático</p>
                </div>
                <Switch checked={autoHandoffEnabled} onCheckedChange={setAutoHandoffEnabled} />
              </div>

              {autoHandoffEnabled && (
                <>
                  <div className="space-y-2">
                    <Label>Limite de confiança</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="1"
                      value={confidenceThreshold}
                      onChange={(e) => setConfidenceThreshold(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Abaixo deste valor (0-1), a IA transfere para humano
                    </p>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <Label>Regras ativas</Label>
                    {rules.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhuma regra configurada</p>
                    ) : (
                      <div className="space-y-2">
                        {rules.map(rule => (
                          <div key={rule.id} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs">
                                {ruleTypeLabels[rule.rule_type]}
                              </Badge>
                              <span className="text-sm">{rule.rule_value}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteRule(rule.id)}
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label>Adicionar regra</Label>
                    <div className="flex gap-2">
                      <Select value={newRuleType} onValueChange={(v) => setNewRuleType(v as HandoffRuleType)}>
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="keyword">Palavra-chave</SelectItem>
                          <SelectItem value="customer_request">Pedido do cliente</SelectItem>
                          <SelectItem value="timeout">Timeout (seg)</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Valor da regra..."
                        value={newRuleValue}
                        onChange={(e) => setNewRuleValue(e.target.value)}
                        className="flex-1"
                      />
                      <Button size="icon" onClick={handleAddRule} disabled={!newRuleValue.trim()}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}

              <Button onClick={handleSave} disabled={saving} className="w-full gap-2" variant="outline">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Salvar Tudo
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AtendimentoAutomacao;
