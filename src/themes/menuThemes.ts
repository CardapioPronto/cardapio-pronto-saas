
import { ThemeConfig } from '@/types/menuTheme';

/* ============================================
   TEMAS GERAIS (Legacy/Default)
   ============================================ */

// Tema Delivery (novo - moderno, baseado em iFood/Rappi)
export const deliveryTheme: ThemeConfig = {
  colors: {
    primary: '#C8102E',     // vermelho vibrante (header)
    secondary: '#FFFFFF',
    background: '#F5F5F5',
    text: '#1F2937',
    accent: '#FEF2F2',
  },
  fonts: {
    heading: 'Inter, system-ui, sans-serif',
    body: 'Inter, system-ui, sans-serif',
  },
  spacing: {
    container: 'w-full',
    section: 'space-y-4',
    card: 'p-4',
  },
  borderRadius: 'rounded-xl',
  shadows: {
    card: 'shadow-sm hover:shadow-md transition-shadow',
    header: 'shadow-md',
  },
};

// Tema Padrão
export const defaultTheme: ThemeConfig = {
  colors: {
    primary: '#81B29A',
    secondary: '#E07A5F',
    background: '#FEFEFE',
    text: '#2C3E50',
    accent: '#F4F3EE'
  },
  fonts: {
    heading: 'Inter, sans-serif',
    body: 'Inter, sans-serif'
  },
  spacing: {
    container: 'max-w-lg mx-auto',
    section: 'space-y-6',
    card: 'p-4'
  },
  borderRadius: 'rounded-lg',
  shadows: {
    card: 'shadow-md',
    header: 'shadow-sm'
  }
};

// Tema Moderno
export const modernTheme: ThemeConfig = {
  colors: {
    primary: '#6366F1',
    secondary: '#EC4899',
    background: '#F8FAFC',
    text: '#1E293B',
    accent: '#F1F5F9'
  },
  fonts: {
    heading: 'Poppins, sans-serif',
    body: 'Inter, sans-serif'
  },
  spacing: {
    container: 'max-w-md mx-auto',
    section: 'space-y-8',
    card: 'p-6'
  },
  borderRadius: 'rounded-2xl',
  shadows: {
    card: 'shadow-lg shadow-indigo-500/10',
    header: 'shadow-xl shadow-indigo-500/5'
  }
};

// Tema Elegante
export const elegantTheme: ThemeConfig = {
  colors: {
    primary: '#1F2937',
    secondary: '#D97706',
    background: '#FFFEF9',
    text: '#374151',
    accent: '#F9FAFB'
  },
  fonts: {
    heading: 'Playfair Display, serif',
    body: 'Lora, serif'
  },
  spacing: {
    container: 'max-w-2xl mx-auto',
    section: 'space-y-10',
    card: 'p-8'
  },
  borderRadius: 'rounded-none',
  shadows: {
    card: 'shadow-2xl',
    header: 'shadow-lg'
  }
};

/* ============================================
   TEMAS SEGMENTADOS POR TIPO DE RESTAURANTE
   ============================================ */

// PIZZARIA - Cores quentes, apetitoso
export const pizzariaTheme: ThemeConfig = {
  colors: {
    primary: '#DC2626',     // Vermelho (pizza)
    secondary: '#F97316',   // Laranja (queijo)
    background: '#FEF3C7',  // Bege quente
    text: '#1F2937',
    accent: '#FED7AA'
  },
  fonts: {
    heading: 'Bebas Neue, cursive, sans-serif',
    body: 'Inter, sans-serif'
  },
  spacing: {
    container: 'max-w-4xl mx-auto',
    section: 'space-y-6',
    card: 'p-5'
  },
  borderRadius: 'rounded-2xl',
  shadows: {
    card: 'shadow-lg shadow-red-500/20',
    header: 'shadow-xl shadow-red-500/30'
  }
};

// HAMBURGUERIA - Cores contrastantes, modernas
export const hamburgueriaTheme: ThemeConfig = {
  colors: {
    primary: '#7C3AED',     // Roxo (sofisticado)
    secondary: '#EC4899',   // Rosa (destaque)
    background: '#F3F4F6',  // Cinza claro
    text: '#111827',
    accent: '#E0E7FF'
  },
  fonts: {
    heading: 'Fredoka One, sans-serif',
    body: 'Segoe UI, sans-serif'
  },
  spacing: {
    container: 'max-w-2xl mx-auto',
    section: 'space-y-6',
    card: 'p-6'
  },
  borderRadius: 'rounded-3xl',
  shadows: {
    card: 'shadow-md hover:shadow-lg transition-shadow',
    header: 'shadow-lg shadow-purple-500/20'
  }
};

