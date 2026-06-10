import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendManagedEmail } from "./email-delivery.ts";

type SupabaseAdmin = SupabaseClient;

function referralPanelUrl() {
  const base = (Deno.env.get("PUBLIC_SITE_URL") || Deno.env.get("SITE_URL") || "https://pubfy.com.br")
    .replace(/\/+$/, "");
  return `${base}/indique/painel`;
}

function formatBrlFromCents(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function referralNameVariable(displayName: string | null | undefined) {
  const trimmed = displayName?.trim();
  return trimmed ? ` ${trimmed}` : "";
}

async function getUserEmail(admin: SupabaseAdmin, userId: string) {
  const { data, error } = await admin
    .from("users")
    .select("email, name")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data?.email) return null;
  return { email: data.email, name: data.name };
}

export async function sendReferralCommissionPendingEmail(
  admin: SupabaseAdmin,
  options: {
    referrerUserId: string;
    commissionAmountCents: number;
    holdDays: number;
  },
) {
  const recipient = await getUserEmail(admin, options.referrerUserId);
  if (!recipient) return;

  const amount = formatBrlFromCents(options.commissionAmountCents);

  await sendManagedEmail({
    admin,
    templateKey: "referral_commission_pending",
    emailType: "transactional",
    to: recipient.email,
    recipientName: recipient.name,
    variables: {
      name: referralNameVariable(recipient.name),
      amount,
      hold_days: String(options.holdDays),
      panel_url: referralPanelUrl(),
    },
    subject: "Nova comissão de indicação registrada",
    html: `
      <p>Olá${recipient.name ? `, ${recipient.name}` : ""},</p>
      <p>Registramos uma nova comissão de <strong>${amount}</strong> no programa de indicações Pubfy.</p>
      <p>Ela ficará em carência por ${options.holdDays} dias após o pagamento do restaurante indicado. Depois disso, entrará no saldo disponível para saque.</p>
      <p><a href="${referralPanelUrl()}">Abrir painel de indicações</a></p>
    `,
    text: `Nova comissão de ${amount} registrada. Carência de ${options.holdDays} dias. Painel: ${referralPanelUrl()}`,
    contextType: "referral_commission",
    metadata: { source: "referral_program", type: "commission_pending" },
  });
}

export async function sendReferralCommissionsApprovedEmail(
  admin: SupabaseAdmin,
  options: {
    referrerUserId: string;
    totalAmountCents: number;
    count: number;
  },
) {
  const recipient = await getUserEmail(admin, options.referrerUserId);
  if (!recipient) return;

  const amount = formatBrlFromCents(options.totalAmountCents);

  await sendManagedEmail({
    admin,
    templateKey: "referral_commissions_approved",
    emailType: "transactional",
    to: recipient.email,
    recipientName: recipient.name,
    variables: {
      name: referralNameVariable(recipient.name),
      amount,
      count: String(options.count),
      panel_url: referralPanelUrl(),
    },
    subject: "Comissões de indicação aprovadas",
    html: `
      <p>Olá${recipient.name ? `, ${recipient.name}` : ""},</p>
      <p>${options.count} comissão(ões) no total de <strong>${amount}</strong> foram aprovadas e já podem ser incluídas na sua próxima solicitação de saque.</p>
      <p><a href="${referralPanelUrl()}">Ver saldo no painel</a></p>
    `,
    text: `Comissões aprovadas: ${amount}. Painel: ${referralPanelUrl()}`,
    contextType: "referral_commission",
    metadata: { source: "referral_program", type: "commission_approved" },
  });
}

export async function sendReferralPayoutPaidEmail(
  admin: SupabaseAdmin,
  options: {
    userId: string;
    amountCents: number;
  },
) {
  const recipient = await getUserEmail(admin, options.userId);
  if (!recipient) return;

  const amount = formatBrlFromCents(options.amountCents);

  await sendManagedEmail({
    admin,
    templateKey: "referral_payout_paid",
    emailType: "transactional",
    to: recipient.email,
    recipientName: recipient.name,
    variables: {
      name: referralNameVariable(recipient.name),
      amount,
      panel_url: referralPanelUrl(),
    },
    subject: "Saque do programa de indicações processado",
    html: `
      <p>Olá${recipient.name ? `, ${recipient.name}` : ""},</p>
      <p>Seu saque de <strong>${amount}</strong> no programa de indicações Pubfy foi marcado como pago.</p>
      <p>Confira sua conta PIX cadastrada no programa.</p>
      <p><a href="${referralPanelUrl()}">Abrir painel</a></p>
    `,
    text: `Saque de ${amount} processado. Painel: ${referralPanelUrl()}`,
    contextType: "referral_payout",
    metadata: { source: "referral_program", type: "payout_paid" },
  });
}

export type MatureEntry = {
  ledger_id: string;
  referrer_user_id: string;
  commission_amount_cents: number;
};

export async function notifyMaturedReferralCommissions(
  admin: SupabaseAdmin,
  entries: MatureEntry[],
) {
  if (!entries.length) return;

  const byUser = new Map<string, { total: number; count: number; ledgerIds: string[] }>();

  for (const entry of entries) {
    const current = byUser.get(entry.referrer_user_id) ?? { total: 0, count: 0, ledgerIds: [] };
    current.total += Number(entry.commission_amount_cents || 0);
    current.count += 1;
    current.ledgerIds.push(entry.ledger_id);
    byUser.set(entry.referrer_user_id, current);
  }

  for (const [userId, summary] of byUser) {
    await sendReferralCommissionsApprovedEmail(admin, {
      referrerUserId: userId,
      totalAmountCents: summary.total,
      count: summary.count,
    });

    const { error } = await admin.rpc("mark_referral_commissions_notified", {
      p_ledger_ids: summary.ledgerIds,
    });
    if (error) {
      console.warn("[referral-notify] mark notified failed:", error.message);
    }
  }
}
