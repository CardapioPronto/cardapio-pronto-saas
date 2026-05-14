import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Link } from "react-router-dom";
import { ShoppingBag, Settings } from "lucide-react";
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
        <EmptyState
          icon={ShoppingBag}
          title="Recepção centralizada no histórico"
          description="Pedidos importados do iFood aparecem no histórico com a etiqueta iFood. A consulta manual e a configuração ficam na tela de integração."
          compact
          action={
            canManageOrders ? (
              <Button asChild variant="outline" size="sm">
                <Link to="/ifood-integracao">
                  <Settings className="mr-2 h-4 w-4" />
                  Configurar integração
                </Link>
              </Button>
            ) : null
          }
        />
      </CardContent>
    </Card>
  );
}
