// PlanoFeaturesDialog.tsx
import { useCallback, useEffect, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/lib/supabase";
import { Plano } from "@/hooks/usePlanos";

interface PlanoFeaturesDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    plano: Plano | null;
}

interface FeatureRow {
    id: string;
    feature: string;
    is_enabled: boolean;
}

const FeatureRow = ({ feature, onToggle }: { feature: FeatureRow; onToggle: (id: string, enabled: boolean) => void }) => (
    <div className="flex items-center justify-between">
        <span>{feature.feature}</span>
        <Checkbox
            checked={feature.is_enabled}
            onCheckedChange={(val) => onToggle(feature.id, Boolean(val))}
        />
    </div>
);

export const PlanoFeaturesDialog = ({
    open,
    onOpenChange,
    plano,
}: PlanoFeaturesDialogProps) => {
    const [features, setFeatures] = useState<FeatureRow[]>([]);
    const [newFeature, setNewFeature] = useState("");
    const [newFeatureEnabled, setNewFeatureEnabled] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const fetchFeatures = useCallback(async () => {
        if (!plano) return;
        setLoading(true);
        const { data, error } = await supabase
            .from("plan_features")
            .select("id, feature, is_enabled")
            .eq("plan_id", plano.id);

        if (data) {
            setFeatures(data);
            setErrorMessage(null); // Limpa mensagens de erro
        }
        if (error) {
            console.error("Erro ao carregar features:", error);
            setErrorMessage("Erro ao carregar funcionalidades do plano.");
        }
        setLoading(false);
    }, [plano]);

    const toggleFeature = async (id: string, enabled: boolean) => {
        const { error } = await supabase
            .from("plan_features")
            .update({ is_enabled: enabled })
            .eq("id", id);

        if (!error) {
            setFeatures((prev) =>
                prev.map((f) => (f.id === id ? { ...f, is_enabled: enabled } : f))
            );
        } else {
            console.error("Erro ao atualizar funcionalidade:", error);
        }
    };

    const addFeature = async () => {
        if (!plano || !newFeature) return;
        const { data, error } = await supabase
            .from("plan_features")
            .insert({
                plan_id: plano.id,
                feature: newFeature,
                is_enabled: newFeatureEnabled,
            })
            .select("id");

        if (data) {
            setFeatures((prev) => [...prev, { id: data[0].id, feature: newFeature, is_enabled: newFeatureEnabled }]);
            setNewFeature("");
        } else {
            console.error("Erro ao adicionar funcionalidade:", error);
        }
    };

    useEffect(() => {
        if (open) fetchFeatures();
    }, [open, fetchFeatures]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Funcionalidades do plano: {plano?.name}</DialogTitle>
                <DialogDescription>Adicionar nova funcionalidade do plano</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
            {errorMessage && <p className="text-red-500">{errorMessage}</p>}
            {loading ? (
                <p>Carregando funcionalidades...</p>
            ) : (
                features.map((f) => (
                    <FeatureRow key={f.id} feature={f} onToggle={toggleFeature} />
                ))
            )}
            <div className="flex gap-2">
                <Input
                    placeholder="Nova funcionalidade"
                    value={newFeature}
                    onChange={(e) => setNewFeature(e.target.value)}
                />
                <Checkbox
                    checked={newFeatureEnabled}
                    onCheckedChange={(checked) => setNewFeatureEnabled(Boolean(checked))}
                />

                <Button onClick={addFeature}>Adicionar</Button>
            </div>
            </div>
        </DialogContent>
        </Dialog>
    );
};
