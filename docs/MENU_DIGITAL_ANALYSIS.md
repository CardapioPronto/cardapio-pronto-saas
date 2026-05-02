# Análise Completa do Módulo Menu Digital

**Data da Análise:** 1 de maio de 2026  
**Localização:** `src/components/menu-digital`  
**Linguagem:** TypeScript + React  
**Status:** Ativo e em produção

---

## 📋 Sumário Executivo

O módulo **Menu Digital** é responsável pela gestão completa de cardápios digitais dos restaurantes, incluindo:
- Seleção e personalização de temas
- Geração e gerenciamento de QR Codes
- Configuração de informações do estabelecimento
- Customização de cores e aparência
- Gerenciamento de configurações de entrega
- Visualização de preview do cardápio

**Total de Arquivos:** 6 componentes principais  
**Padrão Arquitetural:** Component-based com hooks reutilizáveis  
**Gerenciador de Estado:** React Query (TanStack Query) + Local State

---

## 1️⃣ Estrutura de Pastas e Arquivos

```
src/components/menu-digital/
├── ColorCustomizer.tsx          # Componente de personalização de cores
├── MenuPreview.tsx              # Componente de visualização do cardápio
├── MenuThemeSelector.tsx        # Seletor de temas disponíveis
├── PersonalizacaoTab.tsx        # Aba de personalização completa
├── QRCodeGenerator.tsx          # Gerador de QR Code dinâmico
└── QRCodeInstructions.tsx       # Instruções e guia de implementação
```

**Arquivos Relacionados (Suporte):**
- `src/hooks/useMenuThemes.ts` - Hooks customizados
- `src/services/menuThemeService.ts` - Serviço de integração
- `src/types/menuTheme.ts` - Tipos e interfaces
- `src/hooks/useCurrentUser.ts` - Hook de autenticação

---

## 2️⃣ Componentes Principais

### 2.1 **ColorCustomizer** 
**Arquivo:** `ColorCustomizer.tsx`

**Descrição:**  
Componente reutilizável para personalização de paleta de cores do cardápio digital. Permite edição de 5 cores principais com validação de formato hexadecimal.

**Props:**
```typescript
interface ColorCustomizerProps {
  config: RestaurantMenuConfig;           // Configuração atual do cardápio
  onUpdateColors: (colors: Record<string, string>) => void;  // Callback de atualização
}
```

