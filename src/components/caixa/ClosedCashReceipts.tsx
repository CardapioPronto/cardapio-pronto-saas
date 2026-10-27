import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import CashReceiptButton from "./CashReceiptButton";
import { Button } from "@/components/ui/button";
import { reportMoney } from "@/lib/cashClosingReport";
type Row = { id: string; kind: string; amount: number; reason: string; receipt_reference: string | null; receipt_path: string | null };
export default function ClosedCashReceipts({ restaurantId, sessionId }: { restaurantId: string; sessionId: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [more, setMore] = useState(false);
  useEffect(() => {
    let active = true; setLoading(true); setError(false);
    void supabase.from("cash_movements").select("id,kind,amount,reason,receipt_reference,receipt_path")
      .eq("restaurant_id", restaurantId).eq("session_id", sessionId).order("created_at").order("id").range(page * 25, page * 25 + 25)
      .then(({ data, error }) => { if (!active) return; setError(Boolean(error)); setRows((data ?? []).slice(0, 25)); setMore((data ?? []).length > 25); setLoading(false); });
    return () => { active = false; };
  }, [restaurantId, sessionId, page]);
  return <section className="space-y-3"><h3 className="font-semibold">Movimentos e comprovantes</h3>
    {loading ? <p role="status">Carregando movimentos…</p> : error ? <p role="alert" className="text-destructive">Movimentos indisponíveis.</p> : rows.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum movimento registrado.</p> : rows.map(row => <div key={row.id} className="flex flex-wrap items-center justify-between gap-2 border-b py-2"><div className="min-w-0 text-sm"><p>{row.kind === "sangria" ? "Sangria" : "Suprimento"} · {reportMoney(Number(row.amount))}</p><p className="break-words text-muted-foreground">{row.reason} {row.receipt_reference && `· ${row.receipt_reference}`}</p></div>{row.receipt_path && <CashReceiptButton path={row.receipt_path} />}</div>)}
    {(page > 0 || more) && <div className="flex gap-2"><Button variant="outline" disabled={loading || page === 0} onClick={() => setPage(p => p - 1)}>Anterior</Button><Button variant="outline" disabled={loading || !more} onClick={() => setPage(p => p + 1)}>Próxima</Button></div>}
  </section>;
}