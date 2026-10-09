import { supabase } from "@/integrations/supabase/client";

export type WaitlistStatus = "waiting" | "notified" | "seated" | "canceled" | "no_show";

export interface WaitlistEntry {
  id: string;
  restaurant_id: string;
  public_token: string;
  customer_name: string;
  customer_phone: string | null;
  party_size: number;
  status: WaitlistStatus;
  source: "staff" | "public";
  notes: string | null;
  mesa_id: string | null;
  notified_at: string | null;
  seated_at: string | null;
  finished_at: string | null;
  created_at: string;
}

export interface PublicWaitlistStatus {
  restaurantName: string;
  customerName: string;
  partySize: number;
  status: WaitlistStatus;
  position: number;
  createdAt: string;
  notifiedAt: string | null;
}

// A tabela é nova e ainda não está nos tipos gerados; isolamos o cast aqui.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export async function fetchTodayWaitlist(restaurantId: string): Promise<WaitlistEntry[]> {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  const { data, error } = await db
    .from("waitlist_entries")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .or(`status.in.(waiting,notified),created_at.gte.${since.toISOString()}`)
    .order("created_at", { ascending: true })
    .limit(300);
  if (error) throw error;
  return (data ?? []) as WaitlistEntry[];
}

export async function addWaitlistEntry(input: {
  restaurantId: string;
  name: string;
  phone: string;
  partySize: number;
  notes: string;
}) {
  const { data: auth } = await supabase.auth.getUser();
  const phone = input.phone.replace(/\D/g, "");
  const { error } = await db.from("waitlist_entries").insert({
    restaurant_id: input.restaurantId,
    customer_name: input.name.trim(),
    customer_phone: phone || null,
    party_size: input.partySize,
    notes: input.notes.trim() || null,
    source: "staff",
    created_by: auth.user?.id ?? null,
  });
  if (error) throw error;
}

export async function updateWaitlistStatus(id: string, status: WaitlistStatus, mesaId?: string | null) {
  const patch: Record<string, unknown> = { status };
  if (mesaId !== undefined) patch.mesa_id = mesaId;
  const { error } = await db.from("waitlist_entries").update(patch).eq("id", id);
  if (error) throw error;
}

export async function joinPublicWaitlist(slug: string, name: string, phone: string, partySize: number) {
  const { data, error } = await db.rpc("join_public_waitlist", {
    _slug: slug,
    _name: name,
    _phone: phone,
    _party_size: partySize,
  });
  if (error) throw error;
  return data as string;
}

export async function getPublicWaitlistStatus(token: string): Promise<PublicWaitlistStatus | null> {
  const { data, error } = await db.rpc("get_public_waitlist_status", { _token: token });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : null;
  if (!row) return null;
  return {
    restaurantName: row.out_restaurant_name,
    customerName: row.out_customer_name,
    partySize: row.out_party_size,
    status: row.out_status,
    position: row.out_queue_position,
    createdAt: row.out_created_at,
    notifiedAt: row.out_notified_at,
  };
}

export async function cancelPublicWaitlist(token: string) {
  const { error } = await db.rpc("cancel_public_waitlist", { _token: token });
  if (error) throw error;
}
