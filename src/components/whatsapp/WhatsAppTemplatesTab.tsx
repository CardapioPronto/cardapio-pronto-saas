import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useWhatsAppTemplates } from '@/hooks/useWhatsAppTemplates';
import { Plus, Edit, Trash2, Copy, MessageSquare } from 'lucide-react';
import { WhatsAppTemplate, TEMPLATE_TYPE_LABELS } from '@/types/whatsappTemplate';
import { TemplateDialog } from './TemplateDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export const WhatsAppTemplatesTab = () => {
  const { templates, loading, createTemplate, updateTemplate, deleteTemplate, createDefaultTemplates } = useWhatsAppTemplates();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WhatsAppTemplate | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);

  const handleCreateDefaults = async () => {
    await createDefaultTemplates();
  };

  const handleEdit = (template: WhatsAppTemplate) => {
    setEditingTemplate(template);
    setDialogOpen(true);
  };

  const handleDelete = (templateId: string) => {
    setTemplateToDelete(templateId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (templateToDelete) {
      await deleteTemplate(templateToDelete);
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingTemplate(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Templates de Mensagens</h3>
          <p className="text-sm text-muted-foreground">
            Personalize as mensagens automáticas enviadas aos clientes
          </p>
        </div>
        <div className="flex gap-2">
          {templates.length === 0 && (
            <Button onClick={handleCreateDefaults} variant="outline">
              <Copy className="mr-2 h-4 w-4" />
              Criar Templates Padrão
            </Button>
          )}
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Template
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">Carregando templates...</div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum template criado</h3>
            <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
              Crie templates personalizados ou use os templates padrão para começar a enviar mensagens automáticas
            </p>
            <Button onClick={handleCreateDefaults}>
              <Copy className="mr-2 h-4 w-4" />
              Criar Templates Padrão
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {templates.map((template) => (
            <Card key={template.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{template.template_name}</CardTitle>
                      <Badge variant={template.is_active ? 'default' : 'secondary'}>
                        {template.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                      <Badge variant="outline">
                        {TEMPLATE_TYPE_LABELS[template.template_type]}
                      </Badge>
                    </div>
                    {template.description && (
                      <CardDescription>{template.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(template)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(template.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-muted p-4 rounded-md">
                  <p className="text-sm whitespace-pre-wrap font-mono">{template.message_content}</p>
                </div>
                {template.variables && template.variables.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium mb-2">Variáveis disponíveis:</p>
                    <div className="flex flex-wrap gap-2">
                      {template.variables.map((variable) => (
                        <Badge key={variable} variant="secondary">
                          {variable}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <TemplateDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        template={editingTemplate}
        onSave={async (data) => {
          if (editingTemplate) {
            const updateData: import('@/types/whatsappTemplate').UpdateTemplateData = {
              template_name: data.template_name,
              message_content: data.message_content,
              is_active: data.is_active,
              description: data.description
            };
            await updateTemplate(editingTemplate.id, updateData);
          } else {
            await createTemplate(data);
          }
          handleDialogClose();
        }}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este template? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
