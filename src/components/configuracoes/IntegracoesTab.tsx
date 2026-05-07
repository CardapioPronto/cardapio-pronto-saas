
import React from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bot, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface IntegracoesTabProps {
  canManage: boolean;
}

export const IntegracoesTab: React.FC<IntegracoesTabProps> = ({ canManage }) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Integrações Disponíveis */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Integrações Disponíveis</CardTitle>
            {!canManage && <Badge variant="outline">Somente leitura</Badge>}
          </div>
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
                  <h3 className="font-medium">WhatsApp</h3>
                  <p className="text-sm text-muted-foreground">
                    Atendente virtual com IA via Evolution API
                  </p>
                </div>
              </div>
              <Button disabled={!canManage} onClick={() => navigate("/atendimento")}>Configurar</Button>
            </div>
          </div>

          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[#6B3DE3] rounded flex items-center justify-center text-white font-bold">
                  P
                </div>
                <div>
                  <h3 className="font-medium">Recebimentos Online</h3>
                  <p className="text-sm text-muted-foreground">
                    Configure PIX online para pedidos do cardápio
                  </p>
                </div>
              </div>
              <Button disabled={!canManage} onClick={() => navigate("/pagarme-config")}>Configurar</Button>
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
              <Button disabled={!canManage} variant="outline" onClick={() => navigate("/ifood-integracao")}>Configurar</Button>
            </div>
          </div>

          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-slate-900 rounded flex items-center justify-center text-white">
                  <Mail className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-medium">Email Resend</h3>
                  <p className="text-sm text-muted-foreground">
                    Envie emails pelo domínio e chave Resend do restaurante
                  </p>
                </div>
              </div>
              <Button disabled={!canManage} variant="outline" onClick={() => navigate("/email-integracao")}>Configurar</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
