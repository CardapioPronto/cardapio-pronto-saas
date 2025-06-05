
import React from 'react';
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { MenuThemeSelector } from "@/components/menu-digital/MenuThemeSelector";
import { MenuPreview } from "@/components/menu-digital/MenuPreview";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const MenuDigital = () => {
  return (
    <DashboardLayout title="Cardápio Digital">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Configuração do Cardápio Digital</CardTitle>
            <CardDescription>
              Configure o tema e visualize como seu cardápio aparecerá para os clientes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="themes" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="themes">Temas</TabsTrigger>
                <TabsTrigger value="preview">Visualizar</TabsTrigger>
              </TabsList>
              
              <TabsContent value="themes" className="space-y-4">
                <MenuThemeSelector />
              </TabsContent>
              
              <TabsContent value="preview" className="space-y-4">
                <MenuPreview />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default MenuDigital;
