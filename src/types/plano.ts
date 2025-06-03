
export type Plano = {
    id: string;
    name: string;
    price_monthly: number;
    price_yearly: number;
    is_active: boolean;
    created_at?: string | null;
    updated_at?: string | null;
    features?: {
        feature: string;
        is_enabled: boolean;
    }[];
};
