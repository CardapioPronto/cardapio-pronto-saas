
import React, { useState } from 'react';
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
import { addSuperAdmin } from '@/services/adminService';
import { Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { supabase } from '@/lib/supabase';

interface AddAdminDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const AddAdminDialog = ({ open, onOpenChange, onSuccess }: AddAdminDialogProps) => {
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminNotes, setNewAdminNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddAdmin = async () => {
    if (!newAdminEmail.trim()) {
      toast.error('Por favor, informe um e-mail válido');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Buscar usuário por email
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', newAdminEmail)
        .maybeSingle();
      
      if (userError || !userData) {
        toast.error('Usuário não encontrado com este e-mail');
        setIsSubmitting(false);
        return;
      }
      
      const { error } = await addSuperAdmin({
        user_id: userData.id,
        notes: newAdminNotes
      });
      
      if (error) {
        toast.error(`Erro ao adicionar administrador: ${error.message}`);
      } else {
        toast.success('Administrador adicionado com sucesso!');
        onOpenChange(false);
        setNewAdminEmail('');
        setNewAdminNotes('');
        onSuccess();
      }
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
          <DialogTitle>Adicionar Super Administrador</DialogTitle>
          <DialogDescription>
            Adicione um novo super administrador ao sistema. O usuário deve existir previamente.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="email" className="text-right">
              Email
            </label>
            <Input
              id="email"
              type="email"
              className="col-span-3"
              value={newAdminEmail}
              onChange={(e) => setNewAdminEmail(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="notes" className="text-right">
              Notas
            </label>
            <Input
              id="notes"
              className="col-span-3"
              value={newAdminNotes}
              onChange={(e) => setNewAdminNotes(e.target.value)}
              placeholder="Opcional"
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleAddAdmin} 
            className="bg-green hover:bg-green/80"
            disabled={isSubmitting}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Adicionar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
