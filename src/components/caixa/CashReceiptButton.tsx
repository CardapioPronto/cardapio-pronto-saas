import { useState } from "react";
import { ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getCashReceiptUrl } from "@/services/cashReceiptService";
export default function CashReceiptButton({ path }: { path: string }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const show = async () => {
    setOpen(true); setUrl(""); setError("");
    try { setUrl(await getCashReceiptUrl(path)); } catch { setError("Não foi possível abrir o comprovante. Tente novamente."); }
  };
  return <>
    <Button variant="outline" size="sm" onClick={() => void show()}><ImageIcon className="mr-2 h-4 w-4" />Ver foto</Button>
    <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) setUrl(""); }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>Comprovante do movimento</DialogTitle><DialogDescription>Foto privada do lançamento</DialogDescription></DialogHeader>
        {error ? <p role="alert" className="text-destructive">{error}</p> : url ? <img src={url} alt="Foto do comprovante" className="max-h-[70dvh] w-full object-contain" onError={() => setError("Foto indisponível. Feche e abra novamente.")} /> : <p role="status">Carregando foto…</p>}
      </DialogContent>
    </Dialog>
  </>;
}