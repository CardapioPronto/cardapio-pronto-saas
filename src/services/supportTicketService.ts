import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export type SupportTicketPriority = "low" | "normal" | "high" | "urgent";
export type SupportTicketStatus = "open" | "in_progress" | "waiting_customer" | "resolved" | "closed";

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

export interface SupportTicketSummary {
  id: string;
  subject: string;
  message: string;
  screenTitle: string;
  pathname: string;
  priority: SupportTicketPriority;
  status: SupportTicketStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SupportTicketEvent {
  id: string;
  ticketId: string;
  eventType: string;
  actorName: string | null;
  actorEmail: string | null;
  actorRole: string;
  message: string | null;
  oldStatus: SupportTicketStatus | null;
  newStatus: SupportTicketStatus | null;
  createdAt: string;
}

export interface AddSupportTicketCommentInput {
  ticketId: string;
  message: string;
  actorId: string;
  actorName?: string | null;
  actorEmail?: string | null;
}

const normalizeTicketText = (value: string, fallback: string) => {
  const normalized = value.trim();
  return normalized || fallback;
};

const normalizeTicketPriority = (value: string): SupportTicketPriority => {
  if (value === "low" || value === "normal" || value === "high" || value === "urgent") return value;
  return "normal";
};

const normalizeTicketStatus = (value: string | null): SupportTicketStatus | null => {
  if (
    value === "open"
    || value === "in_progress"
    || value === "waiting_customer"
    || value === "resolved"
    || value === "closed"
  ) {
    return value;
  }
  return value ? "open" : null;
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

export const listMySupportTickets = async (limit = 5): Promise<SupportTicketSummary[]> => {
  const { data, error } = await supabase
    .from("support_tickets")
    .select("id, subject, message, screen_title, pathname, priority, status, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data || []).map((ticket) => ({
    id: ticket.id,
    subject: ticket.subject,
    message: ticket.message,
    screenTitle: ticket.screen_title,
    pathname: ticket.pathname,
    priority: normalizeTicketPriority(ticket.priority),
    status: normalizeTicketStatus(ticket.status) || "open",
    createdAt: ticket.created_at,
    updatedAt: ticket.updated_at,
  }));
};

export const listSupportTicketEvents = async (ticketId: string): Promise<SupportTicketEvent[]> => {
  const { data, error } = await supabase
    .from("support_ticket_events")
    .select("id, ticket_id, event_type, actor_name, actor_email, actor_role, message, old_status, new_status, created_at")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data || []).map((event) => ({
    id: event.id,
    ticketId: event.ticket_id,
    eventType: event.event_type,
    actorName: event.actor_name,
    actorEmail: event.actor_email,
    actorRole: event.actor_role,
    message: event.message,
    oldStatus: normalizeTicketStatus(event.old_status),
    newStatus: normalizeTicketStatus(event.new_status),
    createdAt: event.created_at,
  }));
};

export const addSupportTicketComment = async (
  input: AddSupportTicketCommentInput,
): Promise<SupportTicketEvent> => {
  const message = normalizeTicketText(input.message, "");
  if (message.length < 3) {
    throw new Error("Informe uma resposta com pelo menos 3 caracteres.");
  }

  const { data, error } = await supabase
    .from("support_ticket_events")
    .insert({
      ticket_id: input.ticketId,
      event_type: "comment",
      actor_id: input.actorId,
      actor_name: input.actorName || null,
      actor_email: input.actorEmail || null,
      actor_role: "customer",
      message,
    })
    .select("id, ticket_id, event_type, actor_name, actor_email, actor_role, message, old_status, new_status, created_at")
    .single();

  if (error) throw error;

  return {
    id: data.id,
    ticketId: data.ticket_id,
    eventType: data.event_type,
    actorName: data.actor_name,
    actorEmail: data.actor_email,
    actorRole: data.actor_role,
    message: data.message,
    oldStatus: normalizeTicketStatus(data.old_status),
    newStatus: normalizeTicketStatus(data.new_status),
    createdAt: data.created_at,
  };
};
