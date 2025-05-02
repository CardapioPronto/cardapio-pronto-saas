
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
import { createInitialSuperAdmin } from '@/services/adminService';
import { Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

interface CreateAdminDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const CreateAdminDialog = ({ open, onOpenChange, onSuccess }: CreateAdminDialogProps) => {
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateAdmin = async () => {
    if (!newUserEmail.trim() || !newUserPassword.trim()) {
      toast.error('Por favor, preencha todos os campos');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const { success, error } = await createInitialSuperAdmin(newUserEmail, newUserPassword);
      
      if (!success || error) {
        toast.error(`Erro ao criar administrador inicial: ${error instanceof Error ? error.message : String(error)}`);
      } else {
        toast.success('Administrador inicial criado com sucesso!');
        onOpenChange(false);
        setNewUserEmail('');
        setNewUserPassword('');
        onSuccess();
      }
    } catch (error) {
      toast.error(`Erro ao criar administrador: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar Novo Super Administrador</DialogTitle>
          <DialogDescription>
            Crie um novo usuário com privilégios de super administrador.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="new-email" className="text-right">
              Email
            </label>
            <Input
              id="new-email"
              type="email"
              className="col-span-3"
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="new-password" className="text-right">
              Senha
            </label>
            <Input
              id="new-password"
              type="password"
              className="col-span-3"
              value={newUserPassword}
              onChange={(e) => setNewUserPassword(e.target.value)}
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
            onClick={handleCreateAdmin} 
            className="bg-green hover:bg-green/80"
            disabled={isSubmitting}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Criar Admin
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
