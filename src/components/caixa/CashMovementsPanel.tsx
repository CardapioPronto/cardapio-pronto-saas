import { useRef, useState } from "react";
import { X } from "lucide-react";
import CashReceiptButton from "@/components/caixa/CashReceiptButton";
import { validateCashReceipt } from "@/lib/cashReceipt";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { parseMoneyInput } from "@/lib/cashRegister";
import { formatarMoeda } from "@/utils/dashboardUtils";
import { addCashMovement, summarizeCashMovements, type CashMovement, type CashMovementKind } from "@/services/cashMovementService";

interface Props {
  restaurantId: string;
  sessionId: string;
  movements: CashMovement[];
  onChanged: () => void | Promise<void>;
}

export default function CashMovementsPanel({ restaurantId, sessionId, movements, onChanged }: Props) {
  const { toast } = useToast();
  const [kind, setKind] = useState<CashMovementKind>("sangria");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [receipt, setReceipt] = useState("");
  const [saving, setSaving] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const totals = summarizeCashMovements(movements);

  const submit = async () => {
    setSaving(true);
    try {
      await addCashMovement({ restaurantId, sessionId, kind, amount: parseMoneyInput(amount), reason, receipt, photo });
      setAmount(""); setReason(""); setReceipt("");
      setPhoto(null); if (photoInput.current) photoInput.current.value = "";
      toast({ title: kind === "sangria" ? "Sangria registrada" : "Suprimento registrado" });
      await onChanged();
    } catch (error) {
      toast({ title: "Não foi possível registrar", description: error instanceof Error ? error.message : undefined, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sangrias e suprimentos</CardTitle>
        <CardDescription>
          Registre cada retirada ou reforço de troco na hora em que acontecer. Os lançamentos não podem ser editados nem apagados; corrija com um lançamento contrário e explique no motivo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-[160px_140px_1fr_200px_auto] md:items-end">
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as CashMovementKind)}>
              <SelectTrigger aria-label="Tipo de movimento"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sangria">Sangria (retirada)</SelectItem>
                <SelectItem value="suprimento">Suprimento (reforço)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mov-amount">Valor</Label>
            <Input id="mov-amount" inputMode="decimal" placeholder="0,00" value={amount} onChange={e => setAmount(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mov-reason">Motivo</Label>
            <Input id="mov-reason" maxLength={300} placeholder="Ex.: depósito no banco, pagamento de fornecedor" value={reason} onChange={e => setReason(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mov-receipt">Comprovante (opcional)</Label>
            <Input id="mov-receipt" maxLength={120} placeholder="Nº do recibo/envelope" value={receipt} onChange={e => setReceipt(e.target.value)} />
          </div>
          <Button onClick={() => void submit()} disabled={saving}>Registrar</Button>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-0 space-y-1.5"><Label htmlFor="mov-photo">Foto do comprovante (opcional · até 6 MB)</Label>
            <Input ref={photoInput} id="mov-photo" type="file" accept="image/jpeg,image/png,image/webp" disabled={saving} onChange={e => {
              const file = e.target.files?.[0]; if (!file) { setPhoto(null); return; }
              const error = validateCashReceipt(file);
              if (error) { toast({ title: error, variant: "destructive" }); e.target.value = ""; setPhoto(null); } else setPhoto(file);
            }} />
          </div>
          {photo && <Button variant="ghost" size="icon" aria-label="Remover foto selecionada" title="Remover foto selecionada" disabled={saving} onClick={() => { setPhoto(null); if (photoInput.current) photoInput.current.value = ""; }}><X className="h-4 w-4" /></Button>}
        </div>

        <div className="flex flex-wrap gap-2 text-sm">
          <Badge variant="outline">Sangrias: {formatarMoeda(totals.withdrawals)}</Badge>
          <Badge variant="outline">Suprimentos: {formatarMoeda(totals.supplies)}</Badge>
          <Badge variant="secondary">Retirada líquida: {formatarMoeda(totals.netWithdrawals)}</Badge>
        </div>

        {movements.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum movimento neste turno.</p>
        ) : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Hora</TableHead><TableHead>Tipo</TableHead><TableHead>Valor</TableHead>
              <TableHead>Motivo</TableHead><TableHead>Comprovante</TableHead><TableHead>Responsável</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {movements.map(m => (
                <TableRow key={m.id}>
                  <TableCell>{new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</TableCell>
                  <TableCell>{m.kind === "sangria" ? "Sangria" : "Suprimento"}</TableCell>
                  <TableCell>{formatarMoeda(m.amount)}</TableCell>
                  <TableCell className="max-w-xs break-words">{m.reason}</TableCell>
                  <TableCell><div className="space-y-2">{m.receipt_reference ?? "-"}{m.receipt_path && <CashReceiptButton path={m.receipt_path} />}</div></TableCell>
                  <TableCell>{m.actorName ?? "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
