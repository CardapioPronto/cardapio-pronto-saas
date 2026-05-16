import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const SETTING_KEY = "stock_control";

type StockControlValue = {
    enabled: boolean;
};

const isStockControlValue = (value: unknown): value is StockControlValue =>
    typeof value === "object" && value !== null && "enabled" in value;

/**
 * Bandeira global de estoque do restaurante.
 *
 * Persiste em `restaurant_settings` no padrão key/value já usado por
 * `hours` / `delivery_config`: linha com `setting_key = 'stock_control'`
 * e `setting_value = { enabled: boolean }`. Mantemos o padrão para evitar
 * a ambiguidade da coluna plana `restaurant_settings.stock_control_enabled`
 * (criada na migration B1, hoje sem uso real — uma row por setting_key
 * faz a coluna plana ser duplicada em todas as configurações do tenant).
 */
export function useStockSettings(restaurantId: string | undefined | null) {
    const [enabled, setEnabled] = useState(false);
    const [loading, setLoading] = useState<boolean>(Boolean(restaurantId));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!restaurantId) {
            setEnabled(false);
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const { data, error: queryError } = await supabase
                .from("restaurant_settings")
                .select("setting_value")
                .eq("restaurant_id", restaurantId)
                .eq("setting_key", SETTING_KEY)
                .maybeSingle();

            if (queryError) {
                throw queryError;
            }

            const value = data?.setting_value;
            setEnabled(Boolean(isStockControlValue(value) && value.enabled));
        } catch (err) {
            console.error("[useStockSettings] erro ao carregar flag global:", err);
            setError(err instanceof Error ? err.message : "Erro ao carregar configurações de estoque");
            setEnabled(false);
        } finally {
            setLoading(false);
        }
    }, [restaurantId]);

    useEffect(() => {
        void load();
    }, [load]);

    const save = useCallback(
        async (nextEnabled: boolean) => {
            if (!restaurantId) {
                throw new Error("Restaurante não identificado.");
            }
            setSaving(true);
            setError(null);
            try {
                const payload = { enabled: nextEnabled };
                const { error: upsertError } = await supabase
                    .from("restaurant_settings")
                    .upsert(
                        {
                            restaurant_id: restaurantId,
                            setting_key: SETTING_KEY,
                            setting_value: payload,
                        },
                        { onConflict: "restaurant_id,setting_key" },
                    );
                if (upsertError) {
                    throw upsertError;
                }
                setEnabled(nextEnabled);
            } catch (err) {
                console.error("[useStockSettings] erro ao salvar flag global:", err);
                setError(err instanceof Error ? err.message : "Erro ao salvar configurações de estoque");
                throw err;
            } finally {
                setSaving(false);
            }
        },
        [restaurantId],
    );

    return {
        enabled,
        loading,
        saving,
        error,
        reload: load,
        save,
    } as const;
}
