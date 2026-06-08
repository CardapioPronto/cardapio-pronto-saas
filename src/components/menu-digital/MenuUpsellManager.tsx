import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useProdutos } from '@/hooks/useProdutos';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { EmptyState } from '@/components/ui/empty-state';
import { toast } from '@/components/ui/sonner-toast';
import { Loader2, Plus, Sparkles, Trash2 } from 'lucide-react';

type Placement = 'featured' | 'product_modal' | 'cart_combo' | 'also_ordered';

type MenuUpsellRule = {
  id: string;
  restaurant_id: string;
  name: string;
  placement: Placement;
  trigger_product_id: string | null;
  suggested_product_id: string;
  title: string | null;
  description: string | null;
  starts_at: string | null;
  ends_at: string | null;
  weekdays: number[] | null;
  priority: number;
  is_active: boolean;
  created_at: string;
};

type RulePayload = Omit<MenuUpsellRule, 'id' | 'created_at'>;

type DbClient = {
  from: (table: string) => {
    select: (columns?: string) => QueryBuilder;
    insert: (payload: RulePayload) => MutationBuilder;
    update: (payload: Partial<RulePayload>) => MutationBuilder;
    delete: () => MutationBuilder;
  };
};

type QueryBuilder = {
  eq: (column: string, value: unknown) => QueryBuilder;
  order: (column: string, options?: { ascending?: boolean }) => Promise<{ data: unknown; error: unknown }>;
};

type MutationBuilder = {
  eq: (column: string, value: unknown) => MutationBuilder;
  select: () => { single: () => Promise<{ data: unknown; error: unknown }> };
  then?: never;
};

const PLACEMENTS: Array<{ value: Placement; label: string; description: string }> = [
  {
    value: 'featured',
    label: 'Destaque por horário',
    description: 'Mostra produtos estratégicos no topo do cardápio.',
  },
  {
    value: 'product_modal',
    label: 'Adicional no produto',
    description: 'Sugere um item quando o cliente abre outro produto.',
  },
  {
    value: 'cart_combo',
    label: 'Combo no carrinho',
    description: 'Sugere complementos na sacola antes do checkout.',
  },
  {
    value: 'also_ordered',
    label: 'Clientes também pedem',
    description: 'Fallback manual quando ainda não há volume de vendas.',
  },
];

const WEEKDAYS = [
  { value: 0, label: 'Dom' },
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
];

const emptyForm = {
  name: '',
  placement: 'featured' as Placement,
  trigger_product_id: '',
  suggested_product_id: '',
  title: '',
  description: '',
  starts_at: '',
  ends_at: '',
  weekdays: [] as number[],
  priority: 100,
  is_active: true,
};

const db = supabase as unknown as DbClient;

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const placementNeedsTrigger = (placement: Placement) =>
  placement === 'product_modal' || placement === 'also_ordered';

const timeValue = (value: string | null) => value?.slice(0, 5) || '';

