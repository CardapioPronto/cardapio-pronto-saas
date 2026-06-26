import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export type SupportTicketPriority = "low" | "normal" | "high" | "urgent";

export interface CreateSupportTicketInput {
  restaurantId?: string | null;
  requesterId: string;
  requesterName?: string | null;
  requesterEmail?: string | null;
  screenTitle: string;
  pathname: string;
  subject: string;
  message: string;
  context: string;
  priority: SupportTicketPriority;
  metadata?: Json;
}

export interface CreatedSupportTicket {
  id: string;
  status: string;
  createdAt: string;
}

const normalizeTicketText = (value: string, fallback: string) => {
  const normalized = value.trim();
  return normalized || fallback;
};

export const createSupportTicket = async (input: CreateSupportTicketInput): Promise<CreatedSupportTicket> => {
  const message = normalizeTicketText(input.message, "");
  if (message.length < 3) {
    throw new Error("Descreva o que aconteceu antes de abrir o chamado.");
  }

  const { data, error } = await supabase
    .from("support_tickets")
    .insert({
      restaurant_id: input.restaurantId || null,
      requester_id: input.requesterId,
      requester_name: input.requesterName || null,
      requester_email: input.requesterEmail || null,
      screen_title: normalizeTicketText(input.screenTitle, "Tela nao identificada"),
      pathname: normalizeTicketText(input.pathname, "/"),
      subject: normalizeTicketText(input.subject, "Suporte Pubfy"),
      message,
      context: normalizeTicketText(input.context, "Contexto indisponivel"),
      priority: input.priority,
      metadata: input.metadata || {},
    })
    .select("id, status, created_at")
    .single();

  if (error) throw error;

  return {
    id: data.id,
    status: data.status,
    createdAt: data.created_at,
  };
};
