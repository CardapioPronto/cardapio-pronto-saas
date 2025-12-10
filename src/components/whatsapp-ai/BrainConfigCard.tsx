import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2, Brain, Save } from "lucide-react";
import { WhatsAppAIConfig, UpdateWhatsAppAIConfig } from "@/types/whatsappAI";

interface BrainConfigCardProps {
  config: WhatsAppAIConfig | null;
  onUpdate: (updates: UpdateWhatsAppAIConfig) => Promise<boolean>;
}

export function BrainConfigCard({ config, onUpdate }: BrainConfigCardProps) {
  const [botName, setBotName] = useState("");
  const [aiPersona, setAiPersona] = useState("");
  const [additionalInstructions, setAdditionalInstructions] = useState("");
  const [useMenuKnowledge, setUseMenuKnowledge] = useState(true);
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Carrega valores iniciais
  useEffect(() => {
    if (config) {
      setBotName(config.bot_name || "");
      setAiPersona(config.ai_persona || "");
      setAdditionalInstructions(config.additional_instructions || "");
      setUseMenuKnowledge(config.use_menu_knowledge);
      setActive(config.active);
      setHasChanges(false);
    }
  }, [config]);

  // Detecta mudanças
  useEffect(() => {
    if (!config) return;
    
    const changed = 
      botName !== (config.bot_name || "") ||
      aiPersona !== (config.ai_persona || "") ||
      additionalInstructions !== (config.additional_instructions || "") ||
      useMenuKnowledge !== config.use_menu_knowledge ||
      active !== config.active;
    
    setHasChanges(changed);
  }, [botName, aiPersona, additionalInstructions, useMenuKnowledge, active, config]);

  const handleSave = async () => {
    setSaving(true);
    await onUpdate({
      bot_name: botName,
      ai_persona: aiPersona,
      additional_instructions: additionalInstructions || undefined,
      use_menu_knowledge: useMenuKnowledge,
      active
    });
    setSaving(false);
    setHasChanges(false);
  };

  if (!config) {
    return (
      <Card className="opacity-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Configuração do Cérebro
          </CardTitle>
          <CardDescription>
            Conecte o WhatsApp primeiro para configurar a IA
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Configuração do Cérebro
            </CardTitle>
            <CardDescription>
              Personalize como a IA irá atender seus clientes
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="active" className="text-sm">Bot Ativo</Label>
            <Switch 
              id="active" 
              checked={active} 
              onCheckedChange={setActive}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="botName">Nome do Bot</Label>
          <Input
            id="botName"
            placeholder="Ex: Maria, Atendente Virtual"
            value={botName}
            onChange={(e) => setBotName(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            O nome que a IA usará para se apresentar
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="aiPersona">Personalidade da IA</Label>
          <Textarea
            id="aiPersona"
            placeholder="Descreva como a IA deve se comportar..."
            value={aiPersona}
            onChange={(e) => setAiPersona(e.target.value)}
            rows={3}
          />
          <p className="text-xs text-muted-foreground">
            Ex: "Você é um atendente simpático e profissional. Seja objetivo nas respostas."
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="additionalInstructions">Instruções Adicionais</Label>
          <Textarea
            id="additionalInstructions"
            placeholder="Informações específicas do seu negócio..."
            value={additionalInstructions}
            onChange={(e) => setAdditionalInstructions(e.target.value)}
            rows={4}
          />
          <p className="text-xs text-muted-foreground">
            Ex: "Não aceitamos cheque. Entregamos apenas no bairro Centro. Tempo médio de entrega: 40 minutos."
          </p>
        </div>

        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div>
            <Label htmlFor="useMenuKnowledge" className="font-medium">
              Usar cardápio como conhecimento
            </Label>
            <p className="text-xs text-muted-foreground mt-1">
              A IA terá acesso aos produtos, preços e descrições do seu cardápio
            </p>
          </div>
          <Switch 
            id="useMenuKnowledge" 
            checked={useMenuKnowledge} 
            onCheckedChange={setUseMenuKnowledge}
          />
        </div>

        <Button 
          onClick={handleSave} 
          disabled={saving || !hasChanges}
          className="w-full"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Salvar Configurações
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}