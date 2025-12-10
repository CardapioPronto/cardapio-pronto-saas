import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Bot, MessageSquare, Settings } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { ConnectionCard } from "@/components/whatsapp-ai/ConnectionCard";
import { BrainConfigCard } from "@/components/whatsapp-ai/BrainConfigCard";
import { ChatHistory } from "@/components/whatsapp-ai/ChatHistory";
import { useWhatsAppAI } from "@/hooks/useWhatsAppAI";

const WhatsAppAI = () => {
  const {
    config,
    loading,
    connecting,
    conversations,
    createInstance,
    connect,
    disconnect,
    deleteInstance,
    updateConfig,
    checkStatus
  } = useWhatsAppAI();

  if (loading) {
    return (
      <DashboardLayout title="WhatsApp AI">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="WhatsApp AI">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
            <Bot className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Atendente Virtual WhatsApp</h1>
            <p className="text-muted-foreground">
              Configure seu atendente com IA usando Evolution API
            </p>
          </div>
        </div>

        <Tabs defaultValue="connection" className="space-y-4">
          <TabsList>
            <TabsTrigger value="connection" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Conexão
            </TabsTrigger>
            <TabsTrigger value="brain" className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              Configuração IA
            </TabsTrigger>
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Conversas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="connection">
            <ConnectionCard
              config={config}
              connecting={connecting}
              onCreateInstance={createInstance}
              onConnect={connect}
              onDisconnect={disconnect}
              onDeleteInstance={deleteInstance}
              onCheckStatus={checkStatus}
            />
          </TabsContent>

          <TabsContent value="brain">
            <BrainConfigCard
              config={config}
              onUpdate={updateConfig}
            />
          </TabsContent>

          <TabsContent value="chat">
            <ChatHistory
              conversations={conversations}
              loading={loading}
            />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default WhatsAppAI;