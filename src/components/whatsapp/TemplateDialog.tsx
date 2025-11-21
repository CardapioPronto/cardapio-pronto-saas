import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { WhatsAppTemplate, CreateTemplateData, UpdateTemplateData, TemplateType, TEMPLATE_TYPE_LABELS, AVAILABLE_VARIABLES } from '@/types/whatsappTemplate';
import { Badge } from '@/components/ui/badge';

interface TemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: WhatsAppTemplate | null;
  onSave: (data: CreateTemplateData) => Promise<void>;
}

export const TemplateDialog = ({ open, onOpenChange, template, onSave }: TemplateDialogProps) => {
  const [formData, setFormData] = useState<CreateTemplateData>({
    template_type: 'order_confirmed',
    template_name: '',
    message_content: '',
    is_active: true,
    description: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (template) {
      setFormData({
        template_type: template.template_type,
        template_name: template.template_name,
        message_content: template.message_content,
        is_active: template.is_active,
        description: template.description || ''
      });
    } else {
      setFormData({
        template_type: 'order_confirmed',
        template_name: '',
        message_content: '',
        is_active: true,
        description: ''
      });
    }
  }, [template, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(formData);
    } finally {
      setLoading(false);
    }
  };

  const insertVariable = (variable: string) => {
    setFormData(prev => ({
      ...prev,
      message_content: prev.message_content + variable
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template ? 'Editar Template' : 'Novo Template'}</DialogTitle>
          <DialogDescription>
            Personalize a mensagem que será enviada aos clientes
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="template_name">Nome do Template</Label>
            <Input
              id="template_name"
              value={formData.template_name}
              onChange={(e) => setFormData(prev => ({ ...prev, template_name: e.target.value }))}
              placeholder="Ex: Template de confirmação de pedido"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="template_type">Tipo de Evento</Label>
            <Select
              value={formData.template_type}
              onValueChange={(value: TemplateType) => setFormData(prev => ({ ...prev, template_type: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TEMPLATE_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Breve descrição do template"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message_content">Mensagem</Label>
            <Textarea
              id="message_content"
              value={formData.message_content}
              onChange={(e) => setFormData(prev => ({ ...prev, message_content: e.target.value }))}
              placeholder="Digite a mensagem que será enviada..."
              rows={8}
              required
            />
            <p className="text-xs text-muted-foreground">
              Use as variáveis abaixo para personalizar a mensagem
            </p>
          </div>

          <div className="space-y-2">
            <Label>Variáveis Disponíveis</Label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_VARIABLES.map((variable) => (
                <Badge
                  key={variable.key}
                  variant="outline"
                  className="cursor-pointer hover:bg-accent"
                  onClick={() => insertVariable(variable.key)}
                  title={variable.description}
                >
                  {variable.key}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Clique em uma variável para adicioná-la à mensagem
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
            />
            <Label htmlFor="is_active">Template ativo</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
