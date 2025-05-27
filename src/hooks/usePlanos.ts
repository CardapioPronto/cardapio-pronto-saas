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
            setPlanos(data || []);
        }
    }, []);

    return { planos, fetchPlanos };
};