export const MenuUpsellManager = () => {
  const { user } = useCurrentUser();
  const restaurantId = user?.restaurant_id ?? '';
  const queryClient = useQueryClient();
  const { produtos: products = [] } = useProdutos(restaurantId, { itensPorPagina: 500 });
  const availableProducts = useMemo(() => products.filter((product) => product.available), [products]);
  const productById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );

  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['menu-upsell-rules', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      const { data, error } = await db
        .from('menu_upsell_rules')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('priority', { ascending: true });

      if (error) throw error;
      return (data ?? []) as MenuUpsellRule[];
    },
    enabled: !!restaurantId,
  });

  const createRule = useMutation({
    mutationFn: async () => {
      if (!restaurantId) throw new Error('Restaurante não encontrado.');
      if (!form.name.trim()) throw new Error('Informe um nome para a regra.');
      if (!form.suggested_product_id) throw new Error('Selecione o produto sugerido.');
      if (placementNeedsTrigger(form.placement) && !form.trigger_product_id) {
        throw new Error('Selecione o produto que aciona a sugestão.');
      }
      if (form.trigger_product_id && form.trigger_product_id === form.suggested_product_id) {
        throw new Error('O produto sugerido precisa ser diferente do produto de origem.');
      }

      const payload: RulePayload = {
        restaurant_id: restaurantId,
        name: form.name.trim(),
        placement: form.placement,
        trigger_product_id: placementNeedsTrigger(form.placement) ? form.trigger_product_id : null,
        suggested_product_id: form.suggested_product_id,
        title: form.title.trim() || null,
        description: form.description.trim() || null,
        starts_at: form.starts_at || null,
        ends_at: form.ends_at || null,
        weekdays: form.weekdays.length > 0 ? form.weekdays : null,
        priority: Number(form.priority) || 100,
        is_active: form.is_active,
      };

      const { data, error } = await db
        .from('menu_upsell_rules')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return data as MenuUpsellRule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-upsell-rules', restaurantId] });
      setForm(emptyForm);
      setIsCreating(false);
      toast.success('Regra de upsell criada.');
    },
    onError: (error) => toast.error(errorMessage(error, 'Erro ao criar regra.')),
  });

  const toggleRule = useMutation({
    mutationFn: async (rule: MenuUpsellRule) => {
      const { data, error } = await db
        .from('menu_upsell_rules')
        .update({ is_active: !rule.is_active })
        .eq('id', rule.id)
        .select()
        .single();

      if (error) throw error;
      return data as MenuUpsellRule;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['menu-upsell-rules', restaurantId] }),
    onError: () => toast.error('Erro ao alterar status da regra.'),
  });

  const deleteRule = useMutation({
    mutationFn: async (ruleId: string) => {
      const { error } = await db
        .from('menu_upsell_rules')
        .delete()
        .eq('id', ruleId)
        .select()
        .single();

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-upsell-rules', restaurantId] });
      toast.success('Regra removida.');
    },
    onError: () => toast.error('Erro ao remover regra.'),
  });

  const selectedPlacement = PLACEMENTS.find((placement) => placement.value === form.placement);

  const toggleWeekday = (weekday: number) => {
    setForm((current) => ({
      ...current,
      weekdays: current.weekdays.includes(weekday)
        ? current.weekdays.filter((item) => item !== weekday)
        : [...current.weekdays, weekday].sort((a, b) => a - b),
    }));
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Cardápio inteligente</h2>
          <p className="text-sm text-muted-foreground">
            Configure sugestões para aumentar ticket médio sem poluir o checkout.
          </p>
        </div>
        <Button onClick={() => setIsCreating(true)} disabled={isCreating || availableProducts.length === 0}>
          <Plus className="mr-2 h-4 w-4" />
          Nova regra
        </Button>
      </div>

      {isCreating && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle>Nova regra de upsell</CardTitle>
            <CardDescription>{selectedPlacement?.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="upsell-name">Nome interno</Label>
                <Input
                  id="upsell-name"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  placeholder="Ex: Batata junto do burger"
                />
              </div>
              <div className="space-y-2">
                <Label>Onde aparecer</Label>
                <Select
                  value={form.placement}
                  onValueChange={(value) => setForm({
                    ...form,
                    placement: value as Placement,
                    trigger_product_id: placementNeedsTrigger(value as Placement) ? form.trigger_product_id : '',
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLACEMENTS.map((placement) => (
                      <SelectItem key={placement.value} value={placement.value}>
                        {placement.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {placementNeedsTrigger(form.placement) && (
                <div className="space-y-2">
                  <Label>Produto de origem</Label>
                  <Select
                    value={form.trigger_product_id}
                    onValueChange={(value) => setForm({ ...form, trigger_product_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Quando o cliente escolher..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableProducts.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Produto sugerido</Label>
                <Select
                  value={form.suggested_product_id}
                  onValueChange={(value) => setForm({ ...form, suggested_product_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sugerir este produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProducts.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} - R$ {Number(product.price).toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="upsell-title">Título público opcional</Label>
                <Input
                  id="upsell-title"
                  value={form.title}
                  onChange={(event) => setForm({ ...form, title: event.target.value })}
                  placeholder="Ex: Vai bem com seu pedido"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="upsell-priority">Prioridade</Label>
                <Input
                  id="upsell-priority"
                  type="number"
                  min="1"
                  value={form.priority}
                  onChange={(event) => setForm({ ...form, priority: Number(event.target.value) || 100 })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="upsell-description">Descrição opcional</Label>
              <Textarea
                id="upsell-description"
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                placeholder="Texto curto para explicar a sugestão"
                rows={2}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Janela de horário</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="time"
                    value={form.starts_at}
                    onChange={(event) => setForm({ ...form, starts_at: event.target.value })}
                  />
                  <Input
                    type="time"
                    value={form.ends_at}
                    onChange={(event) => setForm({ ...form, ends_at: event.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Dias da semana</Label>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAYS.map((weekday) => (
                    <label
                      key={weekday.value}
                      className="flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 text-xs"
                    >
                      <Checkbox
                        checked={form.weekdays.includes(weekday.value)}
                        onCheckedChange={() => toggleWeekday(weekday.value)}
                      />
                      {weekday.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
              <div>
                <Label className="text-sm">Regra ativa</Label>
                <p className="text-xs text-muted-foreground">Aparece no cardápio público assim que salvar.</p>
              </div>
              <Switch
                checked={form.is_active}
                onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={() => createRule.mutate()} disabled={createRule.isPending}>
                {createRule.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar regra
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreating(false);
                  setForm(emptyForm);
                }}
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Regras configuradas</CardTitle>
          <CardDescription>
            Regras manuais servem como fallback e convivem com sugestões calculadas por histórico de pedidos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : rules.length === 0 ? (
            <EmptyState
              icon={Sparkles}
              title="Nenhuma regra de upsell"
              description="Crie destaques e sugestões para vender acompanhamentos, bebidas e combos no cardápio público."
              action={
                <Button onClick={() => setIsCreating(true)} disabled={availableProducts.length === 0}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nova regra
                </Button>
              }
            />
          ) : (
            <div className="space-y-3">
              {rules.map((rule) => {
                const placement = PLACEMENTS.find((item) => item.value === rule.placement);
                const triggerProduct = rule.trigger_product_id ? productById.get(rule.trigger_product_id) : null;
                const suggestedProduct = productById.get(rule.suggested_product_id);

                return (
                  <div
                    key={rule.id}
                    className={`rounded-lg border border-border p-4 ${rule.is_active ? 'bg-card' : 'bg-muted/40 opacity-75'}`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold">{rule.name}</h3>
                          <Badge variant="outline">{placement?.label ?? rule.placement}</Badge>
                          {!rule.is_active && <Badge variant="secondary">Inativa</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {triggerProduct ? `${triggerProduct.name} -> ` : ''}
                          {suggestedProduct?.name ?? 'Produto sugerido não encontrado'}
                        </p>
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          {(rule.starts_at || rule.ends_at) && (
                            <span>{timeValue(rule.starts_at)} até {timeValue(rule.ends_at)}</span>
                          )}
                          {rule.weekdays && rule.weekdays.length > 0 && (
                            <span>{rule.weekdays.map((day) => WEEKDAYS.find((item) => item.value === day)?.label).join(', ')}</span>
                          )}
                          <span>Prioridade {rule.priority}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={rule.is_active}
                          onCheckedChange={() => toggleRule.mutate(rule)}
                          disabled={toggleRule.isPending}
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            if (confirm('Remover esta regra de upsell?')) deleteRule.mutate(rule.id);
                          }}
                          disabled={deleteRule.isPending}
                          aria-label="Remover regra"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
