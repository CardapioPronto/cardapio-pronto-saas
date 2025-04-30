
// Tipos para integração com iFood

export interface IfoodCredentials {
  clientId: string;
  clientSecret: string;
  merchantId: string;
  restaurantId?: string;
}

export interface IfoodConfig {
  credentials: IfoodCredentials | null;
  apiUrl: string;
  isEnabled: boolean;
  webhookUrl: string | null;
  pollingEnabled: boolean;
  pollingInterval: number; // em segundos
}

export interface IfoodOrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  observations?: string;
  options?: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
}

export interface IfoodOrder {
  id: string;
  reference: string;
  shortReference: string;
  createdAt: string;
  type: 'DELIVERY' | 'TAKEOUT';
  customer: {
    name: string;
    phone: string;
    documentNumber?: string;
    address?: {
      streetName: string;
      streetNumber: string;
      neighborhood: string;
      city: string;
      state: string;
      postalCode: string;
      complement?: string;
    };
  };
  items: IfoodOrderItem[];
  total: number;
  deliveryFee?: number;
  deliveryTime?: string;
  status: 'PLACED' | 'ACCEPTED' | 'DISPATCHED' | 'READY_TO_DELIVER' | 'CONCLUDED' | 'CANCELLED';
  orderTiming?: {
    expectedPreparationTime: number;
  };
  payments: Array<{
    method: 'CREDIT' | 'DEBIT' | 'MEAL_VOUCHER' | 'FOOD_VOUCHER' | 'CASH' | 'PIX';
    prepaid: boolean;
    value: number;
  }>;
}

export interface IfoodAuthResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
}

export interface IfoodWebhookEvent {
  id: string;
  eventType: 'ORDER_PLACED' | 'ORDER_CONFIRMED' | 'ORDER_DISPATCHED' | 'ORDER_READY_TO_DELIVER' | 'ORDER_CONCLUDED' | 'ORDER_CANCELLED';
  createdAt: string;
  correlationId: string;
  orderId: string;
}
