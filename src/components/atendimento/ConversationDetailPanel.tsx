import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Send, Bot, User, HandMetal, ArrowLeftRight, XCircle, 
  StickyNote, Loader2, Phone, MessageSquare
} from "lucide-react";
import { ConversationThread, ConversationMessage, ConversationNote } from "@/types/atendimento";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ConversationDetailPanelProps {
  thread: ConversationThread | null;
  messages: ConversationMessage[];
  notes: ConversationNote[];
  loading: boolean;
  sendMessage: (content: string, isInternal?: boolean) => Promise<void>;
  assumeConversation: () => Promise<void>;
  releaseToBot: () => Promise<void>;
  closeConversation: () => Promise<void>;
  addNote: (content: string) => Promise<void>;
  deleteNote: (noteId: string) => Promise<void>;
}

function MessageBubble({ message }: { message: ConversationMessage }) {
  const isCustomer = message.sender_type === 'customer';
  const isBot = message.sender_type === 'bot';
  const isInternal = message.is_internal;

  return (
    <div className={`flex ${isCustomer ? 'justify-start' : 'justify-end'} mb-2`}>
      <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${
        isInternal
          ? 'bg-yellow-50 border border-yellow-200 text-yellow-900'
          : isCustomer
            ? 'bg-muted text-foreground'
            : isBot
              ? 'bg-blue-50 border border-blue-100 text-blue-900'
              : 'bg-primary text-primary-foreground'
      }`}>
        <div className="flex items-center gap-1 mb-0.5">
          {isBot && <Bot className="h-3 w-3" />}
          {!isCustomer && !isBot && <User className="h-3 w-3" />}
          {isInternal && <StickyNote className="h-3 w-3" />}
          <span className="text-[10px] font-medium opacity-70">
            {isCustomer ? 'Cliente' : isBot ? 'IA' : isInternal ? 'Nota interna' : 'Atendente'}
          </span>
        </div>
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        <span className="text-[10px] opacity-50 mt-1 block">
          {format(new Date(message.created_at), "HH:mm", { locale: ptBR })}
        </span>
      </div>
    </div>
  );
}

const ConversationDetailPanel = ({
  thread,
  messages,
  notes,
  loading,
  sendMessage,
  assumeConversation,
  releaseToBot,
  closeConversation,
  addNote,
  deleteNote,
}: ConversationDetailPanelProps) => {
  const [messageText, setMessageText] = useState("");
  const [noteText, setNoteText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (loading || !thread) {
    return (
      <Card className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  const handleSend = async () => {
    if (!messageText.trim()) return;
    setSending(true);
    await sendMessage(messageText.trim());
    setMessageText("");
    setSending(false);
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    await addNote(noteText.trim());
    setNoteText("");
  };

  const statusColor: Record<string, string> = {
    bot_active: "bg-blue-100 text-blue-800",
    waiting_human: "bg-yellow-100 text-yellow-800",
    human_active: "bg-green-100 text-green-800",
    closed: "bg-gray-100 text-gray-600",
  };

  const statusLabel: Record<string, string> = {
    bot_active: "IA ativa",
    waiting_human: "Aguardando humano",
    human_active: "Atendimento humano",
    closed: "Encerrada",
  };

  return (
    <Card className="h-full flex flex-col">
      {/* Header */}
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Phone className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">
                {thread.customer_name || thread.customer_phone}
              </h3>
              <p className="text-xs text-muted-foreground">{thread.customer_phone}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${statusColor[thread.status]}`}>
              {statusLabel[thread.status]}
            </span>
          </div>
        </div>
        {/* Action buttons */}
        <div className="flex gap-2 mt-2 flex-wrap">
          {(thread.status === 'bot_active' || thread.status === 'waiting_human') && (
            <Button size="sm" onClick={assumeConversation} className="gap-1 text-xs">
              <HandMetal className="h-3 w-3" />
              Assumir Atendimento
            </Button>
          )}
          {thread.status === 'human_active' && (
            <Button size="sm" variant="outline" onClick={releaseToBot} className="gap-1 text-xs">
              <ArrowLeftRight className="h-3 w-3" />
              Devolver para IA
            </Button>
          )}
          {thread.status !== 'closed' && (
            <Button size="sm" variant="secondary" onClick={closeConversation} className="gap-1 text-xs">
              <XCircle className="h-3 w-3" />
              Encerrar
            </Button>
          )}
        </div>
      </CardHeader>

      {/* Content area with tabs */}
      <Tabs defaultValue="messages" className="flex-1 flex flex-col min-h-0">
        <TabsList className="mx-3 mt-2 w-auto">
          <TabsTrigger value="messages" className="gap-1 text-xs">
            <MessageSquare className="h-3 w-3" />
            Mensagens
          </TabsTrigger>
          <TabsTrigger value="notes" className="gap-1 text-xs">
            <StickyNote className="h-3 w-3" />
            Notas ({notes.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="messages" className="flex-1 flex flex-col min-h-0 m-0">
          {/* Messages */}
          <ScrollArea className="flex-1 px-4 py-2" ref={scrollRef}>
            <div className="space-y-1">
              {messages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">Nenhuma mensagem ainda</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <MessageBubble key={msg.id} message={msg} />
                ))
              )}
            </div>
          </ScrollArea>

          {/* Message input */}
          {thread.status !== 'closed' && (
            <div className="p-3 border-t">
              <div className="flex gap-2">
                <Input
                  placeholder={thread.status === 'human_active' ? "Digite sua mensagem..." : "Assuma a conversa para responder"}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  disabled={thread.status !== 'human_active' || sending}
                  className="text-sm"
                />
                <Button 
                  size="icon" 
                  onClick={handleSend} 
                  disabled={thread.status !== 'human_active' || !messageText.trim() || sending}
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="notes" className="flex-1 flex flex-col min-h-0 m-0">
          <ScrollArea className="flex-1 px-4 py-2">
            <div className="space-y-2">
              {notes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">Nenhuma nota interna</p>
                </div>
              ) : (
                notes.map((note) => (
                  <div key={note.id} className="p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                    <p className="text-sm">{note.content}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(note.created_at), "dd/MM HH:mm", { locale: ptBR })}
                      </span>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 text-xs text-destructive"
                        onClick={() => deleteNote(note.id)}
                      >
                        Remover
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
          <div className="p-3 border-t">
            <div className="flex gap-2">
              <Textarea
                placeholder="Adicionar nota interna..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                className="text-sm min-h-[60px]"
              />
              <Button size="sm" onClick={handleAddNote} disabled={!noteText.trim()}>
                Salvar
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
};

export default ConversationDetailPanel;
