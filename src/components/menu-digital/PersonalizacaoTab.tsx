import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { menuThemeService } from '@/services/menuThemeService';
import { DeliveryConfig, DEFAULT_DELIVERY_CONFIG } from '@/types/menuTheme';
import {
  DEFAULT_MULTI_FLAVOR_CONFIG,
  type MultiFlavorConfig,
  type MultiFlavorPricingStrategy,
} from '@/lib/multiFlavor';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { reorderItemsBatch } from '@/hooks/useOrderPosition';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { Image as ImageIcon, Upload, Loader2, Save, AlertCircle, X } from 'lucide-react';
import { SlugEditor } from './SlugEditor';
import { HoursManager } from './HoursManager';
import { PromotionsManager } from './PromotionsManager';
import { ReorderList, type DraggableItem } from './ReorderList';
import { StockSettingsCard } from '@/components/produtos/StockSettingsCard';

const PAYMENT_OPTIONS: Array<{ value: DeliveryConfig['payment_methods'][number]; label: string }> = [
  { value: 'pix', label: 'PIX' },
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'cartao_credito', label: 'Cartão de Crédito' },
  { value: 'cartao_debito', label: 'Cartão de Débito' },
];

interface RestaurantInfoForm {
  name: string;
  address: string;
  phone: string;
  phone_whatsapp: string;
  business_hours: string;
  category: string;
  logo_url: string | null;
  banner_url: string | null;
}

