
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WhatsAppConfigTab } from "@/components/whatsapp/WhatsAppConfigTab";
import { WhatsAppMessages } from "@/components/whatsapp/WhatsAppMessages";

export const IntegracoesTab: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Integrações Disponíveis */}
      <Card>
        <CardHeader>
          <CardTitle>Integrações Disponíveis</CardTitle>
          <CardDescription>
            Conecte o sistema com outras plataformas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[#6B3DE3] rounded flex items-center justify-center text-white font-bold">
                  P
                </div>
                <div>
                  <h3 className="font-medium">Pagar.me</h3>
                  <p className="text-sm text-muted-foreground">
                    Integração para pagamentos online
                  </p>
                </div>
              </div>
              <Button onClick={() => window.location.href = "/pagarme-config"}>Configurar</Button>
            </div>
          </div>
          
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[#24B47E] rounded flex items-center justify-center text-white font-bold">
                  I
                </div>
                <div>
                  <h3 className="font-medium">iFood</h3>
                  <p className="text-sm text-muted-foreground">
                    Receba pedidos do iFood diretamente no sistema
                  </p>
                </div>
              </div>
              <Button variant="outline" onClick={() => window.location.href = "/ifood-integracao"}>Configurar</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* WhatsApp Integration */}
      <Tabs defaultValue="config" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="config">Configuração WhatsApp</TabsTrigger>
          <TabsTrigger value="messages">Mensagens</TabsTrigger>
        </TabsList>
        
        <TabsContent value="config" className="mt-4">
          <WhatsAppConfigTab />
        </TabsContent>
        
        <TabsContent value="messages" className="mt-4">
          <WhatsAppMessages />
        </TabsContent>
      </Tabs>
    </div>
  );
};
