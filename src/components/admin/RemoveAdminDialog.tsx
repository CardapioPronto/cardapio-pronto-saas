
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
import { removeSuperAdmin } from '@/services/adminService';
import { Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

interface RemoveAdminDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  adminId: string | null;
  onSuccess: () => void;
}

export const RemoveAdminDialog = ({ 
  open, 
  onOpenChange, 
  adminId, 
  onSuccess 
}: RemoveAdminDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRemoveAdmin = async () => {
    if (!adminId) return;
    
    setIsSubmitting(true);
    
    try {
      const { error } = await removeSuperAdmin(adminId);
      
      if (error) {
        toast.error(`Erro ao remover administrador: ${error.message}`);
      } else {
        toast.success('Administrador removido com sucesso!');
        onOpenChange(false);
        onSuccess();
      }
    } catch (error) {
      toast.error(`Erro ao remover administrador: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remover Administrador</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja remover este administrador do sistema? Esta ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleRemoveAdmin}
            disabled={isSubmitting}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Remover
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
