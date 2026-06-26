import React from "react";
import { useLocation } from "react-router-dom";
import { Copy, Headphones, Lightbulb, ListChecks, Mail, Send } from "lucide-react";
import { toast } from "sonner";

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
import { createSupportTicket, type SupportTicketPriority } from "@/services/supportTicketService";

const SUPPORT_EMAIL = "contato@pubfy.com.br";

interface SupportContextButtonProps {
  title: string;
}

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

export const SupportContextButton = ({ title }: SupportContextButtonProps) => {
  const location = useLocation();
  const { user } = useCurrentUser();
  const [open, setOpen] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [priority, setPriority] = React.useState<SupportTicketPriority>("normal");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const knowledge = React.useMemo(() => getSupportKnowledgeForPath(location.pathname), [location.pathname]);

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
      setOpen(false);
    } catch (error) {
      console.error("Erro ao abrir chamado de suporte:", error);
      toast.error("Nao foi possivel abrir o chamado. Voce ainda pode copiar o contexto ou abrir email.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Abrir suporte com contexto">
          <Headphones className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
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
