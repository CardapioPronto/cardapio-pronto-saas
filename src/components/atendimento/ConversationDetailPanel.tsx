import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Send, Bot, User, HandMetal, ArrowLeftRight, XCircle,
  StickyNote, Loader2, Phone, MessageSquare, AlertTriangle,
  UserCheck, ArrowRightLeft, Mic
} from "lucide-react";
import { ConversationThread, ConversationMessage, ConversationNote, ThreadStatus } from "@/types/atendimento";
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
  canManage?: boolean;
  canReply?: boolean;
  isOwnerOrAdmin?: boolean;
}

function MessageBubble({ message }: { message: ConversationMessage }) {
  const isCustomer = message.sender_type === 'customer';
  const isBot = message.sender_type === 'bot';
  const isInternal = message.is_internal;
  const metadata = message.metadata || {};
  const originalMessageType = String(metadata.originalMessageType || metadata.messageType || '');
  const mediaType = String(metadata.mediaType || '');
  const transcription = typeof metadata.transcription === 'string' ? metadata.transcription.trim() : '';
  const isAudio = message.message_type?.toLowerCase().includes('audio') || originalMessageType.toLowerCase().includes('audio') || mediaType === 'audio';
  const content = isAudio && transcription ? transcription : message.content;

  const senderLabel = isCustomer ? 'Cliente' : isBot ? 'IA' : isInternal ? 'Nota interna' : 'Atendente';
  const senderIcon = isBot ? <Bot className="h-3 w-3" /> : !isCustomer ? <User className="h-3 w-3" /> : null;

  return (
    <div className={`flex ${isCustomer ? 'justify-start' : 'justify-end'} mb-3`}>
      <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm ${
        isInternal
          ? 'bg-yellow-50 border border-yellow-200 text-yellow-900 dark:bg-yellow-900/20 dark:border-yellow-800/40 dark:text-yellow-200'
          : isCustomer
            ? 'bg-muted text-foreground'
            : isBot
              ? 'bg-blue-50 border border-blue-100 text-blue-900 dark:bg-blue-900/20 dark:border-blue-800/40 dark:text-blue-200'
              : 'bg-primary text-primary-foreground'
      }`}>
        <div className="flex items-center gap-1 mb-0.5">
          {isInternal && <StickyNote className="h-3 w-3" />}
          {!isInternal && senderIcon}
          <span className="text-[10px] font-medium opacity-70">{senderLabel}</span>
        </div>
        {isAudio && (
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium opacity-70">
            <Mic className="h-3.5 w-3.5" />
            <span>Audio recebido</span>
          </div>
        )}
        {isAudio && message.media_url && (
          <audio controls src={message.media_url} className="mb-2 h-8 w-full max-w-[260px]" />
        )}
        {isAudio && transcription && (
          <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide opacity-50">
            Transcricao
          </span>
        )}
        <p className="text-sm whitespace-pre-wrap leading-relaxed">{content}</p>
        <span className="text-[10px] opacity-50 mt-1 block text-right">
          {format(new Date(message.created_at), "HH:mm", { locale: ptBR })}
        </span>
      </div>
    </div>
  );
}

function DateSeparator({ date }: { date: string }) {
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 border-t border-border/50" />
      <span className="text-[11px] text-muted-foreground font-medium px-2">
        {format(new Date(date), "dd 'de' MMMM", { locale: ptBR })}
      </span>
      <div className="flex-1 border-t border-border/50" />
    </div>
  );
}

function groupMessagesByDate(messages: ConversationMessage[]) {
  const groups: { date: string; messages: ConversationMessage[] }[] = [];
  let currentDate = '';

  for (const msg of messages) {
    const msgDate = format(new Date(msg.created_at), 'yyyy-MM-dd');
    if (msgDate !== currentDate) {
      currentDate = msgDate;
      groups.push({ date: msg.created_at, messages: [msg] });
    } else {
      groups[groups.length - 1].messages.push(msg);
    }
  }
  return groups;
}

const statusColor: Record<ThreadStatus, string> = {
  bot_active: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  waiting_human: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  human_active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  closed: "bg-muted text-muted-foreground",
};

const statusLabel: Record<ThreadStatus, string> = {
  bot_active: "IA ativa",
  waiting_human: "Aguardando humano",
  human_active: "Atendimento humano",
  closed: "Encerrada",
};

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
  canManage = true,
  canReply = true,
  isOwnerOrAdmin = false,
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
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const handleSend = async () => {
    if (!messageText.trim()) return;
    setSending(true);
    try {
      await sendMessage(messageText.trim());
      setMessageText("");
    } catch {
      // Toast is emitted by the hook/service layer.
    } finally {
      setSending(false);
    }
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    await addNote(noteText.trim());
    setNoteText("");
  };

  const messageGroups = groupMessagesByDate(messages);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b bg-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Phone className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-sm text-foreground truncate">
                {thread.customer_name || thread.customer_phone}
              </h3>
              <p className="text-xs text-muted-foreground">{thread.customer_phone}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {thread.assigned_to && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <UserCheck className="h-3.5 w-3.5" />
                <span>Atribuída</span>
              </div>
            )}
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusColor[thread.status]}`}>
              {statusLabel[thread.status]}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        {canManage && (
          <div className="flex gap-2 mt-3 flex-wrap">
            {(thread.status === 'bot_active' || thread.status === 'waiting_human') && (
              <Button size="sm" onClick={assumeConversation} className="gap-1.5 text-xs h-8">
                <HandMetal className="h-3.5 w-3.5" />
                Assumir Atendimento
              </Button>
            )}
            {thread.status === 'waiting_human' && isOwnerOrAdmin && (
              <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8">
                <ArrowRightLeft className="h-3.5 w-3.5" />
                Transferir
              </Button>
            )}
            {thread.status === 'human_active' && (
              <Button size="sm" variant="outline" onClick={releaseToBot} className="gap-1.5 text-xs h-8">
                <ArrowLeftRight className="h-3.5 w-3.5" />
                Devolver para IA
              </Button>
            )}
            {thread.status !== 'closed' && (
              <Button size="sm" variant="ghost" onClick={closeConversation} className="gap-1.5 text-xs h-8 text-destructive hover:text-destructive">
                <XCircle className="h-3.5 w-3.5" />
                Encerrar
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Human active warning */}
      {thread.status === 'human_active' && (
        <Alert className="mx-3 mt-2 shrink-0 border-green-200 bg-green-50/80 dark:bg-green-900/10 dark:border-green-800/30">
          <AlertTriangle className="h-4 w-4 text-green-700 dark:text-green-400" />
          <AlertDescription className="text-xs text-green-800 dark:text-green-300">
            IA pausada durante atendimento humano. Devolva para a IA quando finalizar.
          </AlertDescription>
        </Alert>
      )}

      {thread.status === 'waiting_human' && (
        <Alert className="mx-3 mt-2 shrink-0 border-yellow-200 bg-yellow-50/80 dark:bg-yellow-900/10 dark:border-yellow-800/30">
          <AlertTriangle className="h-4 w-4 text-yellow-700 dark:text-yellow-400" />
          <AlertDescription className="text-xs text-yellow-800 dark:text-yellow-300">
            Cliente aguardando atendimento humano. Assuma a conversa para responder.
          </AlertDescription>
        </Alert>
      )}

      {/* Content area with tabs */}
      <Tabs defaultValue="messages" className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <TabsList className="mx-3 mt-2 w-auto shrink-0 self-start">
          <TabsTrigger value="messages" className="gap-1.5 text-xs">
            <MessageSquare className="h-3.5 w-3.5" />
            Mensagens
          </TabsTrigger>
          <TabsTrigger value="notes" className="gap-1.5 text-xs">
            <StickyNote className="h-3.5 w-3.5" />
            Notas ({notes.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="messages" className="m-0 grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_auto]">
          {/* Messages timeline */}
          <ScrollArea className="min-h-0 px-4 py-2" ref={scrollRef}>
            <div className="space-y-1">
              {messages.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">Nenhuma mensagem ainda</p>
                  <p className="text-xs mt-1">As mensagens aparecerão aqui em tempo real</p>
                </div>
              ) : (
                messageGroups.map((group, i) => (
                  <div key={i}>
                    <DateSeparator date={group.date} />
                    {group.messages.map((msg) => (
                      <MessageBubble key={msg.id} message={msg} />
                    ))}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          {/* Message input */}
          {thread.status !== 'closed' && (
            <div className="shrink-0 p-3 border-t bg-card">
              {thread.status === 'human_active' && canReply ? (
                <div className="flex gap-2">
                  <Input
                    placeholder="Digite sua mensagem..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                    disabled={sending}
                    className="text-sm"
                  />
                  <Button
                    size="icon"
                    onClick={handleSend}
                    disabled={!messageText.trim() || sending}
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              ) : (
                <div className="text-center py-2 text-xs text-muted-foreground">
                  {thread.status === 'human_active'
                    ? 'Você não tem permissão para responder como atendente'
                    : 'Assuma a conversa para enviar mensagens'}
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="notes" className="m-0 grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_auto]">
          <ScrollArea className="min-h-0 px-4 py-2">
            <div className="space-y-2">
              {notes.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <StickyNote className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">Nenhuma nota interna</p>
                  <p className="text-xs mt-1">Adicione notas para a equipe sobre esta conversa</p>
                </div>
              ) : (
                notes.map((note) => (
                  <div key={note.id} className="p-3 bg-yellow-50 rounded-lg border border-yellow-100 dark:bg-yellow-900/10 dark:border-yellow-800/30">
                    <p className="text-sm text-foreground">{note.content}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(note.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs text-destructive hover:text-destructive"
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
          <div className="shrink-0 p-3 border-t bg-card">
            <div className="flex gap-2">
              <Textarea
                placeholder="Adicionar nota interna para a equipe..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                className="text-sm min-h-[60px] resize-none"
              />
              <Button size="sm" onClick={handleAddNote} disabled={!noteText.trim()} className="self-end">
                Salvar
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ConversationDetailPanel;
