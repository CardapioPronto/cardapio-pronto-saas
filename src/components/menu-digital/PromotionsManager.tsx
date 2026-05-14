import React, { useState } from 'react';
import { usePromotions, calculatePromotionDiscount } from '@/hooks/usePromotions';
import { useProdutos } from '@/hooks/useProdutos';
import { useCategorias } from '@/hooks/useCategorias';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Loader2, Megaphone, Plus, Trash2, Edit2 } from 'lucide-react';
import { Promotion, CreatePromotionInput } from '@/types/features';
import { toast } from '@/components/ui/sonner-toast';
import { useCurrentUser } from '@/hooks/useCurrentUser';

export const PromotionsManager: React.FC = () => {
  const { user } = useCurrentUser();
  const restaurantId = user?.restaurant_id ?? '';
  const { promotions, activePromotions, isLoading, createPromotion, updatePromotion, deletePromotion, togglePromotion } = usePromotions();
  const { produtos: products = [] } = useProdutos(restaurantId, { itensPorPagina: 500 });
  const { categorias: categories = [] } = useCategorias();

  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreatePromotionInput>({
    name: '',
    description: '',
    discount_type: 'percentage',
    discount_value: 10,
    applicable_to: 'product',
    valid_from: new Date().toISOString().split('T')[0],
  });

  const handleCreateClick = () => {
    setIsCreating(true);
    setFormData({
      name: '',
      description: '',
      discount_type: 'percentage',
      discount_value: 10,
      applicable_to: 'product',
      valid_from: new Date().toISOString().split('T')[0],
    });
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Digite um nome para a promoção');
      return;
    }

    if (formData.discount_value <= 0) {
      toast.error('O desconto deve ser maior que 0');
      return;
    }

    if (formData.applicable_to !== 'order' && !formData.target_id) {
      toast.error('Selecione um produto ou categoria');
      return;
    }

    try {
      if (editingId) {
        await updatePromotion.mutateAsync({
          id: editingId,
          ...formData,
        });
      } else {
        await createPromotion.mutateAsync(formData);
      }
      setIsCreating(false);
      setEditingId(null);
    } catch (error) {
      console.error('Error submitting promotion:', error);
    }
  };

  const getPromotionLabel = (promo: Promotion): string => {
    if (promo.applicable_to === 'product') {
      const product = products.find((p) => p.id === promo.target_id);
      return product?.name || 'Produto desconhecido';
    }
    if (promo.applicable_to === 'category') {
      const category = categories.find((c) => c.id === promo.target_id);
      return category?.name || 'Categoria desconhecida';
    }
    return 'Todos os pedidos';
  };

  const discountLabel = (promo: Promotion): string => {
    if (promo.discount_type === 'percentage') {
      return `${promo.discount_value}%`;
    }
    return `R$ ${promo.discount_value.toFixed(2)}`;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Promoções</h2>
          <p className="text-sm text-muted-foreground">
            {promotions.length} promoção{promotions.length !== 1 ? 's' : ''} ({activePromotions.length} ativa{activePromotions.length !== 1 ? 's' : ''})
          </p>
        </div>
        <Button onClick={handleCreateClick} disabled={isCreating}>
          <Plus className="h-4 w-4 mr-2" />
          Nova promoção
        </Button>
      </div>

      {/* Create/Edit Form */}
      {isCreating && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle>{editingId ? 'Editar promoção' : 'Nova promoção'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Nome da Promoção</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Desconto Segunda-Feira"
              />
            </div>

            <div>
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descreva a promoção para os clientes"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="discount-type">Tipo de Desconto</Label>
                <Select
                  value={formData.discount_type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, discount_type: value as 'percentage' | 'fixed' })
                  }
                >
                  <SelectTrigger id="discount-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentual (%)</SelectItem>
                    <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="discount-value">Valor do Desconto</Label>
                <Input
                  id="discount-value"
                  type="number"
                  min="0"
                  step={formData.discount_type === 'percentage' ? '0.1' : '0.01'}
                  value={formData.discount_value}
                  onChange={(e) => setFormData({ ...formData, discount_value: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="applicable-to">Aplicar Para</Label>
              <Select
                value={formData.applicable_to}
                onValueChange={(value) =>
                  setFormData({ ...formData, applicable_to: value as 'product' | 'category' | 'order', target_id: undefined })
                }
              >
                <SelectTrigger id="applicable-to">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="product">Produto Específico</SelectItem>
                  <SelectItem value="category">Categoria Específica</SelectItem>
                  <SelectItem value="order">Todos os Pedidos (Desconto Geral)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.applicable_to === 'product' && (
              <div>
                <Label htmlFor="product">Selecione um Produto</Label>
                <Select value={formData.target_id || ''} onValueChange={(value) => setFormData({ ...formData, target_id: value })}>
                  <SelectTrigger id="product">
                    <SelectValue placeholder="Escolha um produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} - R$ {product.price.toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.applicable_to === 'category' && (
              <div>
                <Label htmlFor="category">Selecione uma Categoria</Label>
                <Select value={formData.target_id || ''} onValueChange={(value) => setFormData({ ...formData, target_id: value })}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Escolha uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="valid-from">Válida de</Label>
                <Input
                  id="valid-from"
                  type="date"
                  value={formData.valid_from?.split('T')[0] || ''}
                  onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="valid-until">Válida até (opcional)</Label>
                <Input
                  id="valid-until"
                  type="date"
                  value={formData.valid_until?.split('T')[0] || ''}
                  onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={handleSubmit} disabled={createPromotion.isPending || updatePromotion.isPending}>
                {createPromotion.isPending || updatePromotion.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar Promoção'
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreating(false);
                  setEditingId(null);
                }}
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Promotions List */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : promotions.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="Nenhuma promoção criada"
          description="Crie uma promoção quando houver uma regra comercial pronta para aparecer no cardápio."
          action={
            <Button onClick={handleCreateClick} disabled={isCreating}>
              <Plus className="mr-2 h-4 w-4" />
              Nova promoção
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {promotions.map((promotion) => (
            <Card key={promotion.id} className={!promotion.is_active ? 'opacity-60' : ''}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{promotion.name}</h3>
                      <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-700">
                        {discountLabel(promotion)} desconto
                      </Badge>
                      <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
                        {getPromotionLabel(promotion)}
                      </Badge>
                      {!promotion.is_active && (
                        <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700">
                          Inativa
                        </Badge>
                      )}
                    </div>
                    {promotion.description && <p className="text-sm text-muted-foreground mt-1">{promotion.description}</p>}
                    <p className="text-xs text-muted-foreground mt-2">
                      Válida de {new Date(promotion.valid_from).toLocaleDateString('pt-BR')}
                      {promotion.valid_until && ` até ${new Date(promotion.valid_until).toLocaleDateString('pt-BR')}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={promotion.is_active}
                      onCheckedChange={() => togglePromotion.mutate({ id: promotion.id, is_active: promotion.is_active })}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingId(promotion.id);
                        setIsCreating(true);
                        setFormData({
                          name: promotion.name,
                          description: promotion.description,
                          discount_type: promotion.discount_type,
                          discount_value: promotion.discount_value,
                          applicable_to: promotion.applicable_to,
                          target_id: promotion.target_id,
                          valid_from: promotion.valid_from,
                          valid_until: promotion.valid_until,
                        });
                      }}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (confirm('Tem certeza que deseja deletar esta promoção?')) {
                          deletePromotion.mutate(promotion.id);
                        }
                      }}
                      disabled={deletePromotion.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
