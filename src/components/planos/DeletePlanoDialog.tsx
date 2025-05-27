import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { Plano } from "@/types/plano";

interface DeletePlanoDialogProps {
    plano: Plano;
    onDelete: (id: string) => void;
}

export const DeletePlanoDialog = ({ plano, onDelete }: DeletePlanoDialogProps) => {
    const [open, setOpen] = useState(false);

    const handleDelete = () => {
        onDelete(plano.id);
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="text-red-500">
            <Trash2 className="h-4 w-4" />
            </Button>
        </DialogTrigger>
        <DialogContent>
            <DialogHeader>
            <DialogTitle>Excluir Plano</DialogTitle>
            <DialogDescription>
                Tem certeza que deseja excluir o plano{" "}
                <strong>{plano.name}</strong>? Esta ação não poderá ser desfeita.
            </DialogDescription>
            </DialogHeader>
            <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
                Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
                Excluir
            </Button>
            </DialogFooter>
        </DialogContent>
        </Dialog>
    );
};
