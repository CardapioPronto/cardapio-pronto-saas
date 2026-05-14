
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
import type { SuperAdminRecord } from '@/services/adminService';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/sonner-toast';

interface RemoveAdminDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  admin: SuperAdminRecord | null;
  onSuccess: () => void;
}

export const RemoveAdminDialog = ({ 
  open, 
  onOpenChange, 
  admin,
  onSuccess 
}: RemoveAdminDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRemoveAdmin = async () => {
    if (!admin) return;
    
    setIsSubmitting(true);
    
    try {
      await removeSuperAdmin(admin.user_id);

      toast.success('Administrador removido com sucesso.');
      onOpenChange(false);
      onSuccess();
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
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Remover Administrador
          </DialogTitle>
          <DialogDescription>
            Esta ação remove o acesso ao painel administrativo global.
          </DialogDescription>
        </DialogHeader>

        {admin && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">
            <p className="font-medium">{admin.name || admin.email || admin.user_id}</p>
            <p className="mt-1 text-muted-foreground">{admin.email || admin.user_id}</p>
            {admin.restaurant_name && (
              <p className="mt-1 text-muted-foreground">Restaurante: {admin.restaurant_name}</p>
            )}
            <p className="mt-3 text-destructive">
              Por segurança, não é permitido remover seu próprio acesso nem o último administrador. O vínculo operacional
              com o restaurante será preservado.
            </p>
          </div>
        )}
        
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
