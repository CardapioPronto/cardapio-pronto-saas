import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { AlertCircle, Settings } from "lucide-react";
import { IfoodOrderBadge } from "./IfoodOrderBadge";

interface IfoodOrdersListProps {
  canManageOrders: boolean;
}

export function IfoodOrdersList({ canManageOrders }: IfoodOrdersListProps) {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Pedidos iFood
          <IfoodOrderBadge />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Alert className="border-orange/30 bg-orange/5">
          <AlertCircle className="h-4 w-4 text-orange" />
          <AlertTitle>Recepção centralizada no histórico</AlertTitle>
          <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Pedidos importados do iFood aparecem no histórico com a etiqueta iFood. A consulta manual e a configuração ficam na tela de integração.
            </span>
            {canManageOrders && (
              <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
                <Link to="/ifood-integracao">
                  <Settings className="mr-2 h-4 w-4" />
                  Configurar
                </Link>
              </Button>
            )}
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
