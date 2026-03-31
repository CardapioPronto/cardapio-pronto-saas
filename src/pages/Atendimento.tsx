import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Smartphone, Settings2, BarChart3 } from "lucide-react";
import AtendimentoInstancias from "@/components/atendimento/AtendimentoInstancias";
import AtendimentoConversas from "@/components/atendimento/AtendimentoConversas";
import AtendimentoAutomacao from "@/components/atendimento/AtendimentoAutomacao";
import AtendimentoMetricas from "@/components/atendimento/AtendimentoMetricas";

const Atendimento = () => {
  const [activeTab, setActiveTab] = useState("conversas");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Atendimento WhatsApp
        </h1>
        <p className="text-muted-foreground">
          Gerencie instâncias, conversas e automações do WhatsApp
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="conversas" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Conversas</span>
          </TabsTrigger>
          <TabsTrigger value="instancias" className="gap-2">
            <Smartphone className="h-4 w-4" />
            <span className="hidden sm:inline">Instâncias</span>
          </TabsTrigger>
          <TabsTrigger value="automacao" className="gap-2">
            <Settings2 className="h-4 w-4" />
            <span className="hidden sm:inline">Automação</span>
          </TabsTrigger>
          <TabsTrigger value="metricas" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Métricas</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="conversas">
          <AtendimentoConversas />
        </TabsContent>
        <TabsContent value="instancias">
          <AtendimentoInstancias />
        </TabsContent>
        <TabsContent value="automacao">
          <AtendimentoAutomacao />
        </TabsContent>
        <TabsContent value="metricas">
          <AtendimentoMetricas />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Atendimento;
