import { useMemo, useState } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useProdutos } from '@/hooks/useProdutos';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { toast } from '@/components/ui/sonner-toast';
import { Loader2, PackagePlus, Plus, Trash2, UtensilsCrossed } from 'lucide-react';

type Unit = 'g' | 'kg' | 'ml' | 'l' | 'un' | 'porcao';

type Ingredient = {
  id: string;
  restaurant_id: string;
  name: string;
  unit: Unit;
  current_quantity: number;
  min_quantity: number | null;
  unit_cost: number;
  is_active: boolean;
};

type RecipeItem = {
  id: string;
  restaurant_id: string;
  product_id: string;
  ingredient_id: string;
  quantity: number;
  loss_percent: number;
  notes: string | null;
};

type RecipeCost = {
  productId: string;
  productName: string;
  price: number;
  ingredientCount: number;
  estimatedCost: number;
  grossMargin: number;
  grossMarginPercent: number;
};

type QueryResult = { data: unknown; error: unknown };
type QueryBuilder = PromiseLike<QueryResult> & {
  eq: (column: string, value: unknown) => QueryBuilder;
  order: (column: string, options?: { ascending?: boolean }) => QueryBuilder;
  limit: (count: number) => QueryBuilder;
};
type WriteBuilder = PromiseLike<QueryResult> & {
  eq: (column: string, value: unknown) => WriteBuilder;
  select: () => { single: () => Promise<QueryResult> };
};
type DbClient = {
  from: (table: string) => {
    select: (columns?: string) => QueryBuilder;
    insert: (payload: Record<string, unknown>) => WriteBuilder;
    update: (payload: Record<string, unknown>) => WriteBuilder;
    delete: () => WriteBuilder;
  };
  rpc: (fn: string, args: Record<string, unknown>) => Promise<QueryResult>;
};

const db = supabase as unknown as DbClient;

const units: Array<{ value: Unit; label: string }> = [
  { value: 'g', label: 'g' },
  { value: 'kg', label: 'kg' },
  { value: 'ml', label: 'ml' },
  { value: 'l', label: 'l' },
  { value: 'un', label: 'un' },
  { value: 'porcao', label: 'porção' },
];

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