const emptyInfo: RestaurantInfoForm = {
  name: '',
  address: '',
  phone: '',
  phone_whatsapp: '',
  business_hours: '',
  category: '',
  logo_url: null,
  banner_url: null,
};

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export const PersonalizacaoTab = () => {
  const { user, loading: userLoading } = useCurrentUser();
  const restaurantId = user?.restaurant_id ?? '';
  const queryClient = useQueryClient();
  const [orderTab, setOrderTab] = useState('categories');

  /* ---- Fetch restaurant data ---- */
  const { data: restaurant, isLoading: loadingRestaurant } = useQuery({
    queryKey: ['restaurant-personalization', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return null;
      const { data, error } = await supabase
        .from('restaurants')
        .select('id, name, address, phone, phone_whatsapp, business_hours, category, logo_url, banner_url, slug')
        .eq('id', restaurantId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!restaurantId,
  });

  /* ---- Fetch delivery config ---- */
  const { data: deliveryConfigData, isLoading: loadingDelivery } = useQuery({
    queryKey: ['delivery-config', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return DEFAULT_DELIVERY_CONFIG;
      return menuThemeService.getDeliveryConfig(restaurantId);
    },
    enabled: !!restaurantId,
  });

  const { data: multiFlavorConfigData, isLoading: loadingMultiFlavor } = useQuery({
    queryKey: ['multi-flavor-config', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return DEFAULT_MULTI_FLAVOR_CONFIG;
      return menuThemeService.getMultiFlavorConfig(restaurantId);
    },
    enabled: !!restaurantId,
  });

  /* ---- Local form state ---- */
  const [info, setInfo] = useState<RestaurantInfoForm>(emptyInfo);
  const [delivery, setDelivery] = useState<DeliveryConfig>(DEFAULT_DELIVERY_CONFIG);
  const [multiFlavor, setMultiFlavor] = useState<MultiFlavorConfig>(DEFAULT_MULTI_FLAVOR_CONFIG);

  useEffect(() => {
    if (restaurant) {
      setInfo({
        name: restaurant.name ?? '',
        address: restaurant.address ?? '',
        phone: restaurant.phone ?? '',
        phone_whatsapp: restaurant.phone_whatsapp ?? '',
        business_hours: restaurant.business_hours ?? '',
        category: restaurant.category ?? '',
        logo_url: restaurant.logo_url ?? null,
        banner_url: restaurant.banner_url ?? null,
      });
    }
  }, [restaurant]);

  useEffect(() => {
    if (deliveryConfigData) setDelivery(deliveryConfigData);
  }, [deliveryConfigData]);

  useEffect(() => {
    if (multiFlavorConfigData) setMultiFlavor(multiFlavorConfigData);
  }, [multiFlavorConfigData]);

  /* ---- Upload handlers ---- */
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<'banner' | 'logo' | null>(null);

  const handleUpload = async (file: File, kind: 'banner' | 'logo') => {
    if (!restaurantId) return;
    if (!file.type.startsWith('image/')) {
      toast({ variant: 'destructive', title: 'Arquivo inválido', description: 'Envie um arquivo de imagem.' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ variant: 'destructive', title: 'Arquivo muito grande', description: 'Máximo de 5MB.' });
      return;
    }
    try {
      setUploading(kind);
      const url = await menuThemeService.uploadRestaurantAsset(restaurantId, file, kind);
      setInfo(prev => ({ ...prev, [`${kind}_url`]: url }));
      toast({ title: 'Imagem enviada', description: 'Não esqueça de salvar as alterações.' });
    } catch (err: unknown) {
      toast({ variant: 'destructive', title: 'Erro no upload', description: errorMessage(err, 'Falha ao enviar') });
    } finally {
      setUploading(null);
    }
  };

  /* ---- Save mutations ---- */
  const saveInfoMutation = useMutation({
    mutationFn: async () => {
      if (!restaurantId) throw new Error('Restaurante não encontrado');
      return menuThemeService.updateRestaurantInfo(restaurantId, {
        name: info.name,
        address: info.address,
        phone: info.phone,
        phone_whatsapp: info.phone_whatsapp,
        business_hours: info.business_hours,
        category: info.category,
        logo_url: info.logo_url,
        banner_url: info.banner_url,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurant-personalization', restaurantId] });
      toast({ title: 'Sucesso', description: 'Informações do estabelecimento salvas.' });
    },
    onError: (err: unknown) => {
      toast({ variant: 'destructive', title: 'Erro', description: errorMessage(err, 'Falha ao salvar') });
    },
  });

  const saveDeliveryMutation = useMutation({
    mutationFn: async () => {
      if (!restaurantId) throw new Error('Restaurante não encontrado');
      return menuThemeService.saveDeliveryConfig(restaurantId, delivery);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-config', restaurantId] });
      toast({ title: 'Sucesso', description: 'Configurações de entrega salvas.' });
    },
    onError: (err: unknown) => {
      toast({ variant: 'destructive', title: 'Erro', description: errorMessage(err, 'Falha ao salvar') });
    },
  });

  const saveMultiFlavorMutation = useMutation({
    mutationFn: async () => {
      if (!restaurantId) throw new Error('Restaurante não encontrado');
      return menuThemeService.saveMultiFlavorConfig(restaurantId, multiFlavor);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['multi-flavor-config', restaurantId] });
      toast({ title: 'Sucesso', description: 'Configurações de sabores combinados salvas.' });
    },
    onError: (err: unknown) => {
      toast({ variant: 'destructive', title: 'Erro', description: errorMessage(err, 'Falha ao salvar') });
    },
  });

  const togglePayment = (value: DeliveryConfig['payment_methods'][number]) => {
    setDelivery(prev => {
      const exists = prev.payment_methods.includes(value);
      return {
        ...prev,
        payment_methods: exists
          ? prev.payment_methods.filter(p => p !== value)
          : [...prev.payment_methods, value],
      };
    });
  };

  if (userLoading || loadingRestaurant || loadingDelivery || loadingMultiFlavor) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Carregando configurações...</span>
      </div>
    );
  }

  if (!restaurantId) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Restaurante não encontrado. Verifique sua conta.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Imagens */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Identidade visual
          </CardTitle>
          <CardDescription>Banner de capa e logo do seu estabelecimento</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Banner */}
          <div className="space-y-2">
            <Label>Banner (capa)</Label>
            <div className="relative w-full aspect-[3/1] rounded-lg overflow-hidden border-2 border-dashed border-border bg-muted">
              {info.banner_url ? (
                <>
                  <img src={info.banner_url} alt="Banner" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setInfo(p => ({ ...p, banner_url: null }))}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-destructive text-destructive-foreground hover:opacity-90"
                    aria-label="Remover banner"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                  Nenhum banner enviado
                </div>
              )}
            </div>
            <input
              ref={bannerInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) handleUpload(f, 'banner');
                if (bannerInputRef.current) bannerInputRef.current.value = '';
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => bannerInputRef.current?.click()}
              disabled={uploading === 'banner'}
            >
              {uploading === 'banner' ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enviando...</>
              ) : (
                <><Upload className="h-4 w-4 mr-2" /> {info.banner_url ? 'Alterar banner' : 'Enviar banner'}</>
              )}
            </Button>
            <p className="text-xs text-muted-foreground">
              Recomendado: 1200x400px. JPG ou PNG. Máximo 5MB.
            </p>
          </div>

          {/* Logo */}
          <div className="space-y-2">
            <Label>Logo</Label>
            <div className="flex items-center gap-4">
              <div className="relative w-24 h-24 rounded-xl overflow-hidden border-2 border-dashed border-border bg-muted">
                {info.logo_url ? (
                  <>
                    <img src={info.logo_url} alt="Logo" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setInfo(p => ({ ...p, logo_url: null }))}
                      className="absolute top-1 right-1 p-1 rounded-full bg-destructive text-destructive-foreground hover:opacity-90"
                      aria-label="Remover logo"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs text-center px-1">
                    Sem logo
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) handleUpload(f, 'logo');
                    if (logoInputRef.current) logoInputRef.current.value = '';
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={uploading === 'logo'}
                >
                  {uploading === 'logo' ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enviando...</>
                  ) : (
                    <><Upload className="h-4 w-4 mr-2" /> {info.logo_url ? 'Alterar logo' : 'Enviar logo'}</>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground">Quadrado, 400x400px. Máximo 5MB.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dados do estabelecimento */}
      <Card>
        <CardHeader>
          <CardTitle>Dados do estabelecimento</CardTitle>
          <CardDescription>Informações exibidas no cardápio público</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="r-name">Nome</Label>
              <Input id="r-name" value={info.name} onChange={e => setInfo(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="r-category">Categoria</Label>
              <Input
                id="r-category"
                placeholder="Ex: Pizzaria, Hamburgueria"
                value={info.category}
                onChange={e => setInfo(p => ({ ...p, category: e.target.value }))}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="r-address">Endereço</Label>
              <Input id="r-address" value={info.address} onChange={e => setInfo(p => ({ ...p, address: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="r-phone">Telefone</Label>
              <Input
                id="r-phone"
                placeholder="(11) 99999-9999"
                value={info.phone}
                onChange={e => setInfo(p => ({ ...p, phone: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="r-whatsapp">WhatsApp</Label>
              <Input
                id="r-whatsapp"
                placeholder="(11) 99999-9999"
                value={info.phone_whatsapp}
                onChange={e => setInfo(p => ({ ...p, phone_whatsapp: e.target.value }))}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="r-hours">Horário de funcionamento</Label>
              <Textarea
                id="r-hours"
                placeholder="Ex: Seg a Sex 18h-23h, Sab e Dom 12h-23h"
                rows={2}
                value={info.business_hours}
                onChange={e => setInfo(p => ({ ...p, business_hours: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={() => saveInfoMutation.mutate()} disabled={saveInfoMutation.isPending}>
              {saveInfoMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvando...</>
              ) : (
                <><Save className="h-4 w-4 mr-2" /> Salvar informações</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Configurações de delivery */}
      <Card>
        <CardHeader>
          <CardTitle>Configurações de entrega</CardTitle>
          <CardDescription>Defina taxa, raio, formas de pagamento e mais</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="space-y-0.5">
                <Label className="text-sm">Delivery habilitado</Label>
                <p className="text-xs text-muted-foreground">Aceitar pedidos para entrega</p>
              </div>
              <Switch
                checked={delivery.delivery_enabled}
                onCheckedChange={v => setDelivery(p => ({ ...p, delivery_enabled: v }))}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="space-y-0.5">
                <Label className="text-sm">Retirada habilitada</Label>
                <p className="text-xs text-muted-foreground">Cliente retira no balcão</p>
              </div>
              <Switch
                checked={delivery.pickup_enabled}
                onCheckedChange={v => setDelivery(p => ({ ...p, pickup_enabled: v }))}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="d-fee">Taxa de entrega (R$)</Label>
              <Input
                id="d-fee"
                type="number"
                min="0"
                step="0.01"
                value={delivery.delivery_fee}
                onChange={e => setDelivery(p => ({ ...p, delivery_fee: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="d-min">Pedido mínimo (R$)</Label>
              <Input
                id="d-min"
                type="number"
                min="0"
                step="0.01"
                value={delivery.min_order_value}
                onChange={e => setDelivery(p => ({ ...p, min_order_value: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="d-time">Tempo estimado (minutos)</Label>
              <Input
                id="d-time"
                type="number"
                min="0"
                step="5"
                value={delivery.estimated_delivery_minutes}
                onChange={e => setDelivery(p => ({ ...p, estimated_delivery_minutes: parseInt(e.target.value, 10) || 0 }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="d-radius">Raio de entrega (km)</Label>
              <Input
                id="d-radius"
                type="number"
                min="0"
                step="0.5"
                value={delivery.delivery_radius_km}
                onChange={e => setDelivery(p => ({ ...p, delivery_radius_km: parseFloat(e.target.value) || 0 }))}
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label>Formas de pagamento aceitas</Label>
            <div className="grid grid-cols-2 gap-3">
              {PAYMENT_OPTIONS.map(opt => {
                const checked = delivery.payment_methods.includes(opt.value);
                return (
                  <label
                    key={opt.value}
                    className="flex items-center gap-2 rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/50"
                  >
                    <Checkbox checked={checked} onCheckedChange={() => togglePayment(opt.value)} />
                    <span className="text-sm">{opt.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={() => saveDeliveryMutation.mutate()} disabled={saveDeliveryMutation.isPending}>
              {saveDeliveryMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvando...</>
              ) : (
                <><Save className="h-4 w-4 mr-2" /> Salvar entrega</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Slug do Cardápio */}
      {restaurantId && <SlugEditor restaurantId={restaurantId} currentSlug={restaurant?.slug ?? undefined} />}

      <Card>
        <CardHeader>
          <CardTitle>Sabores combinados</CardTitle>
          <CardDescription>
            Permita itens de dois sabores e escolha como o valor final será calculado.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div className="space-y-0.5">
              <Label className="text-sm">Habilitar no cardápio público</Label>
              <p className="text-xs text-muted-foreground">
                A opção aparece apenas em produtos marcados como “Combinar sabores”.
              </p>
            </div>
            <Switch
              checked={multiFlavor.enabled}
              onCheckedChange={v => setMultiFlavor(p => ({ ...p, enabled: v }))}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr_1.4fr]">
            <div className="space-y-2">
              <Label>Regra de preço</Label>
              <Select
                value={multiFlavor.pricing_strategy}
                onValueChange={(value) =>
                  setMultiFlavor(p => ({
                    ...p,
                    pricing_strategy: value as MultiFlavorPricingStrategy,
                    max_flavors: 2,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="highest">Cobrar maior sabor</SelectItem>
                  <SelectItem value="average">Cobrar proporcional</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Alert>
              <AlertDescription className="text-sm">
                “Maior sabor” é o padrão comercial mais seguro para pizzas de dois sabores. “Proporcional” cobra a média dos sabores escolhidos.
              </AlertDescription>
            </Alert>
          </div>

          <div className="flex justify-end">
            <Button onClick={() => saveMultiFlavorMutation.mutate()} disabled={saveMultiFlavorMutation.isPending}>
              {saveMultiFlavorMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvando...</>
              ) : (
                <><Save className="h-4 w-4 mr-2" /> Salvar sabores</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Horário de Funcionamento */}
      {restaurantId && <HoursManager restaurantId={restaurantId} />}

      {/* Controle de Estoque (chave geral por restaurante) */}
      {restaurantId && <StockSettingsCard restaurantId={restaurantId} />}

      {/* Gerenciar Promoções */}
      <Card>
        <CardHeader>
          <CardTitle>Promoções e Descontos</CardTitle>
          <CardDescription>
            Promoções automáticas aplicadas server-side no cardápio e no checkout.
            Quando houver promoção de pedido ativa, o cupom só vale se der maior desconto.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PromotionsManager />
        </CardContent>
      </Card>

      {/* Reordenar Categorias e Produtos */}
      <Tabs value={orderTab} onValueChange={setOrderTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:w-auto">
          <TabsTrigger value="categories">Ordenar Categorias</TabsTrigger>
          <TabsTrigger value="products">Ordenar Produtos</TabsTrigger>
        </TabsList>
        <TabsContent value="categories" className="space-y-4">
          {orderTab === 'categories' && <CategoriesOrderManager restaurantId={restaurantId} />}
        </TabsContent>
        <TabsContent value="products" className="space-y-4">
          {orderTab === 'products' && <ProductsOrderManager restaurantId={restaurantId} />}
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Sub-component for managing category order
const CategoriesOrderManager: React.FC<{ restaurantId: string }> = ({ restaurantId }) => {
  const queryClient = useQueryClient();
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories-order', restaurantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, order_position')
        .eq('restaurant_id', restaurantId)
        .order('order_position', { ascending: true, nullsFirst: false })
        .order('name', { ascending: true });
      if (error) throw error;
      return data as unknown as DraggableItem[];
    },
    enabled: !!restaurantId,
  });

  const handleReorder = async (items: Array<{ id: string; order_position: number }>) => {
    await reorderItemsBatch('categories', items, restaurantId);
    await queryClient.invalidateQueries({ queryKey: ['categories-order', restaurantId] });
    await queryClient.invalidateQueries({ queryKey: ['categories'] });
  };

  return (
    <ReorderList
      items={categories}
      title="Ordenar Categorias"
      description="Arraste para reorganizar a ordem das categorias no cardápio"
      onReorder={handleReorder}
      isLoading={isLoading}
    />
  );
};

// Sub-component for managing product order
const ProductsOrderManager: React.FC<{ restaurantId: string }> = ({ restaurantId }) => {
  const queryClient = useQueryClient();
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products-order', restaurantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, order_position')
        .eq('restaurant_id', restaurantId)
        .order('order_position', { ascending: true, nullsFirst: false })
        .order('name', { ascending: true });
      if (error) throw error;
      return data as unknown as DraggableItem[];
    },
    enabled: !!restaurantId,
  });

  const handleReorder = async (items: Array<{ id: string; order_position: number }>) => {
    await reorderItemsBatch('products', items, restaurantId);
    await queryClient.invalidateQueries({ queryKey: ['products-order', restaurantId] });
  };

  return (
    <ReorderList
      items={products}
      title="Ordenar Produtos"
      description="Arraste para reorganizar a ordem dos produtos no cardápio"
      onReorder={handleReorder}
      isLoading={isLoading}
    />
  );
};

export default PersonalizacaoTab;
