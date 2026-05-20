import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AddPlanoDialog } from "@/components/planos/AddPlanoDialog";
import { usePlanos } from "@/hooks/usePlanos";
import AdminLayout from "@/components/admin/AdminLayout";
import { PlanosTable } from "@/components/planos/PlanosTable";
import { supabase } from "@/lib/supabase";
import { supabase as sb } from "@/integrations/supabase/client";
import { EditPlanoDialog } from "@/components/planos/EditPlanoDialog";
import { PlanoFeaturesDialog } from "@/components/planos/PlanoFeaturesDialog";
import { Plano } from "@/types/plano";
import { toast } from '@/components/ui/sonner-toast';

type FunctionErrorWithContext = Error & {
    context?: Response;
};

export default function Planos() {
    const { planos, fetchPlanos } = usePlanos();
    const [open, setOpen] = useState(false);
    const [planoEditando, setPlanoEditando] = useState<Plano | null>(null);
    const [planoFeatures, setPlanoFeatures] = useState< Plano | null>(null);
    const [syncingId, setSyncingId] = useState<string | null>(null);

    useEffect(() => {
        fetchPlanos();
    }, [fetchPlanos]);

    const handleRemoverPlano = async (id: string) => {
        const confirmar = confirm(
          "Atenção: prefira inativar planos com assinaturas vinculadas. Deseja realmente excluir este plano?"
        );
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

    const handleSync = async (plano: Plano) => {
        setSyncingId(plano.id);
        try {
          const { data, error } = await sb.functions.invoke("pagarme-sync-plan", {
            body: { plan_id: plano.id },
          });
          if (error) {
            const context = (error as FunctionErrorWithContext).context;
            let details = "";
            if (context?.clone) {
              try {
                const payload = await context.clone().json() as { error?: string; message?: string };
                details = payload?.error || payload?.message || JSON.stringify(payload);
              } catch {
                try {
                  details = await context.clone().text();
                } catch {
                  details = "";
                }
              }
            }
            throw new Error(details || error.message);
          }
          if (data?.success === false) throw new Error(data.error || "Falha ao sincronizar");
          toast.success("Plano sincronizado com o Pagar.me");
          await fetchPlanos();
        } catch (e) {
          const message = e instanceof Error ? e.message : "desconhecido";
          toast.error("Erro ao sincronizar: " + message);
          await fetchPlanos();
        } finally {
          setSyncingId(null);
        }
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
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    Cada plano local cria <strong>dois planos no Pagar.me</strong> (mensal e anual).
                    Após criar ou editar, clique no botão <strong>sincronizar</strong> para enviar as
                    alterações ao gateway. Alterações <strong>não afetam assinaturas existentes</strong>.
                    Na sincronização, só vão cartão/boleto/débito; <strong>PIX</strong> vale no checkout.
                    Preços mensal e anual (12×) precisam ser de pelo menos <strong>R$ 1,00</strong>.
                  </AlertDescription>
                </Alert>
                <Card>
                <CardContent className="p-4">
                    <PlanosTable
                      data={planos}
                      isLoading={false}
                      onRemove={handleRemoverPlano}
                      onEdit={handleEditarPlano}
                      onManageFeatures={handleGerenciarFeatures}
                      onSync={handleSync}
                      syncingId={syncingId}
                    />
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
