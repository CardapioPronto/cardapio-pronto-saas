import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PrintPaperSize, PrintTemplate, usePrint } from "@/hooks/usePrint";
import { Pedido } from "../types";
import { Loader2, Printer } from "lucide-react";

const TEMPLATE_LABELS: Record<PrintTemplate, string> = {
  kitchen: "cozinha",
  cashier: "caixa",
  customer: "cliente",
};

interface PrintDefaultCopiesDialogProps {
  open: boolean;
  pedido: Pedido | null;
  restaurantName: string;
  paperSize: PrintPaperSize;
  templates: PrintTemplate[];
  onClose: () => void;
}

export function PrintDefaultCopiesDialog({
  open,
  pedido,
  restaurantName,
  paperSize,
  templates,
  onClose,
}: PrintDefaultCopiesDialogProps) {
  const { printOrder, printing } = usePrint();
  const selectedTemplates = templates.length > 0 ? templates : ["kitchen"];
  const viasLabel = selectedTemplates.map((template) => TEMPLATE_LABELS[template]).join(", ");

  const handlePrint = async () => {
    if (!pedido) return;

    for (const template of selectedTemplates) {
      await printOrder(pedido, {
        restaurantName,
        paperSize,
        template,
      });
    }

    onClose();
  };

  return (
    <Dialog open={open && Boolean(pedido)} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Imprimir vias do pedido</DialogTitle>
          <DialogDescription>
            Pedido finalizado. Imprima as vias padrão configuradas para este restaurante.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border bg-muted/30 p-3 text-sm">
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Pedido</span>
            <span className="font-medium">{pedido?.mesa || "Balcão"}</span>
          </div>
          <div className="mt-1 flex justify-between gap-3">
            <span className="text-muted-foreground">Vias</span>
            <span className="font-medium capitalize">{viasLabel}</span>
          </div>
          <div className="mt-1 flex justify-between gap-3">
            <span className="text-muted-foreground">Papel</span>
            <span className="font-medium uppercase">{paperSize}</span>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={printing}>
            Agora não
          </Button>
          <Button type="button" onClick={handlePrint} disabled={printing || !pedido}>
            {printing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Printer className="mr-2 h-4 w-4" />
            )}
            Imprimir vias
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
