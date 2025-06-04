
import { ReactNode } from 'react';
import { ThemeConfig } from '@/types/menuTheme';

interface PublicMenuBaseProps {
  theme: ThemeConfig;
  children: ReactNode;
}

export const PublicMenuBase = ({ theme, children }: PublicMenuBaseProps) => {
  return (
    <div 
      className="min-h-screen"
      style={{ 
        backgroundColor: theme.colors.background,
        color: theme.colors.text,
        fontFamily: theme.fonts.body
      }}
    >
      <style>{`
        .theme-primary { color: ${theme.colors.primary}; }
        .theme-secondary { color: ${theme.colors.secondary}; }
        .theme-accent { background-color: ${theme.colors.accent}; }
        .theme-heading { font-family: ${theme.fonts.heading}; }
        .theme-body { font-family: ${theme.fonts.body}; }
        .theme-card { ${theme.shadows.card}; }
        .theme-header { ${theme.shadows.header}; }
      `}</style>
      
      <div className={theme.spacing.container}>
        {children}
      </div>
    </div>
  );
};
