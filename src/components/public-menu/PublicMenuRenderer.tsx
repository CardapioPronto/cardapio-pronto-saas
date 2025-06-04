
import { MenuData } from '@/types/menuTheme';
import { DefaultTheme } from './themes/DefaultTheme';
import { ModernTheme } from './themes/ModernTheme';
import { ElegantTheme } from './themes/ElegantTheme';

interface PublicMenuRendererProps {
  data: MenuData;
  themeName: string;
}

export const PublicMenuRenderer = ({ data, themeName }: PublicMenuRendererProps) => {
  switch (themeName) {
    case 'modern':
      return <ModernTheme data={data} />;
    case 'elegant':
      return <ElegantTheme data={data} />;
    default:
      return <DefaultTheme data={data} />;
  }
};
