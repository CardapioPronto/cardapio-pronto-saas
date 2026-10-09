export interface WaitlistTimingEntry {
  status: string;
  created_at: string;
  seated_at: string | null;
}

/** Minutos inteiros entre duas datas (nunca negativo). */
export const minutesBetween = (from: string, to: Date | string = new Date()) =>
  Math.max(0, Math.floor((new Date(to).getTime() - new Date(from).getTime()) / 60000));

/** Tempo médio de espera (minutos) de quem já sentou; null se não há base. */
export function averageWaitMinutes(entries: WaitlistTimingEntry[]): number | null {
  const seated = entries.filter((e) => e.status === "seated" && e.seated_at);
  if (seated.length === 0) return null;
  const total = seated.reduce((sum, e) => sum + minutesBetween(e.created_at, e.seated_at as string), 0);
  return Math.round(total / seated.length);
}

/** Estimativa simples: posição × média (padrão 10 min por grupo à frente). */
export function estimateWaitMinutes(position: number, average: number | null): number {
  if (position <= 0) return 0;
  return position * (average && average > 0 ? average : 10);
}

/** Link de WhatsApp avisando que a mesa está pronta. */
export function buildWhatsAppCallLink(phone: string, name: string, restaurant: string) {
  let digits = phone.replace(/\D/g, "");
  if (!digits.startsWith("55")) digits = `55${digits}`;
  const text = `Olá, ${name}! Sua mesa no ${restaurant} está pronta. Pode se dirigir à recepção.`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
