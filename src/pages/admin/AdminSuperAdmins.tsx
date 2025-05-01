
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/sonner';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { listSuperAdmins, addSuperAdmin, removeSuperAdmin } from '@/services/adminService';
import { supabase } from '@/lib/supabase';

const AdminSuperAdmins = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminNotes, setNewAdminNotes] = useState('');
  const [selectedAdmin, setSelectedAdmin] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['super-admins'],
    queryFn: () => listSuperAdmins()
  });

  const handleAddAdmin = async () => {
    if (!newAdminEmail.trim()) {
      toast.error('Por favor, informe um e-mail válido');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Buscar usuário por email usando a API do Supabase
      // Observação: não podemos consultar auth.users diretamente com o from(),
      // precisaremos implementar uma função RPC ou edge function para isso
      // Por enquanto, vamos simular isso com uma mensagem de erro
      
      toast.error('Funcionalidade de busca por e-mail não implementada ainda. Por favor, use o ID do usuário diretamente.');
      setIsSubmitting(false);
      return;
      
      /* Implementação futura:
      const { data: userData, error: userError } = await supabase
        .rpc('get_user_id_by_email', { email: newAdminEmail });
      
      if (userError || !userData) {
        toast.error('Usuário não encontrado com este e-mail');
        setIsSubmitting(false);
        return;
      }
      
      const { error } = await addSuperAdmin({
        user_id: userData,
        notes: newAdminNotes
      });
      */
    } catch (error) {
      toast.error(`Erro ao adicionar administrador: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveAdmin = async () => {
    if (!selectedAdmin) return;
    
    setIsSubmitting(true);
    
    try {
      const { error } = await removeSuperAdmin(selectedAdmin);
      
      if (error) {
        toast.error(`Erro ao remover administrador: ${error.message}`);
      } else {
        toast.success('Administrador removido com sucesso!');
        setIsRemoveDialogOpen(false);
        setSelectedAdmin(null);
        refetch();
      }
    } catch (error) {
      toast.error(`Erro ao remover administrador: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminLayout title="Gerenciar Super Administradores">
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Super Administradores</CardTitle>
          <Button 
            onClick={() => setIsAddDialogOpen(true)} 
            className="bg-green hover:bg-green/80"
          >
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Admin
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Notas</TableHead>
                  <TableHead>Data de Criação</TableHead>
                  <TableHead>Criado Por</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.data?.map((admin) => (
                  <TableRow key={admin.user_id}>
                    <TableCell className="font-medium">{admin.user_id}</TableCell>
                    <TableCell>{admin.notes || '-'}</TableCell>
                    <TableCell>{new Date(admin.created_at).toLocaleString('pt-BR')}</TableCell>
                    <TableCell>{admin.created_by || '-'}</TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => {
                          setSelectedAdmin(admin.user_id);
                          setIsRemoveDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                
                {!data?.data?.length && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      Nenhum administrador encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog para adicionar administrador */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
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
              onClick={() => setIsAddDialogOpen(false)}
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

      {/* Dialog para confirmar remoção */}
      <Dialog open={isRemoveDialogOpen} onOpenChange={setIsRemoveDialogOpen}>
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
              onClick={() => setIsRemoveDialogOpen(false)}
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
    </AdminLayout>
  );
};

export default AdminSuperAdmins;
