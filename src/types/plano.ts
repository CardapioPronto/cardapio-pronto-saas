
export type Plano = {
    id: string;
    name: string;
    price_monthly: number;
    price_yearly: number;
    is_active: boolean;
    created_at?: string | null;
    updated_at?: string | null;
    description?: string | null;
    trial_days?: number;
    pagarme_plan_id_monthly?: string | null;
    pagarme_plan_id_yearly?: string | null;
    pagarme_synced_at?: string | null;
    pagarme_sync_status?: 'pending' | 'synced' | 'error';
    pagarme_sync_error?: string | null;
    pagarme_payment_methods?: PagarmePaymentMethod[];
    email_campaigns_enabled?: boolean;
    email_campaign_monthly_limit?: number;
    email_campaign_contact_limit?: number;
    email_custom_templates_enabled?: boolean;
    features?: {
        feature: string;
        is_enabled: boolean;
    }[];
};

export type PagarmePaymentMethod = 'credit_card' | 'debit_card' | 'boleto' | 'cash';
