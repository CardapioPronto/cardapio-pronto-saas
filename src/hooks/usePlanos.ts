
import { useCallback, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PagarmePaymentMethod, Plano } from "@/types/plano";

const PAGARME_METHODS = new Set<PagarmePaymentMethod>([
    "credit_card",
    "debit_card",
    "boleto",
    "cash",
]);

function normalizeSyncStatus(status: string): Plano["pagarme_sync_status"] {
    return status === "synced" || status === "error" ? status : "pending";
}

function normalizePaymentMethods(methods: string[] | null): PagarmePaymentMethod[] {
    const validMethods = (methods || []).filter((method): method is PagarmePaymentMethod =>
        PAGARME_METHODS.has(method as PagarmePaymentMethod),
    );
    return validMethods.length ? validMethods : ["credit_card", "boleto"];
}

export const usePlanos = () => {
    const [planos, setPlanos] = useState<Plano[]>([]);

    const fetchPlanos = useCallback(async () => {
        const { data, error } = await supabase
            .from("plans")
            .select("*, plan_features(feature, is_enabled)");

        if (error) {
            console.error("Erro ao buscar planos:", error);
        } else {
            // Transform data to match Plano type
            const transformedData = data?.map(item => ({
                id: item.id,
                name: item.name,
                price_monthly: item.price_monthly,
                price_yearly: item.price_yearly,
                is_active: item.is_active || false,
                created_at: item.created_at || undefined,
                updated_at: item.updated_at || undefined,
                description: item.description ?? null,
                trial_days: item.trial_days ?? 14,
                pagarme_plan_id_monthly: item.pagarme_plan_id_monthly ?? null,
                pagarme_plan_id_yearly: item.pagarme_plan_id_yearly ?? null,
                pagarme_synced_at: item.pagarme_synced_at ?? null,
                pagarme_sync_status: normalizeSyncStatus(item.pagarme_sync_status),
                pagarme_sync_error: item.pagarme_sync_error ?? null,
                pagarme_payment_methods: normalizePaymentMethods(item.pagarme_payment_methods),
                email_campaigns_enabled: item.email_campaigns_enabled ?? false,
                email_campaign_monthly_limit: item.email_campaign_monthly_limit ?? 0,
                email_campaign_contact_limit: item.email_campaign_contact_limit ?? 0,
                email_custom_templates_enabled: item.email_custom_templates_enabled ?? true,
                features: item.plan_features?.map(f => ({
                    feature: f.feature,
                    is_enabled: f.is_enabled || false
                })) || []
            })) || [];
            
            setPlanos(transformedData);
        }
    }, []);

    return { planos, fetchPlanos };
};
