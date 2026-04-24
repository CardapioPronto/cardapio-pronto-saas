
import { MenuData } from '@/types/menuTheme';
import { DefaultTheme } from './themes/DefaultTheme';
import { ModernTheme } from './themes/ModernTheme';
import { ElegantTheme } from './themes/ElegantTheme';
import { DeliveryTheme } from './themes/DeliveryTheme';

interface PublicMenuRendererProps {
  data: MenuData;
  themeName: string;
}

export const PublicMenuRenderer = ({ data, themeName }: PublicMenuRendererProps) => {
  switch (themeName) {
    case 'delivery':
      return <DeliveryTheme data={data} />;
    case 'modern':
      return <ModernTheme data={data} />;
    case 'elegant':
      return <ElegantTheme data={data} />;
    default:
      return <DeliveryTheme data={data} />;
  }
};
