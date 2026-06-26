import React from "react";
import { useLocation } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Headphones, History, Lightbulb, ListChecks, Mail, MessageSquareText, Send } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { getSupportKnowledgeForPath } from "@/components/support/supportKnowledgeBase";
import { cn } from "@/lib/utils";
import {
  addSupportTicketComment,
  createSupportTicket,
  listMySupportTickets,
  listSupportTicketEvents,
  type SupportTicketPriority,
  type SupportTicketStatus,
} from "@/services/supportTicketService";

const SUPPORT_EMAIL = "contato@pubfy.com.br";

interface SupportContextButtonProps {
  title: string;
}

const ticketStatusLabels: Record<SupportTicketStatus, string> = {
  open: "Aberto",
  in_progress: "Em atendimento",
  waiting_customer: "Aguardando cliente",
  resolved: "Resolvido",
  closed: "Fechado",
};

const ticketStatusClasses: Record<SupportTicketStatus, string> = {
  open: "border-red-200 bg-red-50 text-red-700",
  in_progress: "border-sky-200 bg-sky-50 text-sky-800",
  waiting_customer: "border-amber-200 bg-amber-50 text-amber-800",
  resolved: "border-green/30 bg-green/10 text-green",
  closed: "border-muted bg-muted text-muted-foreground",
};

const ticketEventLabels: Record<string, string> = {
  created: "Chamado aberto",
  status_changed: "Status alterado",
  comment: "Comentario",
  system_note: "Nota",
};

