
export type Plano = {
    id: string;
    name: string;
    price_monthly: number;
    price_yearly: number;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
    features?: {
        feature: string;
        is_enabled: boolean;
    }[];
};
