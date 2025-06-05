
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RestaurantMenuConfig } from '@/types/menuTheme';
import { Palette } from 'lucide-react';

interface ColorCustomizerProps {
  config: RestaurantMenuConfig;
  onUpdateColors: (colors: Record<string, string>) => void;
}

export const ColorCustomizer = ({ config, onUpdateColors }: ColorCustomizerProps) => {
  const [colors, setColors] = useState(config.custom_colors || {});
  
  const colorOptions = [
    { key: 'primary', label: 'Cor Primária', defaultValue: '#81B29A' },
    { key: 'secondary', label: 'Cor Secundária', defaultValue: '#E07A5F' },
    { key: 'background', label: 'Fundo', defaultValue: '#FEFEFE' },
    { key: 'text', label: 'Texto', defaultValue: '#2C3E50' },
    { key: 'accent', label: 'Destaque', defaultValue: '#F4F3EE' }
  ];

  const handleColorChange = (key: string, value: string) => {
    const newColors = { ...colors, [key]: value };
    setColors(newColors);
  };

  const handleSave = () => {
    onUpdateColors(colors);
  };

  const handleReset = () => {
    setColors({});
    onUpdateColors({});
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Personalizar Cores
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          {colorOptions.map((option) => (
            <div key={option.key} className="space-y-2">
              <Label htmlFor={option.key}>{option.label}</Label>
              <div className="flex gap-2">
                <Input
                  id={option.key}
                  type="color"
                  value={colors[option.key] || option.defaultValue}
                  onChange={(e) => handleColorChange(option.key, e.target.value)}
                  className="w-16 h-10 p-1"
                />
                <Input
                  type="text"
                  value={colors[option.key] || option.defaultValue}
                  onChange={(e) => handleColorChange(option.key, e.target.value)}
                  placeholder={option.defaultValue}
                  className="flex-1"
                />
              </div>
            </div>
          ))}
        </div>
        
        <div className="flex gap-2 pt-4">
          <Button onClick={handleSave} className="flex-1">
            Salvar Cores
          </Button>
          <Button onClick={handleReset} variant="outline">
            Resetar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
