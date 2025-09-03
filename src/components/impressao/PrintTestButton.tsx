import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { usePrint } from "@/hooks/usePrint";
import { Pedido } from "@/features/pdv/types";

export const PrintTestButton = () => {
  const { printOrder, printing } = usePrint();

  const handleTestPrint = () => {
    // Criar pedido de teste
    const testOrder: Pedido = {
      id: 'test',
      mesa: 'Mesa 1',
      cliente: 'Cliente de Teste',
      itensPedido: [
        {
          produto: {
            id: '1',
            name: 'Hambúrguer Clássico',
            price: 25.90,
            description: 'Pão brioche, carne 180g, queijo cheddar, alface, tomate'
          },
          quantidade: 2,
          observacao: 'Sem cebola, ponto da carne mal passado'
        },
        {
          produto: {
            id: '2',
            name: 'Batata Frita',
            price: 12.00,
          },
          quantidade: 1,
        }
      ],
      status: 'pendente',
      timestamp: new Date(),
      total: 63.80,
    };

    printOrder(testOrder, { restaurantName: 'Restaurante Demo' });
  };

  return (
    <Button 
      onClick={handleTestPrint}
      variant="outline"
      disabled={printing}
    >
      <Printer className="h-4 w-4 mr-2" />
      {printing ? 'Imprimindo...' : 'Testar Impressão'}
    </Button>
  );
};