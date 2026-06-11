import React from "react";
import { useLocation } from "react-router-dom";
import { Copy, Headphones, Mail } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { useCurrentUser } from "@/hooks/useCurrentUser";

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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Abrir suporte com contexto">
          <Headphones className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Suporte com contexto</DialogTitle>
          <DialogDescription>
            Envie a descricao junto com os dados tecnicos da tela atual.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
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
            <Label htmlFor="support-context">Contexto que sera enviado</Label>
            <Textarea id="support-context" value={context} readOnly className="min-h-48 font-mono text-xs" />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={copySupportContext}>
            <Copy className="mr-2 h-4 w-4" />
            Copiar contexto
          </Button>
          <Button type="button" onClick={openEmail}>
            <Mail className="mr-2 h-4 w-4" />
            Abrir email
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
