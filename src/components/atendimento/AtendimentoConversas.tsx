import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, MessageSquare, Bot, User, XCircle, Clock, Loader2, AlertTriangle } from "lucide-react";
import { useConversations } from "@/hooks/useConversations";
import { useConversationDetail } from "@/hooks/useConversationDetail";
import { useWhatsAppInstances } from "@/hooks/useWhatsAppInstances";
import { usePermissionsV2 } from "@/hooks/usePermissionsV2";
import { ConversationThread, ThreadStatus } from "@/types/atendimento";
import ConversationDetailPanel from "./ConversationDetailPanel";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusConfig: Record<ThreadStatus, { label: string; icon: React.ReactNode; color: string }> = {
  bot_active: { label: "IA", icon: <Bot className="h-3 w-3" />, color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
  waiting_human: { label: "Aguardando", icon: <Clock className="h-3 w-3" />, color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300" },
  human_active: { label: "Humano", icon: <User className="h-3 w-3" />, color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
  closed: { label: "Encerrada", icon: <XCircle className="h-3 w-3" />, color: "bg-muted text-muted-foreground" },
};

function ThreadItem({ thread, isActive, onClick }: {
  thread: ConversationThread;
  isActive: boolean;
  onClick: () => void;
}) {
  const statusInfo = statusConfig[thread.status];
  const isWaiting = thread.status === 'waiting_human';
  const timeAgo = thread.last_message_at
    ? formatDistanceToNow(new Date(thread.last_message_at), { addSuffix: true, locale: ptBR })
    : '';

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg border transition-all duration-150 ${
        isActive
          ? 'bg-primary/10 border-primary/30 shadow-sm'
          : isWaiting
            ? 'bg-yellow-50/80 border-yellow-200 hover:bg-yellow-50 dark:bg-yellow-900/10 dark:border-yellow-800/30'
            : 'hover:bg-muted/50 border-transparent'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {isWaiting && <AlertTriangle className="h-3.5 w-3.5 text-yellow-600 flex-shrink-0" />}
            <span className="font-medium text-sm truncate text-foreground">
              {thread.customer_name || thread.customer_phone}
            </span>
            {(thread.unread_count ?? 0) > 0 && (
              <Badge variant="destructive" className="h-5 min-w-[20px] px-1 text-xs">
                {thread.unread_count}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {thread.last_message_preview || 'Sem mensagens'}
          </p>
          {thread.assigned_to && (
            <div className="flex items-center gap-1 mt-1">
              <User className="h-2.5 w-2.5 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">Atribuída</span>
            </div>
          )}
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
  const [instanceFilter, setInstanceFilter] = useState<string>("all");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);

  const { instances } = useWhatsAppInstances();
  const { isOwner, isSuperAdmin, hasPermission } = usePermissionsV2();

  const hasFullWhatsAppAccess = isOwner() || isSuperAdmin() || hasPermission('whatsapp_manage');
  const canManageConversations = hasFullWhatsAppAccess || hasPermission('whatsapp_take_conversations');
  const canReplyAsHuman = hasFullWhatsAppAccess || hasPermission('whatsapp_reply_as_human');

  const filters = {
    status: statusFilter !== 'all' ? statusFilter as ThreadStatus : undefined,
    instanceId: instanceFilter !== 'all' ? instanceFilter : undefined,
    search: search || undefined,
  };

  const { threads: rawThreads, loading, totalUnread } = useConversations(filters);
  const conversationDetail = useConversationDetail(selectedThreadId);

  // Client-side unread filter
  const threads = unreadOnly ? rawThreads.filter(t => (t.unread_count ?? 0) > 0) : rawThreads;

  return (
    <div className="flex gap-0 h-[calc(100vh-260px)] min-h-[520px] rounded-xl border bg-card overflow-hidden shadow-sm">
      {/* Thread List Sidebar */}
      <div className="w-full max-w-[380px] flex flex-col border-r bg-card">
        {/* Filters header */}
        <div className="p-3 border-b space-y-2">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm flex-1 text-foreground">
              Conversas
              {totalUnread > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 text-xs">{totalUnread}</Badge>
              )}
            </h3>
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou telefone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>

          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 text-xs flex-1">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="bot_active">IA ativa</SelectItem>
                <SelectItem value="waiting_human">Aguardando humano</SelectItem>
                <SelectItem value="human_active">Atendimento humano</SelectItem>
                <SelectItem value="closed">Encerradas</SelectItem>
              </SelectContent>
            </Select>

            {instances.length > 1 && (
              <Select value={instanceFilter} onValueChange={setInstanceFilter}>
                <SelectTrigger className="h-8 text-xs flex-1">
                  <SelectValue placeholder="Instância" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas instâncias</SelectItem>
                  {instances.map(inst => (
                    <SelectItem key={inst.id} value={inst.id}>{inst.instance_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="unread-only"
              checked={unreadOnly}
              onCheckedChange={(checked) => setUnreadOnly(checked === true)}
            />
            <label htmlFor="unread-only" className="text-xs text-muted-foreground cursor-pointer">
              Apenas não lidas
            </label>
          </div>
        </div>

        {/* Thread list */}
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : threads.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm font-medium">Nenhuma conversa encontrada</p>
                <p className="text-xs mt-1">Ajuste os filtros ou aguarde novas mensagens</p>
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
      </div>

      {/* Conversation Detail */}
      <div className="flex h-full min-w-0 flex-1 flex-col">
        {selectedThreadId ? (
          <ConversationDetailPanel
            {...conversationDetail}
            canManage={canManageConversations}
            canReply={canReplyAsHuman}
            isOwnerOrAdmin={isOwner() || isSuperAdmin()}
          />
        ) : (
          <div className="h-full flex items-center justify-center bg-muted/20">
            <div className="text-center text-muted-foreground">
              <MessageSquare className="h-14 w-14 mx-auto mb-4 opacity-30" />
              <h3 className="font-semibold text-base mb-1">Selecione uma conversa</h3>
              <p className="text-sm max-w-[260px]">
                Escolha uma conversa na lista ao lado para visualizar mensagens e interagir
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AtendimentoConversas;
