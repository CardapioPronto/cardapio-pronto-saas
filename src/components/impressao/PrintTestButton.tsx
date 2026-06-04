import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { PrintPaperSize, PrintTemplate, usePrint } from "@/hooks/usePrint";
import { Pedido } from "@/features/pdv/types";

interface PrintTestButtonProps {
  disabled?: boolean;
  paperSize?: PrintPaperSize;
  templates?: PrintTemplate[];
}

export const PrintTestButton = ({
  disabled = false,
  paperSize = "80mm",
  templates = ["kitchen"],
}: PrintTestButtonProps) => {
  const { printOrder, printing } = usePrint();

  const handleTestPrint = async () => {
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
      payment_method: "dinheiro",
      payment_status: "pending",
    };

    const selectedTemplates = templates.length > 0 ? templates : ["kitchen"];

    for (const template of selectedTemplates) {
      await printOrder(testOrder, {
        restaurantName: 'Restaurante Demo',
        paperSize,
        template,
      });
    }
  };

  return (
    <Button 
      onClick={handleTestPrint}
      variant="outline"
      disabled={printing || disabled}
    >
      <Printer className="h-4 w-4 mr-2" />
      {printing ? 'Imprimindo...' : 'Testar Impressão'}
    </Button>
  );
};
