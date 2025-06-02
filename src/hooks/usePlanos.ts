
import { useCallback, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Plano } from "@/types/plano";

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
                created_at: item.created_at,
                updated_at: item.updated_at,
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
