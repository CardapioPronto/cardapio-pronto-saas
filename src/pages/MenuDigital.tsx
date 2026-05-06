
import React, { useState } from 'react';
import DashboardLayout from "@/components/dashboard/DashboardLayout";
// cache-bust: refresh dynamic import after dev server restart
import { MenuThemeSelector } from "@/components/menu-digital/MenuThemeSelector";
import { MenuPreview } from "@/components/menu-digital/MenuPreview";
import { QRCodeGenerator } from "@/components/menu-digital/QRCodeGenerator";
import { QRCodeInstructions } from "@/components/menu-digital/QRCodeInstructions";
import { PersonalizacaoTab } from "@/components/menu-digital/PersonalizacaoTab";
import { CouponsManager } from "@/components/menu-digital/CouponsManager";
import { PerformanceDashboard } from "@/components/menu-digital/PerformanceDashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const MenuDigital = () => {
  const [activeTab, setActiveTab] = useState("themes");

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
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="themes">Temas</TabsTrigger>
                <TabsTrigger value="personalizacao">Personalização</TabsTrigger>
                <TabsTrigger value="cupons">Cupons</TabsTrigger>
                <TabsTrigger value="performance">Performance</TabsTrigger>
                <TabsTrigger value="preview">Visualizar</TabsTrigger>
                <TabsTrigger value="qrcode">QR Code</TabsTrigger>
              </TabsList>
              
              <TabsContent value="themes" className="space-y-4">
                {activeTab === "themes" && <MenuThemeSelector />}
              </TabsContent>

              <TabsContent value="personalizacao" className="space-y-4">
                {activeTab === "personalizacao" && <PersonalizacaoTab />}
              </TabsContent>

              <TabsContent value="cupons" className="space-y-4">
                {activeTab === "cupons" && <CouponsManager />}
              </TabsContent>

              <TabsContent value="performance" className="space-y-4">
                {activeTab === "performance" && <PerformanceDashboard />}
              </TabsContent>
              
              <TabsContent value="preview" className="space-y-4">
                {activeTab === "preview" && <MenuPreview />}
              </TabsContent>

              <TabsContent value="qrcode" className="space-y-4">
                {activeTab === "qrcode" && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <QRCodeGenerator />
                    <QRCodeInstructions />
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default MenuDigital;
