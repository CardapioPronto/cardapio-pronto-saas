import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { MenuData } from '@/types/menuTheme';
import { CartProvider } from '../cart/CartContext';
import { useCart, formatBRL } from '../cart/cartContextCore';
import { CheckoutFlow } from '../checkout/CheckoutFlow';
import { AddItemModal, AddItemModalProduct } from './AddItemModal';
import { Search, ShoppingBag, MapPin, Phone, Plus, Minus, Home, ClipboardList, ChevronRight, X, Sparkles } from 'lucide-react';
import { trackPublicMenuEventQuietly } from '@/services/publicMenuAnalyticsService';

interface Props {
  data: MenuData;
}

export const DeliveryTheme = ({ data }: Props) => {
  return (
    <CartProvider restaurantId={data.restaurant.id}>
      <DeliveryLayout data={data} />
    </CartProvider>
  );
};

const DeliveryLayout = ({ data }: Props) => {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<AddItemModalProduct | null>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const lastSearchTrackingRef = useRef('');
  const { count, subtotal, addItem } = useCart();

  const primary = data.theme.colors.primary;
  const searchInputStyle: CSSProperties & Record<'--tw-ring-color', string> = {
    '--tw-ring-color': primary,
  };

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return data.categories;
    const q = search.toLowerCase();
    return data.categories
      .map(c => ({
        ...c,
        products: c.products.filter(p =>
          p.name.toLowerCase().includes(q) ||
          (p.description || '').toLowerCase().includes(q)
        ),
      }))
      .filter(c => c.products.length > 0);
  }, [data.categories, search]);

  const searchResultCount = useMemo(
    () => filteredCategories.reduce((sum, category) => sum + category.products.length, 0),
    [filteredCategories],
  );

  useEffect(() => {
    const query = search.trim();
    if (query.length < 2) return;

    const eventKey = `${query.toLowerCase()}::${searchResultCount}`;
    const timer = window.setTimeout(() => {
      if (lastSearchTrackingRef.current === eventKey) return;
      lastSearchTrackingRef.current = eventKey;
      trackPublicMenuEventQuietly({
        restaurantId: data.restaurant.id,
        eventType: searchResultCount > 0 ? 'search_performed' : 'search_no_results',
        metadata: {
          query,
          result_count: searchResultCount,
          category_count: filteredCategories.length,
        },
      });
    }, 700);

    return () => window.clearTimeout(timer);
  }, [data.restaurant.id, filteredCategories.length, search, searchResultCount]);

  const scrollToCategory = (id: string) => {
    setActiveCategory(id);
    const el = sectionRefs.current[id];
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 120;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  const openProduct = (product: MenuData['categories'][number]['products'][number]) => {
    const category = data.categories.find((item) =>
      item.products.some((categoryProduct) => categoryProduct.id === product.id),
    );
    trackPublicMenuEventQuietly({
      restaurantId: data.restaurant.id,
      eventType: 'product_click',
      productId: product.id,
      metadata: {
        category_id: category?.id,
        category_name: category?.name,
        product_name: product.name,
      },
    });
    setSelectedProduct({
      id: product.id,
      name: product.name,
      price: product.price,
      description: product.description,
      image_url: product.image_url,
      is_sold_out: product.is_sold_out,
      promotion: product.promotion
        ? {
            id: product.promotion.id,
            name: product.promotion.name,
            discount_type: product.promotion.discount_type,
            discount_value: product.promotion.discount_value,
            unit_discount: product.promotion.unit_discount,
            final_price: product.promotion.final_price,
          }
        : null,
    });
  };

  const openCheckout = () => {
    trackPublicMenuEventQuietly({
      restaurantId: data.restaurant.id,
      eventType: 'checkout_started',
      metadata: {
        item_count: count,
        subtotal,
      },
    });
    setCheckoutOpen(true);
  };

  const selectedSuggestions = useMemo(() => {
    if (!selectedProduct) return [];
    const direct = data.upsell?.productModalSuggestions[selectedProduct.id] ?? [];
    const alsoOrdered = data.upsell?.alsoOrderedSuggestions[selectedProduct.id] ?? [];
    const seen = new Set<string>();

    return [...direct, ...alsoOrdered].filter((suggestion) => {
      if (seen.has(suggestion.product.id)) return false;
      seen.add(suggestion.product.id);
      return suggestion.product.id !== selectedProduct.id;
    });
  }, [data.upsell, selectedProduct]);

  return (
    <div className="min-h-screen bg-[hsl(0,0%,96%)] text-foreground">
      {/* Header vermelho */}
      <header
        className="sticky top-0 z-30 text-white shadow-md"
        style={{ backgroundColor: primary }}
      >
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-center gap-2 sm:gap-6">
          <HeaderTab icon={<Home className="h-4 w-4" />} label="Início" active onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} />
          <HeaderTab icon={<ClipboardList className="h-4 w-4" />} label="Cardápio" onClick={() => document.getElementById('menu-categorias')?.scrollIntoView({ behavior: 'smooth' })} />
          {data.restaurant.phone_whatsapp && (
            <HeaderTab icon={<Phone className="h-4 w-4" />} label="Contato" onClick={() => window.open(`https://wa.me/${data.restaurant.phone_whatsapp?.replace(/\D/g, '')}`, '_blank', 'noopener,noreferrer')} />
          )}
        </div>
      </header>

      {/* Banner */}
      <div className="relative h-44 sm:h-64 md:h-72 bg-gradient-to-br from-muted to-muted-foreground/20 overflow-hidden">
        {data.restaurant.banner_url ? (
          <img
            src={data.restaurant.banner_url}
            alt={`Banner ${data.restaurant.name}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full"
            style={{
              background: `linear-gradient(135deg, ${primary}30, ${primary}10)`,
            }}
          />
        )}
      </div>

      {/* Container principal */}
      <div className="max-w-6xl mx-auto px-4 -mt-16 sm:-mt-20 relative z-10 pb-32 lg:pb-12">
        <div className="grid lg:grid-cols-[1fr,360px] gap-6 items-start">
          {/* Coluna esquerda */}
          <div>
            {/* Card do restaurante */}
            <div className="bg-card rounded-2xl shadow-lg p-4 sm:p-6 flex gap-4 items-center">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-muted flex-shrink-0 ring-4 ring-card -mt-10 sm:-mt-14 shadow-md">
                {data.restaurant.logo_url ? (
                  <img src={data.restaurant.logo_url} alt={data.restaurant.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl font-bold" style={{ color: primary }}>
                    {data.restaurant.name.charAt(0)}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg sm:text-2xl font-bold truncate">{data.restaurant.name}</h1>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-muted-foreground mt-1">
                  {data.restaurant.business_hours && (
                    <span className="flex items-center gap-1 font-medium" style={{ color: primary }}>
                      {data.restaurant.business_hours}
                    </span>
                  )}
                  {data.restaurant.address && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      <span className="truncate max-w-[180px]">{data.restaurant.address}</span>
                    </span>
                  )}
                  <button className="flex items-center gap-1 underline-offset-2 hover:underline">
                    Mais informações
                  </button>
                </div>
              </div>
            </div>

            {/* Toolbar: filtros + busca */}
            <div className="mt-4 flex flex-col sm:flex-row gap-3">
              <CategoryDropdown
                categories={filteredCategories}
                onSelect={scrollToCategory}
                activeId={activeCategory}
              />
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Busque por um produto"
                  className="w-full h-10 pl-10 pr-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2"
                  style={searchInputStyle}
                />
              </div>
            </div>

            {/* Promoções de pedido em destaque */}
            {data.orderPromotions && data.orderPromotions.length > 0 && (
              <div className="mt-4 space-y-2">
                {data.orderPromotions.map((promo) => (
                  <div
                    key={promo.id}
                    className="rounded-xl px-4 py-3 text-sm text-white shadow-sm"
                    style={{ backgroundColor: primary }}
                  >
                    <div className="font-semibold">{promo.name}</div>
                    <div className="text-xs opacity-90">
                      {promo.discount_type === 'percentage'
                        ? `${promo.discount_value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% no pedido`
                        : `${formatBRL(promo.discount_value)} no pedido`}
                      {promo.min_order_value
                        ? ` · a partir de ${formatBRL(promo.min_order_value)}`
                        : ''}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!search.trim() && (data.upsell?.featuredProducts?.length ?? 0) > 0 && (
              <section className="mt-5 rounded-xl bg-card p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-2">
                  <Sparkles className="h-4 w-4" style={{ color: primary }} />
                  <h2 className="text-base font-bold">Destaques de agora</h2>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {data.upsell!.featuredProducts.map((suggestion) => (
                    <FeaturedSuggestionCard
                      key={suggestion.product.id}
                      suggestion={suggestion}
                      primary={primary}
                      onAdd={() => openProduct(suggestion.product)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Categorias e produtos */}
            <div id="menu-categorias" className="mt-6 space-y-8">
              {filteredCategories.length === 0 && (
                <div className="bg-card rounded-xl p-8 text-center text-muted-foreground">
                  Nenhum produto encontrado.
                </div>
              )}
              {filteredCategories.map(cat => (
                <section
                  key={cat.id}
                  ref={(el) => { sectionRefs.current[cat.id] = el; }}
                  className="scroll-mt-32"
                >
                  <h2 className="text-xl font-bold mb-3">{cat.name}</h2>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {cat.products.map(p => (
                      <ProductCard
                        key={p.id}
                        product={p}
                        primary={primary}
                        onAdd={() => openProduct(p)}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>

          {/* Sacola lateral (desktop) */}
          <aside className="hidden lg:block sticky top-24">
            <CartPanel
              data={data}
              onCheckout={openCheckout}
            />
          </aside>
        </div>
      </div>

      {/* Botão flutuante mobile */}
      {count > 0 && !mobileCartOpen && !checkoutOpen && (
        <button
          onClick={() => setMobileCartOpen(true)}
          className="lg:hidden fixed bottom-4 left-4 right-4 z-40 text-white font-semibold py-3.5 rounded-xl shadow-2xl flex items-center justify-between px-5"
          style={{ backgroundColor: primary }}
        >
          <span className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Ver sacola
          </span>
          <span className="bg-white/20 px-2.5 py-0.5 rounded-full text-sm">{count}</span>
        </button>
      )}

      {/* Bottom-sheet mobile */}
      {mobileCartOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col bg-black/40" onClick={() => setMobileCartOpen(false)}>
          <div
            className="mt-auto bg-card rounded-t-2xl max-h-[85vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-bold">Sua sacola</h3>
              <button onClick={() => setMobileCartOpen(false)} className="p-1 hover:bg-muted rounded-md">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              <CartPanel
                data={data}
                embedded
                onCheckout={() => {
                  setMobileCartOpen(false);
                  openCheckout();
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Checkout */}
      {checkoutOpen && (
        <CheckoutFlow
          data={data}
          onClose={() => setCheckoutOpen(false)}
        />
      )}

      {/* Modal de adicionar item com observações */}
      <AddItemModal
        product={selectedProduct}
        primaryColor={primary}
        suggestions={selectedSuggestions}
        onClose={() => setSelectedProduct(null)}
        onAddSuggestion={(suggestion) => {
          addItem({
            product_id: suggestion.product.id,
            name: suggestion.product.name,
            price: suggestion.product.promotion?.final_price ?? suggestion.product.price,
            image_url: suggestion.product.image_url,
            quantity: 1,
          });
          trackPublicMenuEventQuietly({
            restaurantId: data.restaurant.id,
            eventType: 'add_to_cart',
            productId: suggestion.product.id,
            metadata: {
              product_name: suggestion.product.name,
              quantity: 1,
              interaction_source: 'product_modal_suggestion',
            },
          });
        }}
        onConfirm={({ quantity, observations }) => {
          if (!selectedProduct) return;
          addItem({
            product_id: selectedProduct.id,
            name: selectedProduct.name,
            price: selectedProduct.promotion?.final_price ?? selectedProduct.price,
            image_url: selectedProduct.image_url,
            quantity,
            observations,
          });
          trackPublicMenuEventQuietly({
            restaurantId: data.restaurant.id,
            eventType: 'add_to_cart',
            productId: selectedProduct.id,
            metadata: {
              product_name: selectedProduct.name,
              quantity,
              has_observations: Boolean(observations?.trim()),
              interaction_source: 'product_modal',
            },
          });
          setSelectedProduct(null);
        }}
      />
    </div>
  );
};

/* --- Subcomponents --- */

const HeaderTab = ({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-full text-sm font-medium transition ${
      active ? 'bg-white text-black shadow' : 'text-white/90 hover:bg-white/10'
    }`}
  >
    {icon}
    {label}
  </button>
);

const ProductCard = ({
  product,
  primary,
  onAdd,
}: {
  product: MenuData['categories'][number]['products'][number];
  primary: string;
  onAdd: () => void;
}) => {
  const promotion = product.promotion;
  const finalPrice = promotion?.final_price ?? product.price;
  const isSoldOut = Boolean(product.is_sold_out);
  const promoLabel = promotion
    ? promotion.discount_type === 'percentage'
      ? `${promotion.discount_value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% OFF`
      : `${formatBRL(promotion.discount_value)} OFF`
    : null;

  return (
    <div className={`bg-card rounded-xl p-3 flex gap-3 shadow-sm transition-shadow relative ${isSoldOut ? 'opacity-75' : 'hover:shadow-md'}`}>
      {promoLabel && (
        <span
          className="absolute -top-2 left-3 text-[10px] font-bold uppercase tracking-wide text-white px-2 py-0.5 rounded-full shadow"
          style={{ backgroundColor: primary }}
        >
          {promoLabel}
        </span>
      )}
      {isSoldOut && (
        <span className="absolute -top-2 right-3 text-[10px] font-bold uppercase tracking-wide bg-zinc-800 text-white px-2 py-0.5 rounded-full shadow">
          Esgotado
        </span>
      )}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-sm sm:text-base truncate">{product.name}</h3>
        {product.description && (
          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mt-1">{product.description}</p>
        )}
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-baseline gap-2 min-w-0">
            {promotion ? (
              <>
                <span className="text-xs text-muted-foreground line-through truncate">
                  {formatBRL(product.price)}
                </span>
                <span className="font-bold text-sm sm:text-base" style={{ color: primary }}>
                  {formatBRL(finalPrice)}
                </span>
              </>
            ) : (
              <span className="font-bold text-sm sm:text-base" style={{ color: primary }}>
                {formatBRL(product.price)}
              </span>
            )}
          </div>
          <button
            onClick={onAdd}
            disabled={isSoldOut}
            className="text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 hover:opacity-90 transition disabled:cursor-not-allowed disabled:opacity-60"
            style={{ backgroundColor: isSoldOut ? '#3f3f46' : primary }}
          >
            {!isSoldOut && <Plus className="h-3.5 w-3.5" />}
            {isSoldOut ? 'Esgotado' : 'Adicionar'}
          </button>
        </div>
      </div>
      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden bg-muted flex-shrink-0">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
            sem foto
          </div>
        )}
      </div>
    </div>
  );
};

const FeaturedSuggestionCard = ({
  suggestion,
  primary,
  onAdd,
}: {
  suggestion: NonNullable<MenuData['upsell']>['featuredProducts'][number];
  primary: string;
  onAdd: () => void;
}) => {
  const { product } = suggestion;
  const price = product.promotion?.final_price ?? product.price;

  return (
    <button
      type="button"
      onClick={onAdd}
      className="flex min-w-0 gap-3 rounded-lg border border-border p-3 text-left transition hover:bg-muted/40"
    >
      <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-md bg-muted">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">sem foto</div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{suggestion.title || product.name}</p>
        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
          {suggestion.description || product.description || product.name}
        </p>
        <p className="mt-1 text-sm font-bold" style={{ color: primary }}>{formatBRL(price)}</p>
      </div>
      <Plus className="mt-1 h-4 w-4 flex-shrink-0" style={{ color: primary }} />
    </button>
  );
};

const CategoryDropdown = ({
  categories,
  onSelect,
  activeId,
}: {
  categories: MenuData['categories'];
  onSelect: (id: string) => void;
  activeId: string | null;
}) => {
  const [open, setOpen] = useState(false);
  const active = categories.find(c => c.id === activeId);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="h-10 px-3 rounded-lg border border-border bg-card text-sm flex items-center gap-2 min-w-[180px] justify-between"
      >
        <span className="truncate">{active?.name || 'Lista de categorias'}</span>
        <ChevronRight className={`h-4 w-4 transition ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-1 w-full bg-card border border-border rounded-lg shadow-lg max-h-72 overflow-y-auto">
            {categories.map(c => (
              <button
                key={c.id}
                onClick={() => { onSelect(c.id); setOpen(false); }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-muted truncate"
              >
                {c.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const CartPanel = ({
  data,
  embedded,
  onCheckout,
}: {
  data: MenuData;
  embedded?: boolean;
  onCheckout: () => void;
}) => {
  const { items, subtotal, updateQuantity, addItem } = useCart();
  const primary = data.theme.colors.primary;
  const minOrder = data.deliveryConfig?.min_order_value || 0;
  const belowMin = minOrder > 0 && subtotal < minOrder;
  const cartProductIds = useMemo(() => new Set(items.map((item) => item.product_id)), [items]);
  const cartSuggestions = (data.upsell?.cartComboSuggestions ?? [])
    .filter((suggestion) => !cartProductIds.has(suggestion.product.id))
    .slice(0, 3);

  if (items.length === 0) {
    return (
      <div className={`${embedded ? 'p-6' : 'bg-card rounded-2xl p-6 shadow-sm'} text-center`}>
        <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
        <p className="font-semibold">Sacola vazia</p>
        <p className="text-sm text-muted-foreground mt-1">
          Adicione itens para fazer seu pedido
        </p>
      </div>
    );
  }

  return (
    <div className={`${embedded ? 'p-4' : 'bg-card rounded-2xl shadow-sm overflow-hidden'}`}>
      {!embedded && (
        <div className="px-5 pt-5 pb-3 border-b border-border">
          <h3 className="font-bold flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" /> Sua sacola
          </h3>
        </div>
      )}
      <div className={`${embedded ? '' : 'px-5 py-3'} max-h-[40vh] overflow-y-auto space-y-3`}>
        {items.map(item => (
          <div key={item.id} className="flex gap-3 pb-3 border-b border-border last:border-0">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{item.name}</p>
              <p className="text-xs text-muted-foreground">{formatBRL(item.price)}</p>
              {item.observations && (
                <p className="text-xs text-muted-foreground italic mt-0.5">Obs: {item.observations}</p>
              )}
            </div>
            <div className="flex flex-col items-end justify-between">
              <span className="text-sm font-semibold">{formatBRL(item.price * item.quantity)}</span>
              <div className="flex items-center gap-1 border border-border rounded-md">
                <button
                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  className="p-1 hover:bg-muted"
                  aria-label="Diminuir"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span className="text-xs w-5 text-center">{item.quantity}</span>
                <button
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  className="p-1 hover:bg-muted"
                  style={{ color: primary }}
                  aria-label="Aumentar"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className={`${embedded ? '' : 'px-5'} py-3 space-y-2`}>
        {cartSuggestions.length > 0 && (
          <div className="mb-3 rounded-lg border border-border bg-muted/30 p-3">
            <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Combine com</p>
            <div className="space-y-2">
              {cartSuggestions.map((suggestion) => {
                const product = suggestion.product;
                const price = product.promotion?.final_price ?? product.price;
                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => {
                      addItem({
                        product_id: product.id,
                        name: product.name,
                        price,
                        image_url: product.image_url,
                        quantity: 1,
                      });
                      trackPublicMenuEventQuietly({
                        restaurantId: data.restaurant.id,
                        eventType: 'add_to_cart',
                        productId: product.id,
                        metadata: {
                          product_name: product.name,
                          quantity: 1,
                          interaction_source: 'cart_combo_suggestion',
                        },
                      });
                    }}
                    className="flex w-full items-center justify-between gap-2 rounded-md bg-card px-2.5 py-2 text-left text-sm hover:bg-background"
                  >
                    <span className="min-w-0 flex-1 truncate">{suggestion.title || product.name}</span>
                    <span className="shrink-0 font-semibold" style={{ color: primary }}>{formatBRL(price)}</span>
                    <Plus className="h-3.5 w-3.5 shrink-0" style={{ color: primary }} />
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-semibold">{formatBRL(subtotal)}</span>
        </div>
        {minOrder > 0 && (
          <p className={`text-xs ${belowMin ? 'text-destructive' : 'text-muted-foreground'}`}>
            Pedido mínimo: {formatBRL(minOrder)}
          </p>
        )}
        <button
          onClick={onCheckout}
          disabled={belowMin}
          className="w-full text-white font-semibold py-3 rounded-xl mt-2 disabled:opacity-50 disabled:cursor-not-allowed transition hover:opacity-90"
          style={{ backgroundColor: primary }}
        >
          {belowMin ? `Faltam ${formatBRL(minOrder - subtotal)}` : 'Finalizar pedido'}
        </button>
      </div>
    </div>
  );
};