const asNumber = (value: unknown) => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const Insumos = () => {
  const { user, loading: userLoading } = useCurrentUser();
  const restaurantId = user?.restaurant_id ?? '';
  const queryClient = useQueryClient();
  const { produtos: products = [] } = useProdutos(restaurantId, { itensPorPagina: 500 });

  const [ingredientForm, setIngredientForm] = useState({
    name: '',
    unit: 'un' as Unit,
    current_quantity: 0,
    min_quantity: '',
    unit_cost: 0,
  });
  const [adjustment, setAdjustment] = useState({
    ingredient_id: '',
    quantity_delta: 0,
    reason: '',
    notes: '',
  });
  const [recipeForm, setRecipeForm] = useState({
    product_id: '',
    ingredient_id: '',
    quantity: 1,
    loss_percent: 0,
    notes: '',
  });

  const { data: ingredients = [], isLoading: loadingIngredients } = useQuery({
    queryKey: ['inventory-ingredients', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      const { data, error } = await db
        .from('inventory_ingredients')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('name', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Ingredient[];
    },
    enabled: !!restaurantId,
  });

  const { data: recipeItems = [], isLoading: loadingRecipes } = useQuery({
    queryKey: ['product-recipe-items', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      const { data, error } = await db
        .from('product_recipe_items')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as RecipeItem[];
    },
    enabled: !!restaurantId,
  });

  const { data: recipeCosts = [], isLoading: loadingCosts } = useQuery({
    queryKey: ['recipe-costs', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      const { data, error } = await db.rpc('get_recipe_costs', { p_restaurant_id: restaurantId });
      if (error) throw error;
      return Array.isArray(data) ? (data as RecipeCost[]) : [];
    },
    enabled: !!restaurantId,
  });

  const { data: movements = [] } = useQuery({
    queryKey: ['ingredient-stock-movements', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      const { data, error } = await db
        .from('ingredient_stock_movements')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false })
        .limit(12);
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string;
        ingredient_id: string;
        quantity_delta: number;
        movement_type: string;
        reason: string | null;
        created_at: string;
      }>;
    },
    enabled: !!restaurantId,
  });

  const ingredientById = useMemo(
    () => new Map(ingredients.map((ingredient) => [ingredient.id, ingredient])),
    [ingredients],
  );
  const productById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );

  const lowStockCount = ingredients.filter(
    (ingredient) => ingredient.min_quantity != null && ingredient.current_quantity <= ingredient.min_quantity,
  ).length;

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['inventory-ingredients', restaurantId] });
    queryClient.invalidateQueries({ queryKey: ['product-recipe-items', restaurantId] });
    queryClient.invalidateQueries({ queryKey: ['recipe-costs', restaurantId] });
    queryClient.invalidateQueries({ queryKey: ['ingredient-stock-movements', restaurantId] });
  };

  const createIngredient = useMutation({
    mutationFn: async () => {
      if (!restaurantId) throw new Error('Restaurante não encontrado.');
      if (!ingredientForm.name.trim()) throw new Error('Informe o nome do insumo.');

      const { data, error } = await db
        .from('inventory_ingredients')
        .insert({
          restaurant_id: restaurantId,
          name: ingredientForm.name.trim(),
          unit: ingredientForm.unit,
          current_quantity: asNumber(ingredientForm.current_quantity),
          min_quantity: ingredientForm.min_quantity === '' ? null : asNumber(ingredientForm.min_quantity),
          unit_cost: asNumber(ingredientForm.unit_cost),
        })
        .select()
        .single();

      if (error) throw error;
      return data as Ingredient;
    },
    onSuccess: () => {
      invalidateAll();
      setIngredientForm({ name: '', unit: 'un', current_quantity: 0, min_quantity: '', unit_cost: 0 });
      toast.success('Insumo cadastrado.');
    },
    onError: (error) => toast.error(errorMessage(error, 'Erro ao cadastrar insumo.')),
  });

  const adjustStock = useMutation({
    mutationFn: async () => {
      if (!restaurantId) throw new Error('Restaurante não encontrado.');
      if (!adjustment.ingredient_id) throw new Error('Selecione um insumo.');
      if (!adjustment.reason.trim()) throw new Error('Informe o motivo do ajuste.');
      if (asNumber(adjustment.quantity_delta) === 0) throw new Error('Informe uma quantidade diferente de zero.');

      const { error } = await db.rpc('adjust_ingredient_stock', {
        p_args: {
          restaurant_id: restaurantId,
          ingredient_id: adjustment.ingredient_id,
          quantity_delta: asNumber(adjustment.quantity_delta),
          movement_type: asNumber(adjustment.quantity_delta) > 0 ? 'adjustment_in' : 'adjustment_out',
          reason: adjustment.reason.trim(),
          notes: adjustment.notes.trim() || null,
        },
      });

      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll();
      setAdjustment({ ingredient_id: '', quantity_delta: 0, reason: '', notes: '' });
      toast.success('Saldo ajustado.');
    },
    onError: (error) => toast.error(errorMessage(error, 'Erro ao ajustar saldo.')),
  });

  const saveRecipeItem = useMutation({
    mutationFn: async () => {
      if (!restaurantId) throw new Error('Restaurante não encontrado.');
      if (!recipeForm.product_id || !recipeForm.ingredient_id) {
        throw new Error('Selecione produto e insumo.');
      }
      if (asNumber(recipeForm.quantity) <= 0) throw new Error('Quantidade deve ser maior que zero.');

      const { data, error } = await db
        .from('product_recipe_items')
        .insert({
          restaurant_id: restaurantId,
          product_id: recipeForm.product_id,
          ingredient_id: recipeForm.ingredient_id,
          quantity: asNumber(recipeForm.quantity),
          loss_percent: Math.max(0, Math.min(100, asNumber(recipeForm.loss_percent))),
          notes: recipeForm.notes.trim() || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as RecipeItem;
    },
    onSuccess: () => {
      invalidateAll();
      setRecipeForm({ product_id: '', ingredient_id: '', quantity: 1, loss_percent: 0, notes: '' });
      toast.success('Item adicionado à ficha técnica.');
    },
    onError: (error) => toast.error(errorMessage(error, 'Erro ao salvar ficha técnica.')),
  });

  const deleteRecipeItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from('product_recipe_items').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll();
      toast.success('Item removido da ficha técnica.');
    },
    onError: () => toast.error('Erro ao remover item.'),
  });

  if (userLoading) {
    return (
      <DashboardLayout title="Insumos">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Carregando...
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Insumos e ficha técnica">
      <div className="space-y-5">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Insumos ativos</CardDescription>
              <CardTitle>{ingredients.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Alertas de baixo saldo</CardDescription>
              <CardTitle>{lowStockCount}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Produtos com ficha</CardDescription>
              <CardTitle>{recipeCosts.filter((item) => item.ingredientCount > 0).length}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Tabs defaultValue="ingredients" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
            <TabsTrigger value="ingredients">Insumos</TabsTrigger>
            <TabsTrigger value="recipes">Ficha técnica</TabsTrigger>
            <TabsTrigger value="costs">Custos</TabsTrigger>
            <TabsTrigger value="movements">Movimentos</TabsTrigger>
          </TabsList>

          <TabsContent value="ingredients" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Cadastrar insumo</CardTitle>
                <CardDescription>Informe saldo, unidade e custo unitário usado na ficha técnica.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-5">
                <div className="space-y-2 md:col-span-2">
                  <Label>Nome</Label>
                  <Input value={ingredientForm.name} onChange={(event) => setIngredientForm({ ...ingredientForm, name: event.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Unidade</Label>
                  <Select value={ingredientForm.unit} onValueChange={(value) => setIngredientForm({ ...ingredientForm, unit: value as Unit })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {units.map((unit) => <SelectItem key={unit.value} value={unit.value}>{unit.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Saldo</Label>
                  <Input type="number" value={ingredientForm.current_quantity} onChange={(event) => setIngredientForm({ ...ingredientForm, current_quantity: asNumber(event.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>Custo unitário</Label>
                  <Input type="number" min="0" step="0.01" value={ingredientForm.unit_cost} onChange={(event) => setIngredientForm({ ...ingredientForm, unit_cost: asNumber(event.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>Saldo mínimo</Label>
                  <Input value={ingredientForm.min_quantity} onChange={(event) => setIngredientForm({ ...ingredientForm, min_quantity: event.target.value })} />
                </div>
                <div className="flex items-end md:col-span-4">
                  <Button onClick={() => createIngredient.mutate()} disabled={createIngredient.isPending}>
                    {createIngredient.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PackagePlus className="mr-2 h-4 w-4" />}
                    Cadastrar
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Ajustar saldo</CardTitle>
                <CardDescription>Entradas e saídas manuais ficam registradas no histórico.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-4">
                <div className="space-y-2">
                  <Label>Insumo</Label>
                  <Select value={adjustment.ingredient_id} onValueChange={(value) => setAdjustment({ ...adjustment, ingredient_id: value })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {ingredients.map((ingredient) => (
                        <SelectItem key={ingredient.id} value={ingredient.id}>{ingredient.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Quantidade (+ entrada / - saída)</Label>
                  <Input type="number" value={adjustment.quantity_delta} onChange={(event) => setAdjustment({ ...adjustment, quantity_delta: asNumber(event.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>Motivo</Label>
                  <Input value={adjustment.reason} onChange={(event) => setAdjustment({ ...adjustment, reason: event.target.value })} />
                </div>
                <div className="flex items-end">
                  <Button variant="outline" onClick={() => adjustStock.mutate()} disabled={adjustStock.isPending}>
                    {adjustStock.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Ajustar
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Base de insumos</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingIngredients ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : ingredients.length === 0 ? (
                  <EmptyState icon={PackagePlus} title="Nenhum insumo cadastrado" description="Cadastre ingredientes, embalagens ou itens de preparo." />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b text-left text-muted-foreground">
                        <tr>
                          <th className="py-2">Insumo</th>
                          <th>Saldo</th>
                          <th>Mínimo</th>
                          <th>Custo unitário</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ingredients.map((ingredient) => (
                          <tr key={ingredient.id} className="border-b last:border-0">
                            <td className="py-3 font-medium">{ingredient.name}</td>
                            <td>
                              <Badge variant={ingredient.min_quantity != null && ingredient.current_quantity <= ingredient.min_quantity ? 'destructive' : 'outline'}>
                                {ingredient.current_quantity} {ingredient.unit}
                              </Badge>
                            </td>
                            <td>{ingredient.min_quantity ?? '-'}</td>
                            <td>{money.format(ingredient.unit_cost)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recipes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Adicionar item à ficha técnica</CardTitle>
                <CardDescription>Defina quanto de cada insumo é consumido para produzir uma unidade do produto.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-5">
                <div className="space-y-2 md:col-span-2">
                  <Label>Produto</Label>
                  <Select value={recipeForm.product_id} onValueChange={(value) => setRecipeForm({ ...recipeForm, product_id: value })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {products.map((product) => <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Insumo</Label>
                  <Select value={recipeForm.ingredient_id} onValueChange={(value) => setRecipeForm({ ...recipeForm, ingredient_id: value })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {ingredients.map((ingredient) => <SelectItem key={ingredient.id} value={ingredient.id}>{ingredient.name} ({ingredient.unit})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Quantidade</Label>
                  <Input type="number" min="0" step="0.001" value={recipeForm.quantity} onChange={(event) => setRecipeForm({ ...recipeForm, quantity: asNumber(event.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>Perda %</Label>
                  <Input type="number" min="0" max="100" step="0.1" value={recipeForm.loss_percent} onChange={(event) => setRecipeForm({ ...recipeForm, loss_percent: asNumber(event.target.value) })} />
                </div>
                <div className="space-y-2 md:col-span-3">
                  <Label>Observação</Label>
                  <Textarea rows={1} value={recipeForm.notes} onChange={(event) => setRecipeForm({ ...recipeForm, notes: event.target.value })} />
                </div>
                <div className="flex items-end">
                  <Button onClick={() => saveRecipeItem.mutate()} disabled={saveRecipeItem.isPending}>
                    {saveRecipeItem.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                    Adicionar
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Itens de ficha técnica</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingRecipes ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : recipeItems.length === 0 ? (
                  <EmptyState icon={UtensilsCrossed} title="Nenhuma ficha técnica cadastrada" description="Adicione insumos aos produtos principais para calcular custo e margem." />
                ) : (
                  <div className="space-y-2">
                    {recipeItems.map((item) => {
                      const ingredient = ingredientById.get(item.ingredient_id);
                      const product = productById.get(item.product_id);
                      return (
                        <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                          <div className="min-w-0">
                            <p className="font-medium">{product?.name ?? 'Produto'}</p>
                            <p className="text-sm text-muted-foreground">
                              {item.quantity} {ingredient?.unit ?? ''} de {ingredient?.name ?? 'insumo'}
                              {item.loss_percent > 0 ? ` + ${item.loss_percent}% perda` : ''}
                            </p>
                          </div>
                          <Button size="icon" variant="ghost" onClick={() => deleteRecipeItem.mutate(item.id)} aria-label="Remover">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="costs">
            <Card>
              <CardHeader>
                <CardTitle>Custo estimado e margem bruta</CardTitle>
                <CardDescription>Calculado a partir da ficha técnica e do custo unitário dos insumos.</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingCosts ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b text-left text-muted-foreground">
                        <tr>
                          <th className="py-2">Produto</th>
                          <th>Preço</th>
                          <th>Custo</th>
                          <th>Margem</th>
                          <th>Ficha</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recipeCosts.map((item) => (
                          <tr key={item.productId} className="border-b last:border-0">
                            <td className="py-3 font-medium">{item.productName}</td>
                            <td>{money.format(item.price)}</td>
                            <td>{money.format(item.estimatedCost)}</td>
                            <td>
                              <Badge variant={item.grossMargin >= 0 ? 'outline' : 'destructive'}>
                                {money.format(item.grossMargin)} ({item.grossMarginPercent}%)
                              </Badge>
                            </td>
                            <td>{item.ingredientCount} insumo{item.ingredientCount === 1 ? '' : 's'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="movements">
            <Card>
              <CardHeader>
                <CardTitle>Últimos movimentos de insumos</CardTitle>
                <CardDescription>Inclui ajustes manuais, baixas por pedido finalizado e estornos.</CardDescription>
              </CardHeader>
              <CardContent>
                {movements.length === 0 ? (
                  <EmptyState icon={PackagePlus} title="Nenhum movimento registrado" description="Os movimentos aparecerão após ajustes ou pedidos finalizados." />
                ) : (
                  <div className="space-y-2">
                    {movements.map((movement) => {
                      const ingredient = ingredientById.get(movement.ingredient_id);
                      return (
                        <div key={movement.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                          <div>
                            <p className="font-medium">{ingredient?.name ?? 'Insumo'}</p>
                            <p className="text-xs text-muted-foreground">{movement.reason || movement.movement_type}</p>
                          </div>
                          <div className="text-right">
                            <p className={movement.quantity_delta > 0 ? 'text-emerald-700' : 'text-rose-700'}>
                              {movement.quantity_delta > 0 ? '+' : ''}{movement.quantity_delta}
                            </p>
                            <p className="text-xs text-muted-foreground">{new Date(movement.created_at).toLocaleString('pt-BR')}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Insumos;
