
import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { addSuperAdmin } from '@/services/adminService';
import { AlertTriangle, Loader2, ShieldCheck } from 'lucide-react';
import { toast } from '@/components/ui/sonner-toast';

interface AddAdminDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const AddAdminDialog = ({ open, onOpenChange, onSuccess }: AddAdminDialogProps) => {
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminNotes, setNewAdminNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setNewAdminEmail('');
      setNewAdminName('');
      setNewAdminNotes('');
      setIsSubmitting(false);
    }
  }, [open]);

  const handleAddAdmin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!newAdminEmail.trim()) {
      toast.error('Por favor, informe um e-mail válido');
      return;
    }

    setIsSubmitting(true);

    try {
      await addSuperAdmin({
        email: newAdminEmail,
        name: newAdminName,
        notes: newAdminNotes
      });

      toast.success('Administrador adicionado com sucesso. Se era um novo usuário, ele receberá um convite por e-mail.');
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast.error(`Erro ao adicionar administrador: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Adicionar Super Administrador
          </DialogTitle>
          <DialogDescription>
            Concede acesso administrativo global. Se o e-mail ainda não existir no Auth, um convite será criado.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleAddAdmin} className="space-y-4">
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <div className="flex gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <p>
                Super administradores têm acesso total ao painel administrativo. O usuário também será vinculado ao seu
                restaurante como gerente para manter o acesso operacional consistente.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin-email">E-mail do usuário</Label>
            <Input
              id="admin-email"
              type="email"
              value={newAdminEmail}
              onChange={(e) => setNewAdminEmail(e.target.value)}
              placeholder="admin@empresa.com"
              autoComplete="email"
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin-name">Nome</Label>
            <Input
              id="admin-name"
              type="text"
              value={newAdminName}
              onChange={(e) => setNewAdminName(e.target.value)}
              placeholder="Nome do administrador"
              autoComplete="name"
              disabled={isSubmitting}
              maxLength={120}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin-notes">Notas internas</Label>
            <Textarea
              id="admin-notes"
              value={newAdminNotes}
              onChange={(e) => setNewAdminNotes(e.target.value)}
              placeholder="Motivo do acesso, responsável pela autorização ou contexto operacional"
              disabled={isSubmitting}
              maxLength={500}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Conceder acesso
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
