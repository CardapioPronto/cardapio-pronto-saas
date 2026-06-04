import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquareQuote, Send, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/sonner-toast";
import {
  listMyLandingTestimonials,
  submitLandingTestimonial,
} from "@/services/landingTestimonialsService";

const statusLabel: Record<string, string> = {
  pending: "Em análise",
  published: "Publicado",
  rejected: "Não aprovado",
  archived: "Arquivado",
};

export const TestimonialSubmissionPanel = () => {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [authorRole, setAuthorRole] = useState("");
  const [rating, setRating] = useState(5);

  const { data: testimonials } = useQuery({
    queryKey: ["my-landing-testimonials"],
    queryFn: async () => {
      const { data, error } = await listMyLandingTestimonials();
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const { error } = await submitLandingTestimonial({
        message,
        authorName,
        authorRole,
        rating,
      });

      if (error) throw new Error(error.message);
    },
    onSuccess: async () => {
      toast.success("Depoimento enviado para análise. Obrigado por contribuir!");
      setMessage("");
      setAuthorName("");
      setAuthorRole("");
      setRating(5);
      await queryClient.invalidateQueries({ queryKey: ["my-landing-testimonials"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Erro ao enviar depoimento.");
    },
  });

  const canSubmit = message.trim().length >= 20 && !submitMutation.isPending;

  return (
    <div className="space-y-4 rounded-md border p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-green/10 text-green">
          <MessageSquareQuote className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">Depoimento para a landing page</h3>
          <p className="text-sm text-muted-foreground">
            Envie uma mensagem sobre sua experiência com o Pubfy. A publicação passa por análise do nosso time.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="testimonial-author-name">Nome para exibição</Label>
          <Input
            id="testimonial-author-name"
            value={authorName}
            onChange={(event) => setAuthorName(event.target.value)}
            placeholder="Seu nome ou nome do responsável"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="testimonial-author-role">Cargo ou contexto</Label>
          <Input
            id="testimonial-author-role"
            value={authorRole}
            onChange={(event) => setAuthorRole(event.target.value)}
            placeholder="Dono, gerente, operador..."
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="testimonial-message">Mensagem</Label>
        <Textarea
          id="testimonial-message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Conte como o Pubfy ajudou sua operação, atendimento, vendas diretas ou organização do restaurante."
          maxLength={700}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Mínimo de 20 caracteres.</span>
          <span>{message.length}/700</span>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              className="rounded-sm text-orange transition hover:scale-105"
              onClick={() => setRating(value)}
              aria-label={`Avaliar com ${value} estrelas`}
            >
              <Star className={`h-5 w-5 ${value <= rating ? "fill-orange" : ""}`} />
            </button>
          ))}
        </div>
        <Button onClick={() => submitMutation.mutate()} disabled={!canSubmit}>
          <Send className="mr-2 h-4 w-4" />
          Enviar depoimento
        </Button>
      </div>

      {!!testimonials?.length && (
        <div className="space-y-2 border-t pt-4">
          <p className="text-sm font-medium">Últimos envios</p>
          <div className="space-y-2">
            {testimonials.map((testimonial) => (
              <div key={testimonial.id} className="flex flex-col gap-2 rounded-md bg-muted/40 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                <span className="line-clamp-1 text-muted-foreground">{testimonial.message}</span>
                <Badge variant={testimonial.status === "published" ? "default" : "outline"}>
                  {statusLabel[testimonial.status] || testimonial.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
