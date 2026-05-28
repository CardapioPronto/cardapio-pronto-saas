import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Info, Clock, Save } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { selectMarketingPlan } from "@/lib/marketingPlan";
import { DEFAULT_TRIAL_DAYS, MAX_TRIAL_DAYS, normalizeTrialDays } from "@/lib/trialDays";

type FunctionErrorWithContext = Error & {
    context?: Response;
};

function dateTimeToMinute(value: string): number {
    const date = new Date(value);
    date.setSeconds(0, 0);
    return date.getTime();
}

function isGatewayCurrentlySynced(plano: Plano) {
    if (plano.pagarme_sync_status !== "synced" || !plano.pagarme_synced_at) return false;
    if (!plano.updated_at) return true;
    return dateTimeToMinute(plano.updated_at) <= dateTimeToMinute(plano.pagarme_synced_at);
}

export default function Planos() {
    const { planos, fetchPlanos } = usePlanos();
    const [open, setOpen] = useState(false);
    const [planoEditando, setPlanoEditando] = useState<Plano | null>(null);
    const [planoFeatures, setPlanoFeatures] = useState< Plano | null>(null);
    const [syncingId, setSyncingId] = useState<string | null>(null);
    const [trialDaysDraft, setTrialDaysDraft] = useState(String(DEFAULT_TRIAL_DAYS));
    const [savingTrialDays, setSavingTrialDays] = useState(false);
    const trialPlan = useMemo(() => selectMarketingPlan(planos), [planos]);

    useEffect(() => {
        fetchPlanos();
    }, [fetchPlanos]);

    useEffect(() => {
        if (trialPlan) {
            setTrialDaysDraft(String(normalizeTrialDays(trialPlan.trial_days, DEFAULT_TRIAL_DAYS)));
        }
    }, [trialPlan]);

    const handleUpdateTrialDays = async () => {
        if (!trialPlan) {
            toast.error("Nenhum plano ativo encontrado para configurar o teste.");
            return;
        }

        const parsed = Number(trialDaysDraft);
        if (
            !trialDaysDraft.trim() ||
            !Number.isInteger(parsed) ||
            parsed < 0 ||
            parsed > MAX_TRIAL_DAYS
        ) {
            toast.error(`Informe um número inteiro entre 0 e ${MAX_TRIAL_DAYS} dias.`);
            return;
        }

        const nextTrialDays = normalizeTrialDays(parsed, DEFAULT_TRIAL_DAYS);
        const updatePayload: { trial_days: number; pagarme_synced_at?: string } = {
            trial_days: nextTrialDays,
        };

        if (isGatewayCurrentlySynced(trialPlan)) {
            updatePayload.pagarme_synced_at = new Date().toISOString();
        }

        setSavingTrialDays(true);
        const { error } = await supabase
            .from("plans")
            .update(updatePayload)
            .eq("id", trialPlan.id);
        setSavingTrialDays(false);

        if (error) {
            toast.error("Erro ao atualizar dias de teste: " + error.message);
            return;
        }

        toast.success(
            nextTrialDays > 0
                ? `Novos cadastros terão ${nextTrialDays} dia(s) de teste.`
                : "Teste grátis desativado para novos cadastros.",
        );
        await fetchPlanos();
    };

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
          if (data?.warning) {
            toast.success("Plano vinculado ao Pagar.me", { description: String(data.warning) });
          } else {
            toast.success("Plano sincronizado com o Pagar.me");
          }
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
        <AdminLayout title="Planos">
            <div className="p-6 space-y-4">
                <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Planos</h1>
                <Button onClick={() => setOpen(true)}>
                    <Plus className="mr-2" /> Novo Plano
                </Button>
                </div>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Clock className="h-5 w-5 text-orange" />
                      Teste grátis para novos assinantes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px_auto] md:items-end">
                      <div className="text-sm text-muted-foreground">
                        <p>
                          Controla o trial criado automaticamente no cadastro do restaurante.
                          A alteração vale para novos cadastros e não reduz períodos já concedidos.
                        </p>
                        <p className="mt-1">
                          Plano de referência: <strong>{trialPlan?.name ?? "nenhum plano ativo"}</strong>.
                          Use <strong>0</strong> para desativar o teste grátis durante homologações.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="admin-trial-days">Dias liberados</Label>
                        <Input
                          id="admin-trial-days"
                          type="number"
                          min={0}
                          max={MAX_TRIAL_DAYS}
                          step={1}
                          value={trialDaysDraft}
                          onChange={(event) => setTrialDaysDraft(event.target.value)}
                          disabled={!trialPlan || savingTrialDays}
                        />
                      </div>
                      <Button
                        onClick={handleUpdateTrialDays}
                        disabled={!trialPlan || savingTrialDays}
                        className="md:self-end"
                      >
                        <Save className="mr-2 h-4 w-4" />
                        {savingTrialDays ? "Salvando..." : "Salvar"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    Cada plano local cria <strong>dois planos no Pagar.me</strong> (mensal e anual).
                    Após criar ou alterar preço, nome, descrição ou métodos, clique no botão <strong>sincronizar</strong> para enviar as
                    alterações ao gateway. Dias de teste são controlados localmente e não exigem sincronização.
                    Alterações <strong>não afetam assinaturas existentes</strong>.
                    Na sincronização, só vão cartão/boleto/débito; <strong>PIX</strong> vale no checkout.
                    Planos de assinatura no Pagar.me precisam gerar cobrança de pelo menos <strong>R$ 5,00</strong>.
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
