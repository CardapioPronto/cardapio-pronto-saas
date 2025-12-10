import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { MessageSquare, Search, Bot, User } from "lucide-react";
import { ChatConversation, WhatsAppChatMessage } from "@/types/whatsappAI";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface ChatHistoryProps {
  conversations: ChatConversation[];
  loading?: boolean;
}

export function ChatHistory({ conversations, loading }: ChatHistoryProps) {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredConversations = conversations.filter(conv => 
    conv.customerPhone.includes(searchTerm) ||
    conv.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.lastMessage.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedMessages = selectedConversation
    ? conversations.find(c => c.remoteJid === selectedConversation)?.messages || []
    : [];

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return format(date, "HH:mm", { locale: ptBR });
    }
    return format(date, "dd/MM HH:mm", { locale: ptBR });
  };

  const formatPhone = (phone: string) => {
    // Remove @s.whatsapp.net e formata
    const cleaned = phone.replace("@s.whatsapp.net", "").replace(/\D/g, "");
    if (cleaned.length === 13 && cleaned.startsWith("55")) {
      return `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 4)}) ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`;
    }
    return phone;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Conversas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Carregando conversas...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Conversas
        </CardTitle>
        <CardDescription>
          {conversations.length} conversa{conversations.length !== 1 ? 's' : ''}
        </CardDescription>
        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por telefone ou mensagem..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex gap-4 overflow-hidden p-4 pt-0">
        {/* Lista de conversas */}
        <ScrollArea className="w-1/3 border rounded-lg">
          <div className="p-2 space-y-1">
            {filteredConversations.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhuma conversa encontrada
              </p>
            ) : (
              filteredConversations.map((conv) => (
                <button
                  key={conv.remoteJid}
                  onClick={() => setSelectedConversation(conv.remoteJid)}
                  className={cn(
                    "w-full text-left p-3 rounded-lg transition-colors",
                    selectedConversation === conv.remoteJid
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm truncate">
                      {conv.customerName || formatPhone(conv.customerPhone)}
                    </span>
                    <span className="text-xs opacity-70">
                      {formatTime(conv.lastMessageAt)}
                    </span>
                  </div>
                  <p className="text-xs truncate opacity-80">
                    {conv.lastMessage}
                  </p>
                </button>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Mensagens da conversa selecionada */}
        <div className="flex-1 border rounded-lg flex flex-col">
          {!selectedConversation ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <p>Selecione uma conversa</p>
            </div>
          ) : (
            <>
              <div className="p-3 border-b bg-muted/50">
                <p className="font-medium text-sm">
                  {conversations.find(c => c.remoteJid === selectedConversation)?.customerName || 
                   formatPhone(conversations.find(c => c.remoteJid === selectedConversation)?.customerPhone || "")}
                </p>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-3">
                  {selectedMessages
                    .slice()
                    .reverse()
                    .map((msg) => (
                      <MessageBubble key={msg.id} message={msg} />
                    ))}
                </div>
              </ScrollArea>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function MessageBubble({ message }: { message: WhatsAppChatMessage }) {
  const isOutgoing = message.message_type === 'outgoing';
  
  return (
    <div className={cn("flex", isOutgoing ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] rounded-lg px-3 py-2 text-sm",
          isOutgoing
            ? "bg-primary text-primary-foreground"
            : "bg-muted"
        )}
      >
        {message.is_from_ai && (
          <Badge variant="secondary" className="mb-1 text-xs">
            <Bot className="w-3 h-3 mr-1" />
            IA
          </Badge>
        )}
        <p className="whitespace-pre-wrap">{message.message_content}</p>
        <span className={cn(
          "text-xs mt-1 block",
          isOutgoing ? "text-primary-foreground/70" : "text-muted-foreground"
        )}>
          {format(new Date(message.created_at), "HH:mm", { locale: ptBR })}
        </span>
      </div>
    </div>
  );
}