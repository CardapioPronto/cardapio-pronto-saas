import { useState } from 'react';
import { Pedido } from '@/features/pdv/types';
import { useToast } from '@/hooks/use-toast';

export type PrintTemplate = "kitchen" | "cashier" | "customer";

interface PrintConfig {
  restaurantName: string;
  autoPrint?: boolean;
  template?: PrintTemplate;
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

      const template = config.template ?? "kitchen";
      const templateLabel = PRINT_TEMPLATE_LABELS[template];
      const printContent = generatePrintHTML(pedido, config.restaurantName, template);
      
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
        description: `${templateLabel} do pedido ${pedido.mesa || "Balcão"} enviada para impressão.`,
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

const PRINT_TEMPLATE_LABELS: Record<PrintTemplate, string> = {
  kitchen: "Comanda da cozinha",
  cashier: "Via do caixa",
  customer: "Comprovante do cliente",
};

const PRINT_TEMPLATE_TITLES: Record<PrintTemplate, string> = {
  kitchen: "COMANDA DE COZINHA",
  cashier: "VIA DO CAIXA",
  customer: "COMPROVANTE DO CLIENTE",
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  pix: "PIX",
  pix_online: "PIX online",
  credit_card_online: "Cartão online",
  dinheiro: "Dinheiro",
  cartao_credito: "Cartão de crédito",
  cartao_debito: "Cartão de débito",
  local: "Pagamento no local",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  paid: "Pago",
  failed: "Falhou",
  refunded: "Estornado",
  aguardando_pagamento: "Aguardando pagamento",
  pagamento_falhou: "Pagamento falhou",
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);

const getPaymentLabel = (value?: string | null, labels: Record<string, string> = PAYMENT_METHOD_LABELS) => {
  if (!value) return "Não informado";
  return labels[value] || value.replace(/_/g, " ");
};

const generatePrintHTML = (pedido: Pedido, restaurantName: string, template: PrintTemplate): string => {
  const safeRestaurantName = escapeHtml(restaurantName);
  const safeMesa = escapeHtml(pedido.mesa || "Balcão");
  const safeCliente = pedido.cliente ? escapeHtml(pedido.cliente) : "";
  const documentTitle = PRINT_TEMPLATE_TITLES[template];
  const showPrices = template !== "kitchen";
  const showPayment = template !== "kitchen";
  const footerMessage = template === "kitchen"
    ? "Preparar com atenção às observações"
    : template === "cashier"
      ? "Conferir pagamento e entrega antes de finalizar"
      : "Obrigado pela preferência";
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
        <title>Comanda - ${safeMesa}</title>
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
                gap: 8px;
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

            .item-line {
                display: flex;
                justify-content: space-between;
                gap: 8px;
            }

            .item-price {
                white-space: nowrap;
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

            .kitchen-warning {
                text-align: center;
                font-size: 10px;
                margin: 10px 0;
                padding: 6px;
                border: 1px dashed black;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="restaurant-name">${safeRestaurantName}</div>
            <div class="document-type">${documentTitle}</div>
        </div>

        <div class="order-info">
            <div class="info-row">
                <span class="info-label">MESA:</span>
                <span>${safeMesa}</span>
            </div>
            ${pedido.cliente ? `
            <div class="info-row">
                <span class="info-label">CLIENTE:</span>
                <span>${safeCliente}</span>
            </div>
            ` : ''}
            <div class="info-row">
                <span class="info-label">DATA/HORA:</span>
                <span>${dataFormatada}</span>
            </div>
            <div class="info-row">
                <span class="info-label">STATUS:</span>
                <span>${escapeHtml(pedido.status.toUpperCase())}</span>
            </div>
            ${showPayment ? `
            <div class="info-row">
                <span class="info-label">PAGAMENTO:</span>
                <span>${escapeHtml(getPaymentLabel(pedido.payment_method))}</span>
            </div>
            <div class="info-row">
                <span class="info-label">STATUS PGTO:</span>
                <span>${escapeHtml(getPaymentLabel(pedido.payment_status, PAYMENT_STATUS_LABELS))}</span>
            </div>
            ` : ''}
        </div>

        <div class="separator"></div>

        <div class="items-header">ITENS DO PEDIDO</div>

        ${pedido.itensPedido.map(item => `
            <div class="item">
                <div class="item-line">
                    <div class="item-name">${item.quantidade}x ${escapeHtml(item.produto.name)}</div>
                    ${showPrices ? `
                        <div class="item-price">${formatCurrency(item.produto.price * item.quantidade)}</div>
                    ` : ''}
                </div>
                ${item.produto.description ? `
                    <div class="item-description">${escapeHtml(item.produto.description)}</div>
                ` : ''}
                ${item.observacao ? `
                    <div class="item-observation">
                        <span class="observation-label">OBS:</span> ${escapeHtml(item.observacao)}
                    </div>
                ` : ''}
            </div>
        `).join('')}

        <div class="separator"></div>

        ${template === "kitchen" ? `
            <div class="kitchen-warning">VIA SEM VALORES - USO OPERACIONAL</div>
        ` : ''}

        ${showPrices ? `
        <div class="total">
            TOTAL: ${formatCurrency(pedido.total)}
        </div>
        ` : ''}

        <div class="footer">
            <p>*** ${documentTitle} ***</p>
            <p>${footerMessage}</p>
            <p>Impresso em: ${new Date().toLocaleString('pt-BR')}</p>
        </div>
    </body>
    </html>
  `;
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
