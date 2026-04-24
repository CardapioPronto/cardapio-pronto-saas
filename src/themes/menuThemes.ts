
import { ThemeConfig } from '@/types/menuTheme';

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

// Registro de temas - facilita adicionar novos temas
export const themeRegistry = {
  delivery: deliveryTheme,
  default: defaultTheme,
  modern: modernTheme,
  elegant: elegantTheme
} as const;

export type ThemeName = keyof typeof themeRegistry;

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
