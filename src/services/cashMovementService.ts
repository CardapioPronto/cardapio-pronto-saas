import { supabase } from "@/integrations/supabase/client";

export type CashMovementKind = "sangria" | "suprimento";
export interface CashMovement {
  id: string;
  restaurant_id: string;
  session_id: string;
  kind: CashMovementKind;
  amount: number;
  reason: string;
  receipt_reference: string | null;
  created_by: string;
  created_at: string;
  actorName?: string | null;
}

/** Sangrias saem da gaveta, suprimentos entram. Retorna o líquido retirado (sangrias − suprimentos). */
export function summarizeCashMovements(movements: Pick<CashMovement, "kind" | "amount">[]) {
  const round = (v: number) => Math.round(v * 100) / 100;
  const withdrawals = round(movements.filter(m => m.kind === "sangria").reduce((s, m) => s + Number(m.amount), 0));
  const supplies = round(movements.filter(m => m.kind === "suprimento").reduce((s, m) => s + Number(m.amount), 0));
  return { withdrawals, supplies, netWithdrawals: round(withdrawals - supplies) };
}

export function validateCashMovement(input: { amount: number; reason: string; receipt?: string }) {
  if (!Number.isFinite(input.amount) || input.amount <= 0) return "Informe um valor maior que zero.";
  if (input.amount > 1_000_000) return "Valor acima do limite permitido.";
  const reason = input.reason.trim();
  if (reason.length < 3) return "Informe o motivo (mínimo 3 caracteres).";
  if (reason.length > 300) return "Motivo muito longo (máximo 300 caracteres).";
  if ((input.receipt ?? "").trim().length > 120) return "Referência do comprovante muito longa.";
  return null;
}

const table = () => supabase.from("cash_movements");

export async function fetchSessionMovements(sessionId: string): Promise<CashMovement[]> {
  const { data, error } = await table().select("*").eq("session_id", sessionId)
    .order("created_at", { ascending: true }).order("id", { ascending: true });
  if (error) throw error;
  const rows = (data ?? []) as unknown as CashMovement[];
  const ids = [...new Set(rows.map(r => r.created_by))];
  const names = new Map<string, string>();
  if (ids.length) {
    const { data: users } = await supabase.rpc("get_users_basic_info", { _user_ids: ids });
    for (const u of users ?? []) names.set(u.id, u.name);
  }
  return rows.map(r => ({ ...r, amount: Number(r.amount), actorName: names.get(r.created_by) ?? null }));
}

export async function addCashMovement(params: {
  restaurantId: string; sessionId: string; kind: CashMovementKind; amount: number; reason: string; receipt?: string;
}) {
  const invalid = validateCashMovement(params);
  if (invalid) throw new Error(invalid);
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Sessão expirada. Entre novamente.");
  const { error } = await table().insert({
    restaurant_id: params.restaurantId,
    session_id: params.sessionId,
    kind: params.kind,
    amount: Math.round(params.amount * 100) / 100,
    reason: params.reason.trim(),
    receipt_reference: params.receipt?.trim() || null,
    created_by: auth.user.id,
  } as never);
  if (error) throw error;
}