**Funcionalidades:**
- ✅ Seletor visual de cores (color picker)
- ✅ Input de texto para formato hexadecimal
- ✅ Validação de formato (#RRGGBB)
- ✅ Detecção de mudanças (hasChanges flag)
- ✅ Botões Salvar e Resetar com controle de estado
- ✅ 5 cores configuráveis:
  - Cor Primária (padrão: #81B29A)
  - Cor Secundária (padrão: #E07A5F)
  - Fundo (padrão: #FEFEFE)
  - Texto (padrão: #2C3E50)
  - Destaque/Accent (padrão: #F4F3EE)

**Dependências:**
- `@/components/ui/card`
- `@/components/ui/label`
- `@/components/ui/input`
- `@/components/ui/button`
- `lucide-react` (ícone Palette)

**Padrões Usados:**
- Local state management com `useState`
- Validação com regex
- Toast notifications para erros

---

### 2.2 **MenuPreview**
**Arquivo:** `MenuPreview.tsx`

**Descrição:**  
Componente que permite visualizar e compartilhar o cardápio digital gerado. Oferece preview em nova aba e cópia de link.

**Funcionalidades:**
- ✅ Visualizar cardápio em nova aba (preview)
- ✅ Copiar link do cardápio para clipboard
- ✅ Suporte a cache-busting com timestamp (previne erro de módulos dinâmicos)
- ✅ Resolução de slug do restaurante (fallback para ID)
- ✅ Indicação do tema ativo
- ✅ Status de cores personalizadas
- ✅ Loading skeleton enquanto carrega

**Dados Utilizados:**
```typescript
// Usa:
user?.restaurant_id     // ID do restaurante (useCurrentUser)
publicSlug             // Slug público do restaurante
config?.theme_id       // ID do tema ativo
config?.custom_colors  // Cores personalizadas
```

**URLs Geradas:**
- Preview: `/cardapio/{slug}?preview={timestamp}`
- Public: `/cardapio/{slug}`

**Dependências:**
- `useCurrentUser` hook
- `useRestaurantMenuConfig` hook
- Supabase client

**Padrões Usados:**
- Async data fetching com useEffect
- Cache-busting para módulos dinâmicos
- Clipboard API nativa

---

### 2.3 **MenuThemeSelector**
**Arquivo:** `MenuThemeSelector.tsx`

**Descrição:**  
Componente principal para seleção de temas. Exibe todos os temas disponíveis em grid e permite seleção com feedback visual.

**Funcionalidades:**
- ✅ Grid responsivo (2 colunas tablet, 3 colunas desktop)
- ✅ Visualização de imagem de preview do tema
- ✅ Indicação visual do tema ativo (ring border)
- ✅ Badge "Em breve" para temas desativados
- ✅ Badge "Ativo" para tema selecionado
- ✅ Proteção contra múltiplas submissões
- ✅ Integração com ColorCustomizer
- ✅ Estados de loading e erro comprehensive

**Estados de Validação:**
```typescript
- userLoading          // Carregando dados do usuário
- loadingThemes        // Carregando temas disponíveis
- loadingConfig        // Carregando configuração do restaurante
- isUpdating           // Atualizando tema (desabilita interação)
- themesError          // Erro ao carregar temas
- configError          // Erro na configuração
- !user?.restaurant_id // Restaurante não encontrado
- !themes.length       // Sem temas disponíveis
```

**Dependências:**
- `useMenuThemes` hook
- `useRestaurantMenuConfig` hook
- `useCurrentUser` hook
- `ColorCustomizer` componente

**Padrões Usados:**
- Composição de componentes
- Estados condicionais múltiplos
- Prevenção de race conditions

---

### 2.4 **PersonalizacaoTab**
**Arquivo:** `PersonalizacaoTab.tsx` (Maior componente do módulo)

**Descrição:**  
Componente abrangente que centraliza todas as personalizações do cardápio: dados do estabelecimento, imagens (banner/logo) e configurações de entrega.

**Seções Principais:**

#### 4.1 **Identidade Visual**
- Upload de Banner (1200x400px, até 5MB)
- Upload de Logo (400x400px, até 5MB)
- Visualização inline
- Remoção rápida com botão X

#### 4.2 **Dados do Estabelecimento**
Campos de entrada:
- Nome do restaurante
- Categoria (Pizzaria, Hamburgueria, etc.)
- Endereço
- Telefone
- WhatsApp
- Horário de funcionamento

#### 4.3 **Configurações de Entrega**
- Toggle: Delivery habilitado
- Toggle: Retirada (pickup) habilitada
- Taxa de entrega (R$)
- Pedido mínimo (R$)
- Tempo estimado (minutos)
- Raio de entrega (km)
- Formas de pagamento (checkboxes):
  - PIX
  - Dinheiro
  - Cartão de Crédito
  - Cartão de Débito

**Fluxo de Dados:**
```typescript
1. Fetch: restaurant data (supabase.restaurants)
2. Fetch: delivery config (menuThemeService.getDeliveryConfig)
3. Local state: RestaurantInfoForm
4. Local state: DeliveryConfig
5. Mutations: saveInfoMutation, saveDeliveryMutation
6. Cache invalidation: queryClient.invalidateQueries
```

**Hooks Utilizados:**
- `useCurrentUser()` - Usuário autenticado
- `useQuery()` - Fetch de dados
- `useMutation()` - Mutações (saves)
- `useQueryClient()` - Cache management
- `useRef()` - Referência para inputs de arquivo

**Dependências Externas:**
- TanStack Query (React Query)
- Supabase
- menuThemeService

**Padrões Usados:**
- Compound Components (múltiplas seções)
- Form state management
- File upload handling
- Mutation with side effects

---

### 2.5 **QRCodeGenerator**
**Arquivo:** `QRCodeGenerator.tsx`

**Descrição:**  
Componente para gerar, visualizar e compartilhar QR Code do cardápio digital. Usa biblioteca qrcode.js para geração.

**Funcionalidades:**
- ✅ Geração automática de QR Code ao montar
- ✅ Resolução de slug/ID do restaurante
- ✅ Download de QR Code em PNG (300x300px)
- ✅ Compartilhamento nativo (Web Share API com fallback)
- ✅ Cópia de link para clipboard
- ✅ Exibição visual do QR Code
- ✅ Instruções de uso integradas
- ✅ Loading states

**QR Code Config:**
```typescript
{
  width: 300,
  margin: 2,
  color: {
    dark: '#1f2937',    // cor escura (navy)
    light: '#ffffff'    // cor clara (branco)
  }
}
```

**Tratamento de Erros:**
- Validação: `!user?.restaurant_id`
- Fallback: ID do restaurante se slug indisponível
- Try-catch em geração de QR Code

**Dependências:**
- `qrcode` (biblioteca externa)
- `sonner` toast
- Supabase

**Padrões Usados:**
- useEffect para efeitos colaterais
- State management (loading, urls)
- Clipboard API
- Fallback para share API

---

### 2.6 **QRCodeInstructions**
**Arquivo:** `QRCodeInstructions.tsx`

**Descrição:**  
Componente informativo/educacional que apresenta benefícios e instruções passo-a-passo para implementação do cardápio digital.

**Seções:**

#### 6.1 **Benefícios (4 items)**
- ✅ Zero Contato
- ✅ Atualização Instantânea
- ✅ Aumento nas Vendas (até 30%)
- ✅ Mobile First

#### 6.2 **Como Implementar (4 passos)**
1. Imprima o QR Code
2. Cole nas Mesas
3. Clientes Escaneiam
4. Cardápio Abre

#### 6.3 **Dicas Importantes** (3 dicas)
- Posição bem iluminada e visível
- Mensagem "Escaneie para ver o cardápio"
- Manter fotos atualizadas dos pratos

**Elementos Visuais:**
- Ícones coloridos (`lucide-react`)
- Grid responsivo
- Badges para dicas
- Cards para organização

**Padrões Usados:**
- Presentational Component (sem lógica)
- Hard-coded data structures
- Composição com UI components

---

## 3️⃣ Hooks Personalizados Utilizados

### 3.1 **useMenuThemes**
**Arquivo:** `src/hooks/useMenuThemes.ts`

**Descrição:** Hook para carregar todos os temas disponíveis

**Retorno:**
```typescript
{
  themes: MenuTheme[];
  loadingThemes: boolean;
  themesError: Error | null;
}
```

**Funcionalidades:**
- ✅ Query com retry automático (2 tentativas)
- ✅ Cache automático do TanStack Query
- ✅ Tratamento de erros
- ✅ Loading state
- ✅ Ordenação: temas ativos primeiro, "delivery" primeiro

---

### 3.2 **useRestaurantMenuConfig**
**Arquivo:** `src/hooks/useMenuThemes.ts`

**Descrição:** Hook completo para gerenciar configuração do menu do restaurante

**Retorno:**
```typescript
{
  config: RestaurantMenuConfig | null;
  loadingConfig: boolean;
  configError: Error | null;
  updateConfig: (params) => void;  // Mutate function
  isUpdating: boolean;
}
```

**Funcionalidades:**
- ✅ Fetch de configuração por restaurantId
- ✅ Validação de restaurantId
- ✅ Mutation para atualizar tema
- ✅ Cache invalidation após sucesso
- ✅ Toast notifications (sucesso/erro)
- ✅ Retry automático

**Parâmetros de Update:**
```typescript
{
  themeId: string;
  customColors?: Record<string, string>;
  customSettings?: Record<string, any>;
}
```

---

### 3.3 **useCurrentUser**
**Arquivo:** `src/hooks/useCurrentUser.ts` (externo ao módulo)

**Uso:** Obter usuário autenticado e restaurant_id

**Retorno:**
```typescript
{
  user: {
    restaurant_id: string;
    // ... outros campos
  };
  loading: boolean;
}
```

---

## 4️⃣ Serviços e Integrações

### 4.1 **menuThemeService**
**Arquivo:** `src/services/menuThemeService.ts`

**Métodos:**

#### `getAvailableThemes(): Promise<MenuTheme[]>`
- Busca todos os temas da tabela `menu_themes`
- Ordena por ativo/inativo e nome
- Retorna com preview images

#### `getRestaurantMenuConfig(restaurantId): Promise<RestaurantMenuConfig | null>`
- Busca configuração ativa do restaurante
- Normaliza custom_colors e custom_settings
- Retorna null se não encontrar

#### `getPublicMenuData(slug): Promise<MenuData>`
- Função completa que prepara dados para exibição pública
- Aceita slug ou UUID
- Retorna: restaurante, categorias, produtos, config de tema, delivery config
- Filtra apenas produtos disponíveis
- Busca todas as categorias com produtos aninhados

#### `getDeliveryConfig(restaurantId): Promise<DeliveryConfig>`
- Busca configuração de delivery da tabela `restaurant_settings`
- Fallback para DEFAULT_DELIVERY_CONFIG
- Nunca lança erro (retorna default)

#### `saveDeliveryConfig(restaurantId, config): Promise<DeliveryConfig>`
- Faz upsert da configuração de delivery
- Atualiza na tabela `restaurant_settings`

#### `updateRestaurantInfo(restaurantId, updates): Promise<Restaurant>`
- Atualiza dados do restaurante (banner, logo, nome, etc.)
- Faz update na tabela `restaurants`

#### `uploadRestaurantAsset(restaurantId, file, kind): Promise<string>`
- Faz upload de imagem (banner ou logo)
- Armazena em `restaurant-assets` bucket do Supabase
- Retorna URL pública

#### `updateRestaurantTheme(restaurantId, themeId, customColors, customSettings): Promise<RestaurantMenuConfig>`
- Atualiza ou cria configuração de tema
- Verifica se config existe e faz update ou insert
- Trata normalizações de tipos

---

### 4.2 **Integração Supabase**

**Tabelas Utilizadas:**

| Tabela | Operações | Campos Principais |
|--------|-----------|-------------------|
| `menu_themes` | SELECT | id, name, display_name, description, preview_image_url, is_active |
| `restaurant_menu_config` | SELECT, INSERT, UPDATE | id, restaurant_id, theme_id, custom_colors, custom_settings, is_active |
| `restaurants` | SELECT, UPDATE | id, name, slug, logo_url, banner_url, address, phone, phone_whatsapp, business_hours, category |
| `restaurant_settings` | SELECT, UPSERT | restaurant_id, setting_key, setting_value |
| `categories` | SELECT | id, name, restaurant_id |
| `products` | SELECT | id, name, description, price, image_url, available, category_id |

**Buckets de Storage:**
- `restaurant-assets` - Armazena logos e banners dos restaurantes

---

## 5️⃣ Tipos e Interfaces

### 5.1 **MenuTheme**
```typescript
interface MenuTheme {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  preview_image_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
```

### 5.2 **RestaurantMenuConfig**
```typescript
interface RestaurantMenuConfig {
  id: string;
  restaurant_id: string;
  theme_id: string;
  custom_colors: Record<string, string>;       // { primary: '#...', secondary: '#...', ... }
  custom_settings: Record<string, any>;        // Extensível para futuras configurações
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
```

### 5.3 **ThemeConfig**
```typescript
interface ThemeConfig {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
    accent: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
  spacing: {
    container: string;
    section: string;
    card: string;
  };
  borderRadius: string;
  shadows: {
    card: string;
    header: string;
  };
}
```

### 5.4 **MenuData** (Retorno de getPublicMenuData)
```typescript
interface MenuData {
  restaurant: {
    id: string;
    name: string;
    logo_url?: string;
    banner_url?: string;
    slug: string;
    address?: string;
    phone?: string;
    phone_whatsapp?: string;
    business_hours?: string;
    category?: string;
  };
  categories: Array<{
    id: string;
    name: string;
    products: Array<{
      id: string;
      name: string;
      description?: string;
      price: number;
      image_url?: string;
      available: boolean;
      category_id?: string;
    }>;
  }>;
  theme: ThemeConfig;
  deliveryConfig?: DeliveryConfig;
  context?: {
    fulfillmentType?: 'delivery' | 'pickup' | 'table' | 'counter';
    tableId?: string;
  };
}
```

### 5.5 **DeliveryConfig**
```typescript
interface DeliveryConfig {
  delivery_enabled: boolean;
  delivery_fee: number;
  min_order_value: number;
  estimated_delivery_minutes: number;
  delivery_radius_km: number;
  payment_methods: string[];  // 'pix' | 'dinheiro' | 'cartao_credito' | 'cartao_debito'
  pickup_enabled: boolean;
}

// Constante de valor padrão
const DEFAULT_DELIVERY_CONFIG: DeliveryConfig = {
  delivery_enabled: true,
  delivery_fee: 0,
  min_order_value: 0,
  estimated_delivery_minutes: 45,
  delivery_radius_km: 5,
  payment_methods: ['pix', 'dinheiro', 'cartao_credito', 'cartao_debito'],
  pickup_enabled: true,
};
```

---

## 6️⃣ Funcionalidades Principais

### 🎨 **Customização de Aparência**
- Seleção de temas pré-definidos
- Personalização de 5 cores principais
- Suporte a cores hexadecimais
- Validação em tempo real

### 📸 **Gerenciamento de Identidade Visual**
- Upload de banner (proporção 3:1)
- Upload de logo (quadrado)
- Validação de tipo de arquivo
- Limite de tamanho (5MB)
- Visualização inline
- Remoção rápida

### 📋 **Informações do Estabelecimento**
- Nome do restaurante
- Endereço
- Telefone e WhatsApp
- Categoria
- Horário de funcionamento

### 🚚 **Configurações de Entrega**
- Toggle: Delivery e Retirada
- Taxa de entrega configurável
- Pedido mínimo
- Tempo estimado de entrega
- Raio de entrega
- Múltiplas formas de pagamento

### 🔗 **QR Code Digital**
- Geração automática
- Download em PNG
- Compartilhamento (Web Share API)
- Cópia de link para clipboard
- Preview em nova aba

### 📚 **Educação do Usuário**
- Guia de implementação
- Benefícios destacados
- Instruções passo-a-passo
- Dicas de posicionamento

### 👁️ **Preview em Tempo Real**
- Visualizar cardápio renderizado
- Teste de tema selecionado
- Cache-busting automático

---

## 7️⃣ Dependências

### Dependências Externas

| Biblioteca | Uso | Versão |
|-----------|-----|--------|
| `react` | Framework UI | ^18.x |
| `typescript` | Type safety | ^5.x |
| `@tanstack/react-query` | State management & caching | ^5.x |
| `qrcode` | Geração de QR Code | latest |
| `sonner` | Toast notifications | latest |
| `lucide-react` | Ícones | latest |
| `@radix-ui/*` | UI components (Card, Input, etc) | latest |
| `tailwindcss` | Styling | latest |

### Dependências Internas

```
Menu Digital Module
├── Hooks
│   ├── useMenuThemes
│   ├── useRestaurantMenuConfig
│   ├── useCurrentUser
│   └── useImageUpload (potencial)
├── Services
│   └── menuThemeService
├── Types
│   └── menuTheme.ts
├── UI Components
│   ├── Card, CardContent, CardHeader, CardTitle
│   ├── Button
│   ├── Input, Textarea
│   ├── Label
│   ├── Badge
│   ├── Switch
│   ├── Checkbox
│   ├── Alert, AlertDescription
│   └── use-toast
└── Integrations
    └── Supabase
        ├── supabase.from() queries
        └── supabase.storage (uploads)
```

### Dependências de Banco de Dados
- Tabelas: menu_themes, restaurant_menu_config, restaurants, restaurant_settings, categories, products
- Buckets: restaurant-assets

---

## 8️⃣ Padrões de Código Utilizados

### 8.1 **Padrão de Componentes**

#### **Presentational Components**
- `QRCodeInstructions` - Componente puro, sem lógica
- `ColorCustomizer` - Focado em UI, lógica simples

#### **Container Components (Smart Components)**
- `MenuThemeSelector` - Orquestra múltiplas queries e mutations
- `PersonalizacaoTab` - Componente complexo com múltiplos formulários
- `MenuPreview` - Busca dados e renderiza condicional
- `QRCodeGenerator` - Efeitos colaterais e lógica de negócio

### 8.2 **Padrão React Query (TanStack Query)**

```typescript
// Read Pattern
const { data, isLoading, error } = useQuery({
  queryKey: ['menu-themes'],
  queryFn: async () => menuThemeService.getAvailableThemes(),
  retry: 2,
  retryDelay: 1000
});

// Write Pattern
const mutation = useMutation({
  mutationFn: async (data) => service.update(data),
  onSuccess: (data) => {
    queryClient.invalidateQueries({ queryKey: ['...'] });
    toast({ title: 'Sucesso' });
  },
  onError: (error) => {
    toast({ variant: 'destructive', title: 'Erro' });
  }
});
```

### 8.3 **Padrão de Validação**

```typescript
// Validação com regex
const invalid = Object.values(colors).find(
  value => !/^#[0-9A-Fa-f]{6}$/.test(value)
);

// Validação de tipo de arquivo
if (!file.type.startsWith('image/')) {
  toast({ variant: 'destructive', title: 'Arquivo inválido' });
}

// Validação de tamanho
if (file.size > 5 * 1024 * 1024) {
  toast({ variant: 'destructive', title: 'Arquivo muito grande' });
}
```

### 8.4 **Padrão de Efeitos Colaterais**

```typescript
useEffect(() => {
  if (user?.restaurant_id) {
    // Buscar dados quando dependência muda
    supabase
      .from('restaurants')
      .select('slug')
      .eq('id', user.restaurant_id)
      .then(({ data }) => {
        // Atualizar estado
        setPublicSlug(data?.slug || user.restaurant_id);
      });
  }
}, [user?.restaurant_id]);  // Array de dependências específico
```

### 8.5 **Padrão de Estados Condicionais**

```typescript
// Loading
if (userLoading || loadingThemes || loadingConfig) {
  return <LoadingSpinner />;
}

// Error
if (themesError) {
  return <Alert variant="destructive">{error}</Alert>;
}

// Validação
if (!user?.restaurant_id) {
  return <Alert variant="destructive">Não encontrado</Alert>;
}

// Empty state
if (!themes || themes.length === 0) {
  return <Alert>Nenhum tema disponível</Alert>;
}

// Success render
return <div>Conteúdo</div>;
```

### 8.6 **Padrão de Upload com Ref**

```typescript
const fileInputRef = useRef<HTMLInputElement>(null);

// Trigger
<Button onClick={() => fileInputRef.current?.click()}>
  Upload
</Button>

// Hidden input
<input
  ref={fileInputRef}
  type="file"
  className="hidden"
  onChange={(e) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }}
/>
```

### 8.7 **Padrão de Prevenção de Race Condition**

```typescript
const handleThemeSelect = async (themeId: string) => {
  if (isUpdating) {
    return; // Evita múltiplas submissões simultâneas
  }
  
  try {
    updateConfig({ themeId, ... });
  } catch (error) {
    // Handle error
  }
};
```

### 8.8 **Padrão de Cache-Busting**

```typescript
// Para módulos dinâmicos
const cacheBust = Date.now();
const previewUrl = `/cardapio/${slug}?preview=${cacheBust}`;
window.open(previewUrl, '_blank');
```

### 8.9 **Padrão de State Management Distribuído**

```typescript
// Local state para formulários
const [info, setInfo] = useState<RestaurantInfoForm>(initialValue);

// Server state com React Query
const { data: restaurant } = useQuery({...});

// Sincronização
useEffect(() => {
  if (restaurant) {
    setInfo({ ...restaurant });
  }
}, [restaurant]);

// Atualização
const mutation = useMutation({
  mutationFn: () => service.update(info),
  onSuccess: () => {
    queryClient.invalidateQueries();
  }
});
```

### 8.10 **Padrão de Composição**

```typescript
// MenuThemeSelector compõe ColorCustomizer
<MenuThemeSelector>
  <ColorCustomizer 
    config={config}
    onUpdateColors={updateColors}
  />
</MenuThemeSelector>
```

---

## 9️⃣ Fluxos de Dados

### Fluxo 1: **Seleção e Personalização de Tema**

```
User selects theme
    ↓
MenuThemeSelector.handleThemeSelect()
    ↓
useRestaurantMenuConfig.updateConfig()
    ↓
menuThemeService.updateRestaurantTheme()
    ↓
Supabase: INSERT/UPDATE restaurant_menu_config
    ↓
queryClient.invalidateQueries()
    ↓
Toast: "Tema atualizado com sucesso"
    ↓
Component refetch → Render with new theme
```

### Fluxo 2: **Upload de Banner/Logo**

```
User clicks upload button
    ↓
fileInputRef.current?.click()
    ↓
File selected
    ↓
handleUpload(file)
    ↓
Validação: tipo, tamanho
    ↓
menuThemeService.uploadRestaurantAsset()
    ↓
Supabase Storage: restaurant-assets upload
    ↓
Get public URL
    ↓
Update local state: info.banner_url
    ↓
Display preview
    ↓
User clicks Save
    ↓
menuThemeService.updateRestaurantInfo()
    ↓
Supabase: UPDATE restaurants table
```

### Fluxo 3: **Geração de QR Code**

```
Component mounts
    ↓
useEffect triggered
    ↓
Fetch restaurant slug
    ↓
Generate menu URL
    ↓
QRCode.toDataURL(url)
    ↓
Set qrCodeUrl state
    ↓
Render QR Code image
    ↓
User clicks Download
    ↓
Create download link
    ↓
Trigger browser download
```

### Fluxo 4: **Salvar Configurações de Entrega**

```
User modifies delivery settings
    ↓
Update local state: delivery object
    ↓
User clicks "Salvar entrega"
    ↓
saveDeliveryMutation.mutate()
    ↓
menuThemeService.saveDeliveryConfig()
    ↓
Supabase: UPSERT restaurant_settings
    ↓
queryClient.invalidateQueries()
    ↓
Toast: "Configurações salvas"
```

---

## 🔟 Considerações de Performance

### ✅ **Otimizações Implementadas**

1. **React Query Caching**
   - Evita refetches desnecessários
   - Retry automático com backoff
   - Stale-while-revalidate pattern

2. **Lazy Loading**
   - Images carregam sob demanda
   - Previews em nova aba (não bloqueia)

3. **Memoization Implícita**
   - Components puros naturalmente memoizados
   - Evita re-renders desnecessários

4. **State Management Eficiente**
   - Separação clara: local state vs server state
   - Validação otimista (local) antes de submit

### ⚠️ **Áreas de Melhoria Potencial**

1. **Memoization Explícita**
   ```typescript
   const ColorCustomizer = memo(({ config, onUpdateColors }) => {...});
   const MenuThemeSelector = memo(() => {...});
   ```

2. **Batch Updates**
   - PersonalizacaoTab faz múltiplos saveInfoMutation e saveDeliveryMutation
   - Poderia batchar em um único request

3. **Debouncing**
   - ColorCustomizer poderia debounce onChange para evitar updates muito frequentes

4. **Code Splitting**
   - PersonalizacaoTab é arquivo grande (600+ linhas)
   - Poderia ser dividido em sub-componentes

---

## 1️⃣1️⃣ Segurança

### ✅ **Práticas Implementadas**

1. **Input Validation**
   - Validação de cores com regex
   - Validação de tipo de arquivo
   - Validação de tamanho de arquivo

2. **Type Safety**
   - TypeScript com tipos explícitos
   - Interfaces well-defined
   - Validação de restaurantId

3. **Error Handling**
   - Try-catch blocks
   - Error boundaries implícitas
   - Fallbacks seguros

4. **Access Control**
   - Validação de user?.restaurant_id
   - Service functions verificam restaurantId
   - Toast notifications em erros

### ⚠️ **Pontos de Atenção**

1. **Tamanho de Upload**
   - Limite 5MB client-side apenas
   - Deveria ter validação server-side

2. **URL Públicas**
   - Public URLs de storage deveriam ter versionamento
   - Considerar cache-control headers

3. **Validação Server-Side**
   - Cores hexadecimais validadas apenas client
   - Deveria validar também no backend

---

## 1️⃣2️⃣ Integração com Resto da Aplicação

### Componentes que Consomem Menu Digital

```
CardapioDigital (página)
├── MenuThemeSelector
├── PersonalizacaoTab
├── QRCodeGenerator
└── QRCodeInstructions
```

### Páginas Relacionadas

- **CardapioDigital.tsx** - Página principal (presumida)
- **/cardapio/:slug** - Página pública do menu (gerada dinamicamente)

### Hooks Compartilhados

- `useCurrentUser` - Autenticação
- `useMenuThemes` - Temas (reutilizável)
- `useRestaurantMenuConfig` - Config (reutilizável)

---

## 1️⃣3️⃣ Exemplo de Uso

### Integração Completa

```typescript
import { MenuThemeSelector } from '@/components/menu-digital/MenuThemeSelector';
import { QRCodeGenerator } from '@/components/menu-digital/QRCodeGenerator';
import { PersonalizacaoTab } from '@/components/menu-digital/PersonalizacaoTab';
import { QRCodeInstructions } from '@/components/menu-digital/QRCodeInstructions';
import { MenuPreview } from '@/components/menu-digital/MenuPreview';

export function CardapioDigitalPage() {
  const [activeTab, setActiveTab] = useState('themes');

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="themes">Temas</TabsTrigger>
          <TabsTrigger value="personalizacao">Personalização</TabsTrigger>
          <TabsTrigger value="qrcode">QR Code</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="themes">
          <MenuThemeSelector />
        </TabsContent>

        <TabsContent value="personalizacao">
          <PersonalizacaoTab />
        </TabsContent>

        <TabsContent value="qrcode">
          <div className="space-y-6">
            <QRCodeGenerator />
            <QRCodeInstructions />
          </div>
        </TabsContent>

        <TabsContent value="preview">
          <MenuPreview />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

---

## 1️⃣4️⃣ Roadmap e Melhorias Futuras

### 🔄 **Curto Prazo**
- [ ] Adicionar mais temas (claro, escuro, minimalista)
- [ ] Drag-and-drop para reordenar categorias
- [ ] Preview de cores em tempo real
- [ ] Histórico de alterações

### 📈 **Médio Prazo**
- [ ] Animated themes
- [ ] Font customization (tipografia)
- [ ] Layout customization (grid, list)
- [ ] Analytics de visualizações do cardápio

### 🚀 **Longo Prazo**
- [ ] Theme marketplace
- [ ] A/B testing de temas
- [ ] Mobile app para gerenciamento
- [ ] Export cardápio (PDF)
- [ ] Integração com redes sociais

---

## 1️⃣5️⃣ Conclusões e Recomendações

### 💪 **Pontos Fortes**

✅ **Arquitetura Limpa:** Separação clara entre componentes, hooks e serviços  
✅ **Type Safety:** TypeScript bem utilizado com interfaces explícitas  
✅ **State Management:** React Query bem implementado para cache e sync  
✅ **User Experience:** Loading states, error handling e feedback visual  
✅ **Extensibilidade:** Fácil adicionar novos temas ou configurações  
✅ **Performance:** Caching eficiente e lazy loading  

### 🎯 **Recomendações**

1. **Refatoração de PersonalizacaoTab**
   - Dividir em sub-componentes menores
   - Extrair lógica de uploads
   - Criar componentes para cada seção (RestaurantInfo, DeliverySettings, etc)

2. **Adicionar Testes**
   - Unit tests para componentes puros
   - Integration tests para fluxos de dados
   - E2E tests para QR Code

3. **Melhorar Documentação**
   - Adicionar stories de Storybook
   - Documentar tipos retornados por serviço
   - Adicionar exemplos de uso

4. **Monitoring**
   - Adicionar analytics para cliques em temas
   - Rastrear downloads de QR Code
   - Monitorar erros de upload

5. **Validação Server-Side**
   - Validar cores no backend
   - Limitar tamanho de uploads no servidor
   - Verificar autorização antes de update

---

**Análise Completa Realizada em:** 1 de maio de 2026  
**Versão do Documento:** 1.0  
**Status:** ✅ Concluído
