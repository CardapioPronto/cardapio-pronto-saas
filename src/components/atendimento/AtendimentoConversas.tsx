import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, MessageSquare, Bot, User, XCircle, Clock, Loader2 } from "lucide-react";
import { useConversations } from "@/hooks/useConversations";
import { useConversationDetail } from "@/hooks/useConversationDetail";
import { ConversationThread, ThreadStatus } from "@/types/atendimento";
import ConversationDetailPanel from "./ConversationDetailPanel";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusLabels: Record<ThreadStatus, { label: string; icon: React.ReactNode; color: string }> = {
  bot_active: { label: "IA", icon: <Bot className="h-3 w-3" />, color: "bg-blue-100 text-blue-800" },
  waiting_human: { label: "Aguardando", icon: <Clock className="h-3 w-3" />, color: "bg-yellow-100 text-yellow-800" },
  human_active: { label: "Humano", icon: <User className="h-3 w-3" />, color: "bg-green-100 text-green-800" },
  closed: { label: "Encerrada", icon: <XCircle className="h-3 w-3" />, color: "bg-gray-100 text-gray-600" },
};

function ThreadItem({ thread, isActive, onClick }: {
  thread: ConversationThread;
  isActive: boolean;
  onClick: () => void;
}) {
  const statusInfo = statusLabels[thread.status];
  const timeAgo = thread.last_message_at
    ? formatDistanceToNow(new Date(thread.last_message_at), { addSuffix: true, locale: ptBR })
    : '';

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg border transition-colors ${
        isActive ? 'bg-primary/10 border-primary/30' : 'hover:bg-muted/50 border-transparent'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">
              {thread.customer_name || thread.customer_phone}
            </span>
            {thread.unread_count > 0 && (
              <Badge variant="destructive" className="h-5 min-w-[20px] px-1 text-xs">
                {thread.unread_count}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {thread.last_message_preview || 'Sem mensagens'}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className="text-[10px] text-muted-foreground">{timeAgo}</span>
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${statusInfo.color}`}>
            {statusInfo.icon}
            {statusInfo.label}
          </span>
        </div>
      </div>
    </button>
  );
}

const AtendimentoConversas = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);

  const filters = {
    status: statusFilter !== 'all' ? statusFilter as ThreadStatus : undefined,
    search: search || undefined,
  };

  const { threads, loading, totalUnread } = useConversations(filters);
  const conversationDetail = useConversationDetail(selectedThreadId);

  return (
    <div className="flex gap-4 h-[calc(100vh-280px)] min-h-[500px]">
      {/* Thread List */}
      <Card className="w-full max-w-sm flex flex-col">
        <div className="p-3 border-b space-y-2">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm flex-1">
              Conversas
              {totalUnread > 0 && (
                <Badge variant="destructive" className="ml-2 h-5">{totalUnread}</Badge>
              )}
            </h3>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar conversa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="bot_active">IA ativa</SelectItem>
              <SelectItem value="waiting_human">Aguardando humano</SelectItem>
              <SelectItem value="human_active">Atendimento humano</SelectItem>
              <SelectItem value="closed">Encerradas</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : threads.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhuma conversa encontrada</p>
              </div>
            ) : (
              threads.map((thread) => (
                <ThreadItem
                  key={thread.id}
                  thread={thread}
                  isActive={thread.id === selectedThreadId}
                  onClick={() => setSelectedThreadId(thread.id)}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </Card>

      {/* Conversation Detail */}
      <div className="flex-1">
        {selectedThreadId ? (
          <ConversationDetailPanel {...conversationDetail} />
        ) : (
          <Card className="h-full flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <h3 className="font-medium mb-1">Selecione uma conversa</h3>
              <p className="text-sm">Escolha uma conversa na lista para ver os detalhes</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AtendimentoConversas;
