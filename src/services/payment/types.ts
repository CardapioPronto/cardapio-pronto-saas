
// Tipos e interfaces para o serviço de pagamento

export interface PaymentMethod {
  type: 'credit_card' | 'boleto' | 'pix';
  cardDetails?: {
    number: string;
    name: string;
    expiry: string;
    cvc: string;
  };
}

export interface CustomerInfo {
  name: string;
  email: string;
  document: string;
  phone: string;
}

export interface SubscriptionRequest {
  planId: string;
  customer: CustomerInfo;
  paymentMethod: PaymentMethod;
  billingType: 'monthly' | 'yearly';
}

export interface SubscriptionResponse {
  id: string;
  status: 'active' | 'pending' | 'canceled';
  nextBilling: Date;
  planInfo: {
    name: string;
    price: number;
  };
  pagarmeSubscriptionId?: string;
  pagarmeCustomerId?: string;
}

export interface PagarmeConfig {
  apiKey: string;
  isLive: boolean;
  apiUrl: string;
  debug: boolean;
}