// SUSHI - Cores elegantes, minimalistas
export const sushiTheme: ThemeConfig = {
  colors: {
    primary: '#0F766E',     // Verde água (fresco)
    secondary: '#EF4444',   // Vermelho (wasabi/gengibre)
    background: '#F0FDFA',  // Branco com toque de verde
    text: '#134E4A',
    accent: '#CCFBF1'
  },
  fonts: {
    heading: 'Yanone Kaffeesatz, sans-serif',
    body: 'Roboto, sans-serif'
  },
  spacing: {
    container: 'max-w-lg mx-auto',
    section: 'space-y-8',
    card: 'p-6'
  },
  borderRadius: 'rounded-xl',
  shadows: {
    card: 'shadow-sm',
    header: 'shadow-md shadow-teal-500/10'
  }
};

// CAFETERIA - Cores aconchegantes, quentes
export const cafeteriaTheme: ThemeConfig = {
  colors: {
    primary: '#92400E',     // Marrom café
    secondary: '#F59E0B',   // Âmbar (café com leite)
    background: '#FEF3C7',  // Bege quente
    text: '#3F2305',
    accent: '#FDEDD5'
  },
  fonts: {
    heading: 'Georgia, serif',
    body: 'Open Sans, sans-serif'
  },
  spacing: {
    container: 'max-w-md mx-auto',
    section: 'space-y-6',
    card: 'p-5'
  },
  borderRadius: 'rounded-lg',
  shadows: {
    card: 'shadow-md shadow-amber-900/10',
    header: 'shadow-lg shadow-amber-900/15'
  }
};

// SORVETERIA/AÇAÍ - Cores vibrantes e divertidas
export const sorvetariaTheme: ThemeConfig = {
  colors: {
    primary: '#EC4899',     // Rosa vibrante
    secondary: '#8B5CF6',   // Roxo (açaí)
    background: '#FFF0F9',  // Branco rosado
    text: '#831843',
    accent: '#FCE7F3'
  },
  fonts: {
    heading: 'Baloo 2, sans-serif',
    body: 'Poppins, sans-serif'
  },
  spacing: {
    container: 'max-w-lg mx-auto',
    section: 'space-y-5',
    card: 'p-5'
  },
  borderRadius: 'rounded-3xl',
  shadows: {
    card: 'shadow-lg shadow-pink-500/20',
    header: 'shadow-xl shadow-pink-500/25'
  }
};

// BISTRÔ - Cores sofisticadas, europeia
export const bistroTheme: ThemeConfig = {
  colors: {
    primary: '#1F2937',     // Cinza escuro elegante
    secondary: '#F59E0B',   // Ouro (toque de classe)
    background: '#FFFBEB',  // Branco com toque de creme
    text: '#374151',
    accent: '#F3F4F6'
  },
  fonts: {
    heading: 'Playfair Display, serif',
    body: 'Lora, serif'
  },
  spacing: {
    container: 'max-w-2xl mx-auto',
    section: 'space-y-10',
    card: 'p-8'
  },
  borderRadius: 'rounded-md',
  shadows: {
    card: 'shadow-xl',
    header: 'shadow-lg'
  }
};

// BAR/PUB - Cores escuras, aconchegantes
export const barTheme: ThemeConfig = {
  colors: {
    primary: '#1E1B4B',     // Azul marinho escuro
    secondary: '#FBBF24',   // Amarelo (cerveja/whisky)
    background: '#0F172A',  // Quase preto
    text: '#E2E8F0',
    accent: '#1E293B'
  },
  fonts: {
    heading: 'Oswald, sans-serif',
    body: 'Roboto, sans-serif'
  },
  spacing: {
    container: 'w-full',
    section: 'space-y-6',
    card: 'p-6'
  },
  borderRadius: 'rounded-lg',
  shadows: {
    card: 'shadow-2xl shadow-yellow-500/10',
    header: 'shadow-2xl shadow-yellow-500/20'
  }
};

/* ============================================
   TEMA "CONSULTA RÁPIDA" - Leve para Salão
   ============================================ */

