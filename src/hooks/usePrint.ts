import { useState } from 'react';
import { Pedido } from '@/features/pdv/types';
import { useToast } from '@/hooks/use-toast';

interface PrintConfig {
  restaurantName: string;
  autoPrint?: boolean;
}

export const usePrint = () => {
  const [printing, setPrinting] = useState(false);
  const { toast } = useToast();

  const printOrder = async (pedido: Pedido, config: PrintConfig) => {
    if (printing) return;

    setPrinting(true);

    try {
      // Criar uma nova janela para impressão
      const printWindow = window.open('', '_blank');
      
      if (!printWindow) {
        throw new Error('Não foi possível abrir a janela de impressão. Verifique se o bloqueador de pop-ups está desabilitado.');
      }

      // Gerar o conteúdo HTML para impressão
      const printContent = generatePrintHTML(pedido, config.restaurantName);
      
      printWindow.document.write(printContent);
      printWindow.document.close();

      // Aguardar o carregamento e imprimir
      printWindow.onload = () => {
        printWindow.print();
        
        // Fechar a janela após um pequeno delay
        setTimeout(() => {
          printWindow.close();
        }, 1000);
      };

      toast({
        title: "Imprimindo pedido",
        description: `Comanda do pedido ${pedido.mesa} enviada para impressão.`,
      });

    } catch (error) {
      console.error('Erro ao imprimir:', error);
      toast({
        title: "Erro na impressão",
        description: error instanceof Error ? error.message : "Não foi possível imprimir o pedido.",
        variant: "destructive",
      });
    } finally {
      setPrinting(false);
    }
  };

  return {
    printOrder,
    printing,
  };
};

const generatePrintHTML = (pedido: Pedido, restaurantName: string): string => {
  const dataFormatada = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(pedido.timestamp);

  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Comanda - ${pedido.mesa}</title>
        <style>
            @media print {
                @page {
                    size: 80mm auto;
                    margin: 0;
                }
                body {
                    margin: 0;
                    padding: 0;
                }
            }
            
            body {
                font-family: 'Courier New', monospace;
                font-size: 12px;
                line-height: 1.4;
                color: black;
                background: white;
                width: 80mm;
                margin: 0 auto;
                padding: 10px;
                box-sizing: border-box;
            }
            
            .header {
                text-align: center;
                margin-bottom: 15px;
                border-bottom: 2px solid black;
                padding-bottom: 10px;
            }
            
            .restaurant-name {
                font-size: 16px;
                font-weight: bold;
                text-transform: uppercase;
                margin-bottom: 5px;
            }
            
            .document-type {
                font-size: 10px;
                margin-bottom: 5px;
            }
            
            .order-info {
                margin-bottom: 15px;
            }
            
            .info-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 3px;
            }
            
            .info-label {
                font-weight: bold;
            }
            
            .separator {
                border-bottom: 1px dashed black;
                margin: 10px 0;
            }
            
            .items-header {
                text-align: center;
                font-weight: bold;
                margin-bottom: 10px;
                font-size: 14px;
            }
            
            .item {
                margin-bottom: 12px;
                padding-bottom: 8px;
                border-bottom: 1px dotted #ccc;
            }
            
            .item-name {
                font-weight: bold;
                margin-bottom: 3px;
            }
            
            .item-description {
                font-size: 10px;
                color: #666;
                margin-bottom: 3px;
            }
            
            .item-observation {
                background-color: #fff3cd;
                border: 1px solid #ffeaa7;
                padding: 5px;
                margin-top: 5px;
                font-size: 10px;
            }
            
            .observation-label {
                font-weight: bold;
            }
            
            .total {
                text-align: center;
                font-size: 16px;
                font-weight: bold;
                margin: 15px 0;
                padding: 10px;
                border: 2px solid black;
            }
            
            .footer {
                text-align: center;
                font-size: 10px;
                margin-top: 15px;
                border-top: 2px solid black;
                padding-top: 10px;
            }
            
            .footer p {
                margin: 2px 0;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="restaurant-name">${restaurantName}</div>
            <div class="document-type">COMANDA DE COZINHA</div>
        </div>

        <div class="order-info">
            <div class="info-row">
                <span class="info-label">MESA:</span>
                <span>${pedido.mesa}</span>
            </div>
            ${pedido.cliente ? `
            <div class="info-row">
                <span class="info-label">CLIENTE:</span>
                <span>${pedido.cliente}</span>
            </div>
            ` : ''}
            <div class="info-row">
                <span class="info-label">DATA/HORA:</span>
                <span>${dataFormatada}</span>
            </div>
            <div class="info-row">
                <span class="info-label">STATUS:</span>
                <span>${pedido.status.toUpperCase()}</span>
            </div>
        </div>

        <div class="separator"></div>

        <div class="items-header">ITENS DO PEDIDO</div>

        ${pedido.itensPedido.map(item => `
            <div class="item">
                <div class="item-name">${item.quantidade}x ${item.produto.name}</div>
                ${item.produto.description ? `
                    <div class="item-description">${item.produto.description}</div>
                ` : ''}
                ${item.observacao ? `
                    <div class="item-observation">
                        <span class="observation-label">OBS:</span> ${item.observacao}
                    </div>
                ` : ''}
            </div>
        `).join('')}

        <div class="separator"></div>

        <div class="total">
            TOTAL: R$ ${pedido.total.toFixed(2)}
        </div>

        <div class="footer">
            <p>*** COMANDA DE COZINHA ***</p>
            <p>Preparar com atenção às observações</p>
            <p>Impresso em: ${new Date().toLocaleString('pt-BR')}</p>
        </div>
    </body>
    </html>
  `;
};