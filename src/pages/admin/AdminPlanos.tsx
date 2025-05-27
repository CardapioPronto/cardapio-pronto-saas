import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { AddPlanoDialog } from "@/components/planos/AddPlanoDialog";
import { usePlanos } from "@/hooks/usePlanos";
import AdminLayout from "@/components/admin/AdminLayout";
import { PlanosTable } from "@/components/planos/PlanosTable";
import { supabase } from "@/lib/supabase";
import { EditPlanoDialog } from "@/components/planos/EditPlanoDialog";
import { PlanoFeaturesDialog } from "@/components/planos/PlanoFeaturesDialog";
import { Plano } from "@/types/plano";
import { toast } from '@/components/ui/sonner';

export default function Planos() {
    const { planos, fetchPlanos } = usePlanos();
    const [open, setOpen] = useState(false);
    const [planoEditando, setPlanoEditando] = useState<Plano | null>(null);
    const [planoFeatures, setPlanoFeatures] = useState< Plano | null>(null);

    useEffect(() => {
        fetchPlanos();
    }, [fetchPlanos]);

    const handleRemoverPlano = async (id: string) => {
        const confirmar = confirm("Deseja realmente excluir este plano?");
        if (!confirmar) return;
        const { error } = await supabase.from("plans").delete().eq("id", id);
        if (error) {
            toast.error("Erro ao remover plano:" + error.message);
        } else {
          fetchPlanos(); // atualiza a lista após deletar
        }
    };

    const handleEditarPlano = (plano: Plano) => {
        setPlanoEditando(plano);
    };
    
    const handleGerenciarFeatures = (plano: Plano) => {
        setPlanoFeatures(plano);
    };

    return (
        <AdminLayout title="Gerenciar Super Administradores">
            <div className="p-6 space-y-4">
                <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Planos</h1>
                <Button onClick={() => setOpen(true)}>
                    <Plus className="mr-2" /> Novo Plano
                </Button>
                </div>
                <Card>
                <CardContent className="p-4">
                    <PlanosTable data={planos} isLoading={false} onRemove={handleRemoverPlano} onEdit={handleEditarPlano} onManageFeatures={handleGerenciarFeatures} />
                </CardContent>
                </Card>
                <AddPlanoDialog
                open={open}
                onOpenChange={setOpen}
                onPlanoAdicionado={fetchPlanos}
                />
            </div>

            <div className="p-6 space-y-4">
                {/* Cabeçalho e botão novo plano */}
                {/* Lista com <PlanosTable /> */}

                <EditPlanoDialog
                    open={!!planoEditando}
                    onOpenChange={(open) => open || setPlanoEditando(null)}
                    plano={planoEditando}
                    onPlanoAtualizado={fetchPlanos}
                />

                <PlanoFeaturesDialog
                    open={!!planoFeatures}
                    onOpenChange={(open) => !open && setPlanoFeatures(null)}
                    plano={planoFeatures}
                />
            </div>
        </AdminLayout>
    );
    
}