export const consultaRapidaTheme: ThemeConfig = {
  colors: {
    primary: '#059669',     // Verde (ação)
    secondary: '#0891B2',   // Azul (complemento)
    background: '#F0F9FF',  // Branco azulado
    text: '#0F172A',
    accent: '#DBEAFE'
  },
  fonts: {
    heading: 'Inter, sans-serif',
    body: 'Inter, sans-serif'
  },
  spacing: {
    container: 'max-w-sm mx-auto',
    section: 'space-y-3',
    card: 'p-3'
  },
  borderRadius: 'rounded-lg',
  shadows: {
    card: 'shadow-sm',
    header: 'shadow-md'
  }
};

/* ============================================
   REGISTRO DE TEMAS E SEGMENTOS
   ============================================ */

// Tipos de segmento
export type RestaurantSegment = 
  | 'pizzaria' 
  | 'hamburgueria' 
  | 'sushi' 
  | 'cafeteria' 
  | 'sorveteria' 
  | 'bistro' 
  | 'bar'
  | 'outro';

export interface ThemeSegment {
  name: RestaurantSegment;
  label: string;
  icon: string;
  description: string;
}

// Mapeamento de segmentos
export const restaurantSegments: Record<RestaurantSegment, ThemeSegment> = {
  pizzaria: {
    name: 'pizzaria',
    label: 'Pizzaria',
    icon: '🍕',
    description: 'Temas calorosos para pizzarias'
  },
  hamburgueria: {
    name: 'hamburgueria',
    label: 'Hamburgueria',
    icon: '🍔',
    description: 'Temas modernos e contrastantes'
  },
  sushi: {
    name: 'sushi',
    label: 'Sushi',
    icon: '🍣',
    description: 'Temas elegantes e minimalistas'
  },
  cafeteria: {
    name: 'cafeteria',
    label: 'Cafeteria',
    icon: '☕',
    description: 'Temas aconchegantes e acolhedores'
  },
  sorveteria: {
    name: 'sorveteria',
    label: 'Sorveteria/Açaí',
    icon: '🍦',
    description: 'Temas vibrantes e divertidos'
  },
  bistro: {
    name: 'bistro',
    label: 'Bistrô',
    icon: '🍷',
    description: 'Temas sofisticados e europeus'
  },
  bar: {
    name: 'bar',
    label: 'Bar/Pub',
    icon: '🍺',
    description: 'Temas escuros e aconchegantes'
  },
  outro: {
    name: 'outro',
    label: 'Outro',
    icon: '🏪',
    description: 'Temas gerais'
  }
};

// Registro de temas - facilita adicionar novos temas
export const themeRegistry = {
  // Gerais
  delivery: deliveryTheme,
  default: defaultTheme,
  modern: modernTheme,
  elegant: elegantTheme,
  // Segmentados
  pizzaria: pizzariaTheme,
  hamburgueria: hamburgueriaTheme,
  sushi: sushiTheme,
  cafeteria: cafeteriaTheme,
  sorveteria: sorvetariaTheme,
  bistro: bistroTheme,
  bar: barTheme,
  consultaRapida: consultaRapidaTheme
} as const;

export type ThemeName = keyof typeof themeRegistry;

// Agrupar temas por segmento
export const themesBySegment: Record<RestaurantSegment, ThemeName[]> = {
  pizzaria: ['pizzaria', 'delivery'],
  hamburgueria: ['hamburgueria', 'modern'],
  sushi: ['sushi', 'elegant'],
  cafeteria: ['cafeteria', 'default'],
  sorveteria: ['sorvetaria', 'modern'],
  bistro: ['bistro', 'elegant'],
  bar: ['bar', 'delivery'],
  outro: ['delivery', 'default', 'modern', 'elegant', 'consultaRapida']
};

export function getThemeConfig(themeName: string, customColors?: Record<string, string>): ThemeConfig {
  const baseTheme = themeRegistry[themeName as ThemeName] || deliveryTheme;
  
  if (!customColors || Object.keys(customColors).length === 0) {
    return baseTheme;
  }

  // Mesclar cores customizadas
  return {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      ...customColors
    }
  };
}

/**
 * Obter temas recomendados para um segmento de restaurante
 */
export function getThemesForSegment(segment: RestaurantSegment): { name: ThemeName; theme: ThemeConfig }[] {
  const themeNames = themesBySegment[segment] || themesBySegment.outro;
  return themeNames.map(name => ({
    name,
    theme: themeRegistry[name]
  }));
}
