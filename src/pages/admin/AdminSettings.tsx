
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/sonner';
import { Edit2, Loader2 } from 'lucide-react';
import { listSystemSettings, updateSystemSetting } from '@/services/adminService';

const AdminSettings = () => {
  const [selectedSetting, setSelectedSetting] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [newValue, setNewValue] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['system-settings'],
    queryFn: () => listSystemSettings()
  });

  const handleOpenEditDialog = (setting: any) => {
    setSelectedSetting(setting);
    try {
      // Tenta formatar o JSON para exibição
      const valueObj = typeof setting.value === 'string' 
        ? JSON.parse(setting.value) 
        : setting.value;
      setNewValue(JSON.stringify(valueObj, null, 2));
    } catch (e) {
      // Caso não seja um JSON válido, exibe como string
      setNewValue(String(setting.value));
    }
    setIsEditDialogOpen(true);
  };

  const handleUpdateSetting = async () => {
    if (!selectedSetting) return;
    
    setIsSubmitting(true);
    
    try {
      // Tenta converter o valor para JSON
      let parsedValue;
      try {
        parsedValue = JSON.parse(newValue);
      } catch (e) {
        parsedValue = newValue;
      }
      
      const { error } = await updateSystemSetting(selectedSetting.key, parsedValue);
      
      if (error) {
        toast.error(`Erro ao atualizar configuração: ${error.message}`);
      } else {
        toast.success('Configuração atualizada com sucesso!');
        setIsEditDialogOpen(false);
        refetch();
      }
    } catch (error) {
      toast.error(`Erro ao atualizar configuração: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminLayout title="Configurações do Sistema">
      <Card>
        <CardHeader>
          <CardTitle>Configurações Globais</CardTitle>
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
                  <TableHead>Chave</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Última Atualização</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.data?.map((setting) => (
                  <TableRow key={setting.key}>
                    <TableCell className="font-medium">{setting.key}</TableCell>
                    <TableCell>{setting.description}</TableCell>
                    <TableCell>
                      <div className="max-w-xs overflow-hidden text-ellipsis whitespace-nowrap">
                        {typeof setting.value === 'object' 
                          ? JSON.stringify(setting.value) 
                          : String(setting.value)
                        }
                      </div>
                    </TableCell>
                    <TableCell>{new Date(setting.updated_at).toLocaleString('pt-BR')}</TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleOpenEditDialog(setting)}
                      >
                        <Edit2 className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                
                {!data?.data?.length && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      Nenhuma configuração encontrada.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog para editar configuração */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Configuração</DialogTitle>
            <DialogDescription>
              Altere o valor da configuração "{selectedSetting?.key}". Para valores JSON, certifique-se de que a sintaxe esteja correta.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div>
              <p className="mb-2 text-sm font-medium">Chave:</p>
              <p>{selectedSetting?.key}</p>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">Descrição:</p>
              <p>{selectedSetting?.description}</p>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">Valor:</p>
              <textarea
                className="flex h-32 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsEditDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleUpdateSetting} 
              className="bg-green hover:bg-green/80"
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminSettings;
