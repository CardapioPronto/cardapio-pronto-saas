
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bot } from "lucide-react";

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
                <div className="w-12 h-12 bg-green-500 rounded flex items-center justify-center text-white">
                  <Bot className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-medium">WhatsApp AI</h3>
                  <p className="text-sm text-muted-foreground">
                    Atendente virtual com IA via Evolution API
                  </p>
                </div>
              </div>
              <Button onClick={() => window.location.href = "/whatsapp-ai"}>Configurar</Button>
            </div>
          </div>

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
    </div>
  );
};