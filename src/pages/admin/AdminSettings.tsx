
import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/sonner-toast';
import { Edit2, Eye, EyeOff, Loader2, Save, ShieldCheck } from 'lucide-react';
import {
  IFOOD_SAAS_APP_SETTING_KEY,
  listSystemSettings,
  updateSystemSetting,
  upsertIfoodSaasAppSettings,
  type IfoodSaasAppSettings,
} from '@/services/adminService';
import type { Database, Json } from '@/integrations/supabase/types';

type SystemSetting = Database['public']['Tables']['system_settings']['Row'];

type IfoodSaasAppForm = IfoodSaasAppSettings;

const defaultIfoodSaasAppForm: IfoodSaasAppForm = {
  app_name: 'Pubfy iFood',
  app_url: '',
  client_id: '',
  client_secret: '',
  distribution_model: 'centralized_saas',
  category: 'Food',
  visibility: 'private',
  modules: ['authentication', 'merchant', 'order', 'events'],
  notes: '',
};

const normalizeIfoodSaasAppSettings = (value: Json | undefined): IfoodSaasAppForm => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return defaultIfoodSaasAppForm;
  }

  const record = value as Record<string, Json>;
  const modules = Array.isArray(record.modules)
    ? record.modules.map(String)
    : defaultIfoodSaasAppForm.modules;

  return {
    ...defaultIfoodSaasAppForm,
    app_name: String(record.app_name || defaultIfoodSaasAppForm.app_name),
    app_url: String(record.app_url || ''),
    client_id: String(record.client_id || ''),
    client_secret: String(record.client_secret || ''),
    visibility: record.visibility === 'public' ? 'public' : 'private',
    modules,
    notes: String(record.notes || ''),
  };
};

const renderSettingValue = (setting: SystemSetting) => {
  if (setting.key === IFOOD_SAAS_APP_SETTING_KEY) {
    const value = normalizeIfoodSaasAppSettings(setting.value);
    return JSON.stringify({
      ...value,
      client_secret: value.client_secret ? '*** configurado ***' : '',
    });
  }

  return typeof setting.value === 'object'
    ? JSON.stringify(setting.value)
    : String(setting.value);
};

const AdminSettings = () => {
  const [selectedSetting, setSelectedSetting] = useState<SystemSetting | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [newValue, setNewValue] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ifoodForm, setIfoodForm] = useState<IfoodSaasAppForm>(defaultIfoodSaasAppForm);
  const [showIfoodSecret, setShowIfoodSecret] = useState(false);
  const [isIfoodSubmitting, setIsIfoodSubmitting] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['system-settings'],
    queryFn: () => listSystemSettings()
  });

  const ifoodSetting = useMemo(
    () => data?.data?.find((setting) => setting.key === IFOOD_SAAS_APP_SETTING_KEY),
    [data?.data]
  );

  useEffect(() => {
    setIfoodForm(normalizeIfoodSaasAppSettings(ifoodSetting?.value));
  }, [ifoodSetting?.value]);

  const handleOpenEditDialog = (setting: SystemSetting) => {
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
      let parsedValue: Json;
      try {
        parsedValue = JSON.parse(newValue) as Json;
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

  const handleSaveIfoodSettings = async () => {
    if (!ifoodForm.client_id.trim()) {
      toast.error('Informe o Client ID do aplicativo iFood SaaS.');
      return;
    }

    setIsIfoodSubmitting(true);

    try {
      const payload: IfoodSaasAppSettings = {
        ...defaultIfoodSaasAppForm,
        ...ifoodForm,
        app_name: ifoodForm.app_name.trim() || defaultIfoodSaasAppForm.app_name,
        app_url: ifoodForm.app_url.trim(),
        client_id: ifoodForm.client_id.trim(),
        client_secret: ifoodForm.client_secret.trim(),
        notes: ifoodForm.notes.trim(),
        distribution_model: 'centralized_saas',
        category: 'Food',
        modules: ifoodForm.modules.length ? ifoodForm.modules : defaultIfoodSaasAppForm.modules,
      };

      const { error } = await upsertIfoodSaasAppSettings(payload);

      if (error) {
        toast.error(`Erro ao salvar aplicativo iFood: ${error.message}`);
        return;
      }

      toast.success('Aplicativo iFood SaaS salvo com sucesso!');
      await refetch();
    } catch (error) {
      toast.error(`Erro ao salvar aplicativo iFood: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsIfoodSubmitting(false);
    }
  };

  return (
    <AdminLayout title="Configurações do Sistema">
      <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-700" />
            Aplicativo iFood SaaS
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
            Use esta configuração para o app centralizado do Pubfy no iFood. Cada restaurante continua informando apenas o Merchant ID da própria loja na tela de integração.
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ifood-app-name">Nome do aplicativo</Label>
              <Input
                id="ifood-app-name"
                value={ifoodForm.app_name}
                onChange={(event) => setIfoodForm((current) => ({ ...current, app_name: event.target.value }))}
                placeholder="Pubfy iFood"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ifood-app-url">URL oficial</Label>
              <Input
                id="ifood-app-url"
                value={ifoodForm.app_url}
                onChange={(event) => setIfoodForm((current) => ({ ...current, app_url: event.target.value }))}
                placeholder="https://pubfy.com.br"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ifood-client-id">Client ID *</Label>
              <Input
                id="ifood-client-id"
                value={ifoodForm.client_id}
                onChange={(event) => setIfoodForm((current) => ({ ...current, client_id: event.target.value }))}
                placeholder="Client ID do app SaaS"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ifood-client-secret">Client Secret</Label>
              <div className="flex gap-2">
                <Input
                  id="ifood-client-secret"
                  type={showIfoodSecret ? 'text' : 'password'}
                  value={ifoodForm.client_secret}
                  onChange={(event) => setIfoodForm((current) => ({ ...current, client_secret: event.target.value }))}
                  placeholder="Client Secret do app SaaS"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowIfoodSecret((current) => !current)}
                  aria-label={showIfoodSecret ? 'Ocultar secret' : 'Mostrar secret'}
                >
                  {showIfoodSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ifood-visibility">Visibilidade no portal iFood</Label>
              <select
                id="ifood-visibility"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={ifoodForm.visibility}
                onChange={(event) => setIfoodForm((current) => ({
                  ...current,
                  visibility: event.target.value === 'public' ? 'public' : 'private',
                }))}
              >
                <option value="private">Privado</option>
                <option value="public">Publico</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label>Modelo e categoria</Label>
              <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                Centralizado (SaaS) · Food
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ifood-notes">Observações internas</Label>
            <textarea
              id="ifood-notes"
              className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={ifoodForm.notes}
              onChange={(event) => setIfoodForm((current) => ({ ...current, notes: event.target.value }))}
              placeholder="Homologação, módulos selecionados ou pendências do portal iFood"
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSaveIfoodSettings} disabled={isIfoodSubmitting}>
              {isIfoodSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Salvar app iFood
            </Button>
          </div>
        </CardContent>
      </Card>

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
                        {renderSettingValue(setting)}
                      </div>
                    </TableCell>
                    <TableCell>{new Date(setting.updated_at).toLocaleString('pt-BR')}</TableCell>
                    <TableCell className="text-right">
                      {setting.key === IFOOD_SAAS_APP_SETTING_KEY ? (
                        <Button variant="outline" size="sm" disabled>
                          Editar acima
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEditDialog(setting)}
                        >
                          <Edit2 className="h-4 w-4 mr-1" />
                          Editar
                        </Button>
                      )}
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
      </div>

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