const getCurrentUrl = () => {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}${window.location.pathname}${window.location.search}`;
};

const getBrowserContext = () => {
  if (typeof navigator === "undefined") return "Navegador indisponivel";

  return [
    `Online: ${navigator.onLine ? "sim" : "nao"}`,
    `Idioma: ${navigator.language || "-"}`,
    `Navegador: ${navigator.userAgent || "-"}`,
  ].join("\n");
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));

export const SupportContextButton = ({ title }: SupportContextButtonProps) => {
  const location = useLocation();
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [priority, setPriority] = React.useState<SupportTicketPriority>("normal");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [selectedTicketId, setSelectedTicketId] = React.useState<string | null>(null);
  const [replyMessage, setReplyMessage] = React.useState("");
  const knowledge = React.useMemo(() => getSupportKnowledgeForPath(location.pathname), [location.pathname]);

  const { data: supportTickets = [], isLoading: isLoadingTickets } = useQuery({
    queryKey: ["my-support-tickets", user?.id, user?.restaurant_id],
    queryFn: () => listMySupportTickets(),
    enabled: open && !!user?.id,
  });

  const selectedTicket = React.useMemo(
    () => supportTickets.find((ticket) => ticket.id === selectedTicketId) || null,
    [selectedTicketId, supportTickets],
  );

  const { data: selectedTicketEvents = [], isLoading: isLoadingTicketEvents } = useQuery({
    queryKey: ["support-ticket-events", selectedTicketId],
    queryFn: () => listSupportTicketEvents(selectedTicketId || ""),
    enabled: open && !!selectedTicketId,
  });

  React.useEffect(() => {
    if (!selectedTicketId && supportTickets.length > 0) {
      setSelectedTicketId(supportTickets[0].id);
    }
  }, [selectedTicketId, supportTickets]);

  const addCommentMutation = useMutation({
    mutationFn: (payload: { ticketId: string; message: string }) => {
      if (!user?.id) throw new Error("Usuario nao autenticado.");
      return addSupportTicketComment({
        ticketId: payload.ticketId,
        message: payload.message,
        actorId: user.id,
        actorName: user.name,
        actorEmail: user.email,
      });
    },
    onSuccess: () => {
      toast.success("Resposta registrada no chamado.");
      setReplyMessage("");
      queryClient.invalidateQueries({ queryKey: ["support-ticket-events", selectedTicketId] });
    },
    onError: (error) => {
      console.error("Erro ao responder chamado:", error);
      toast.error("Nao foi possivel registrar a resposta.");
    },
  });

  const context = React.useMemo(() => {
    const timestamp = new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "medium",
    }).format(new Date());

    return [
      "Contexto do suporte Pubfy",
      `Tela: ${title}`,
      `Caminho: ${location.pathname}${location.search}`,
      `URL: ${getCurrentUrl()}`,
      `Data/hora: ${timestamp}`,
      `Usuario: ${user?.name || "-"} <${user?.email || "-"}>`,
      `Restaurante ID: ${user?.restaurant_id || "-"}`,
      `Versao: ${import.meta.env.VITE_APP_VERSION || import.meta.env.VITE_SENTRY_RELEASE || "local"}`,
      "",
      getBrowserContext(),
    ].join("\n");
  }, [location.pathname, location.search, title, user?.email, user?.name, user?.restaurant_id]);

  const fullMessage = React.useMemo(() => {
    return [`Mensagem do usuario:`, message.trim() || "(sem descricao)", "", context].join("\n");
  }, [context, message]);

  const copySupportContext = async () => {
    try {
      await navigator.clipboard.writeText(fullMessage);
      toast.success("Contexto de suporte copiado.");
    } catch (error) {
      console.error("Erro ao copiar contexto de suporte:", error);
      toast.error("Nao foi possivel copiar o contexto.");
    }
  };

  const openEmail = () => {
    const subject = encodeURIComponent(`Suporte Pubfy - ${title}`);
    const body = encodeURIComponent(fullMessage);
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
  };

  const submitTicket = async () => {
    if (!user?.id) {
      toast.error("Entre na conta para abrir um chamado pelo app.");
      return;
    }

    const cleanMessage = message.trim();
    if (cleanMessage.length < 3) {
      toast.error("Descreva rapidamente o que aconteceu.");
      return;
    }

    setIsSubmitting(true);
    try {
      const ticket = await createSupportTicket({
        restaurantId: user.restaurant_id,
        requesterId: user.id,
        requesterName: user.name,
        requesterEmail: user.email,
        screenTitle: title,
        pathname: `${location.pathname}${location.search}`,
        subject: `Suporte Pubfy - ${title}`,
        message: cleanMessage,
        context,
        priority,
        metadata: {
          url: getCurrentUrl(),
          appVersion: import.meta.env.VITE_APP_VERSION || import.meta.env.VITE_SENTRY_RELEASE || "local",
          browser: typeof navigator === "undefined" ? null : navigator.userAgent,
          online: typeof navigator === "undefined" ? null : navigator.onLine,
        },
      });

      toast.success(`Chamado aberto: ${ticket.id.slice(0, 8)}.`);
      setMessage("");
      setPriority("normal");
      setSelectedTicketId(ticket.id);
      queryClient.invalidateQueries({ queryKey: ["my-support-tickets", user.id, user.restaurant_id] });
    } catch (error) {
      console.error("Erro ao abrir chamado de suporte:", error);
      toast.error("Nao foi possivel abrir o chamado. Voce ainda pode copiar o contexto ou abrir email.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitTicketReply = () => {
    if (!selectedTicketId) return;
    addCommentMutation.mutate({
      ticketId: selectedTicketId,
      message: replyMessage,
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setReplyMessage("");
          setSelectedTicketId(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Abrir suporte com contexto">
          <Headphones className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Suporte com contexto</DialogTitle>
          <DialogDescription>
            Veja orientacoes rapidas ou envie a descricao junto com os dados tecnicos da tela atual.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border bg-muted/25 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-medium">{knowledge.title}</h3>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <ListChecks className="h-3.5 w-3.5" />
                  Passos rapidos
                </div>
                <ol className="space-y-2 text-sm text-muted-foreground">
                  {knowledge.tutorials.map((step, index) => (
                    <li key={step} className="flex gap-2">
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-background text-xs font-medium text-foreground">
                        {index + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div>
                <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <Headphones className="h-3.5 w-3.5" />
                  Problemas comuns
                </div>
                <div className="space-y-2">
                  {knowledge.commonIssues.map((issue) => (
                    <div key={issue.title} className="rounded-md border bg-background p-3">
                      <p className="text-sm font-medium">{issue.title}</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{issue.resolution}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="support-user-message">O que aconteceu?</Label>
            <Textarea
              id="support-user-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Descreva o problema, o pedido afetado ou o passo que tentou executar."
              className="min-h-28"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="support-priority">Prioridade</Label>
            <select
              id="support-priority"
              value={priority}
              onChange={(event) => setPriority(event.target.value as SupportTicketPriority)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="low">Baixa</option>
              <option value="normal">Normal</option>
              <option value="high">Alta</option>
              <option value="urgent">Urgente</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="support-context">Contexto que sera enviado</Label>
            <Textarea id="support-context" value={context} readOnly className="min-h-48 font-mono text-xs" />
          </div>

          {user?.id ? (
            <>
              <Separator />

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <MessageSquareText className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-medium">Chamados recentes</h3>
                </div>

                {isLoadingTickets ? (
                  <div className="rounded-md border p-4 text-sm text-muted-foreground">Carregando chamados...</div>
                ) : supportTickets.length === 0 ? (
                  <div className="rounded-md border p-4 text-sm text-muted-foreground">
                    Nenhum chamado aberto por este restaurante ainda.
                  </div>
                ) : (
                  <div className="grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
                    <div className="space-y-2">
                      {supportTickets.map((ticket) => (
                        <button
                          key={ticket.id}
                          type="button"
                          onClick={() => setSelectedTicketId(ticket.id)}
                          className={cn(
                            "w-full rounded-md border bg-background p-3 text-left transition-colors hover:bg-muted/40",
                            selectedTicketId === ticket.id && "border-primary bg-primary/5",
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium">{ticket.subject}</span>
                            <Badge className={cn("border", ticketStatusClasses[ticket.status])}>
                              {ticketStatusLabels[ticket.status]}
                            </Badge>
                          </div>
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{ticket.message}</p>
                          <p className="mt-2 text-xs text-muted-foreground">{formatDate(ticket.createdAt)}</p>
                        </button>
                      ))}
                    </div>

                    <div className="rounded-md border p-4">
                      {!selectedTicket ? (
                        <div className="py-8 text-center text-sm text-muted-foreground">
                          Selecione um chamado para ver o historico.
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <History className="h-4 w-4 text-primary" />
                              <h4 className="text-sm font-medium">Historico</h4>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {selectedTicket.screenTitle} · {selectedTicket.pathname}
                            </p>
                          </div>

                          <div className="space-y-2">
                            <Textarea
                              value={replyMessage}
                              onChange={(event) => setReplyMessage(event.target.value)}
                              placeholder="Responder ou complementar este chamado."
                              className="min-h-24"
                            />
                            <Button
                              type="button"
                              size="sm"
                              onClick={submitTicketReply}
                              disabled={addCommentMutation.isPending || replyMessage.trim().length < 3}
                            >
                              <Send className="mr-2 h-4 w-4" />
                              {addCommentMutation.isPending ? "Enviando..." : "Responder chamado"}
                            </Button>
                          </div>

                          {isLoadingTicketEvents ? (
                            <div className="py-6 text-center text-sm text-muted-foreground">Carregando historico...</div>
                          ) : selectedTicketEvents.length === 0 ? (
                            <div className="py-6 text-center text-sm text-muted-foreground">Sem eventos registrados.</div>
                          ) : (
                            <div className="max-h-72 space-y-2 overflow-auto pr-1">
                              {selectedTicketEvents.map((event) => (
                                <div key={event.id} className="rounded-md border bg-muted/20 p-3">
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <p className="text-sm font-medium">
                                        {ticketEventLabels[event.eventType] || event.eventType}
                                      </p>
                                      <p className="mt-1 text-xs text-muted-foreground">
                                        {event.actorRole === "customer" ? "Voce" : event.actorName || "Atendimento"}
                                      </p>
                                    </div>
                                    <span className="text-xs text-muted-foreground">{formatDate(event.createdAt)}</span>
                                  </div>
                                  {event.oldStatus && event.newStatus ? (
                                    <p className="mt-2 text-xs text-muted-foreground">
                                      {ticketStatusLabels[event.oldStatus]} &gt; {ticketStatusLabels[event.newStatus]}
                                    </p>
                                  ) : null}
                                  {event.message ? (
                                    <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{event.message}</p>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={copySupportContext}>
            <Copy className="mr-2 h-4 w-4" />
            Copiar contexto
          </Button>
          <Button type="button" variant="outline" onClick={openEmail}>
            <Mail className="mr-2 h-4 w-4" />
            Abrir email
          </Button>
          <Button type="button" onClick={submitTicket} disabled={isSubmitting || message.trim().length < 3}>
            <Send className="mr-2 h-4 w-4" />
            {isSubmitting ? "Abrindo..." : "Criar chamado"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
