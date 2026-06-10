import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  fetchReferralProgramAdminSettings,
  saveReferralProgramSettings,
} from "@/services/referralService";
import type { ReferralProgramSettingsDraft } from "@/types/referral";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AdminReferralMaterials,
  AdminReferralPayoutsAndCommissions,
} from "@/components/admin/referrals/AdminReferralOperations";
import { AdminReferralEmailTemplates } from "@/components/admin/referrals/AdminReferralEmailTemplates";
import { toast } from "@/components/ui/sonner-toast";

const defaultDraft: ReferralProgramSettingsDraft = {
  program_enabled: false,
  accepting_new_referrals: true,
  accrual_enabled: true,
  paused_message: "",
  paused_until: null,
  default_commission_percent_monthly: 10,
  default_commission_percent_yearly: 10,
  attribution_window_days: 90,
  hold_days_before_approval: 30,
  min_payout_amount: 50,
  terms_version: "1",
  terms_content: "",
};

export default function AdminReferrals() {
  const [draft, setDraft] = useState<ReferralProgramSettingsDraft>(defaultDraft);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchReferralProgramAdminSettings();
        setDraft({
          program_enabled: Boolean(data.program_enabled),
          accepting_new_referrals: Boolean(data.accepting_new_referrals),
          accrual_enabled: Boolean(data.accrual_enabled),
          paused_message: data.paused_message ?? "",
          paused_until: data.paused_until ? String(data.paused_until).slice(0, 16) : null,
          default_commission_percent_monthly: Number(data.default_commission_percent_monthly ?? 10),
          default_commission_percent_yearly: Number(data.default_commission_percent_yearly ?? 10),
          attribution_window_days: Number(data.attribution_window_days ?? 90),
          hold_days_before_approval: Number(data.hold_days_before_approval ?? 30),
          min_payout_amount: Number(data.min_payout_amount ?? 50),
          terms_version: data.terms_version ?? "1",
          terms_content: data.terms_content ?? "",
        });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erro ao carregar configurações.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveReferralProgramSettings({
        ...draft,
        paused_until: draft.paused_until ? new Date(draft.paused_until).toISOString() : null,
        paused_message: draft.paused_message.trim(),
      });
      toast.success("Configurações do programa salvas.");
    } catch (error) {
      const message =
        typeof error === "object" && error && "message" in error
          ? String((error as { message?: unknown }).message ?? "Erro ao salvar.")
          : "Erro ao salvar.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout title="Programa de indicações">
      <Tabs defaultValue="config" className="space-y-6">
        <TabsList>
          <TabsTrigger value="config">Configuração</TabsTrigger>
          <TabsTrigger value="operations">Saques e comissões</TabsTrigger>
          <TabsTrigger value="materials">Materiais</TabsTrigger>
          <TabsTrigger value="emails">E-mails</TabsTrigger>
        </TabsList>

        <TabsContent value="config">
        <Card>
          <CardHeader>
            <CardTitle>Configuração global</CardTitle>
            <CardDescription>
              Ative o programa após validar o piloto. Comissões são geradas pelo webhook Pagar.me quando
              accrual estiver ligado.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {loading ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <Label htmlFor="program-enabled">Programa ativo</Label>
                    <Switch
                      id="program-enabled"
                      checked={draft.program_enabled}
                      onCheckedChange={(v) => setDraft((d) => ({ ...d, program_enabled: v }))}
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <Label htmlFor="accepting">Aceitar novas indicações</Label>
                    <Switch
                      id="accepting"
                      checked={draft.accepting_new_referrals}
                      onCheckedChange={(v) => setDraft((d) => ({ ...d, accepting_new_referrals: v }))}
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <Label htmlFor="accrual">Gerar comissões (webhook)</Label>
                    <Switch
                      id="accrual"
                      checked={draft.accrual_enabled}
                      onCheckedChange={(v) => setDraft((d) => ({ ...d, accrual_enabled: v }))}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="pct-monthly">Comissão mensal (%)</Label>
                    <Input
                      id="pct-monthly"
                      type="number"
                      min={0}
                      max={100}
                      value={draft.default_commission_percent_monthly}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          default_commission_percent_monthly: Number(e.target.value),
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pct-yearly">Comissão anual (%)</Label>
                    <Input
                      id="pct-yearly"
                      type="number"
                      min={0}
                      max={100}
                      value={draft.default_commission_percent_yearly}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          default_commission_percent_yearly: Number(e.target.value),
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="window">Janela de atribuição (dias)</Label>
                    <Input
                      id="window"
                      type="number"
                      min={1}
                      max={365}
                      value={draft.attribution_window_days}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, attribution_window_days: Number(e.target.value) }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hold">Carência aprovação (dias)</Label>
                    <Input
                      id="hold"
                      type="number"
                      min={0}
                      max={180}
                      value={draft.hold_days_before_approval}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, hold_days_before_approval: Number(e.target.value) }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="min-payout">Saque mínimo (R$)</Label>
                    <Input
                      id="min-payout"
                      type="number"
                      min={0}
                      step="0.01"
                      value={draft.min_payout_amount}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, min_payout_amount: Number(e.target.value) }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="terms-version">Versão dos termos</Label>
                    <Input
                      id="terms-version"
                      value={draft.terms_version}
                      onChange={(e) => setDraft((d) => ({ ...d, terms_version: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="terms-content">Texto dos termos (Markdown simples)</Label>
                  <Textarea
                    id="terms-content"
                    rows={14}
                    value={draft.terms_content}
                    onChange={(e) => setDraft((d) => ({ ...d, terms_content: e.target.value }))}
                    placeholder="# Termos do programa..."
                  />
                  <p className="text-xs text-muted-foreground">
                    Publicado em{" "}
                    <a href="/indique/termos" className="text-primary underline-offset-4 hover:underline">
                      /indique/termos
                    </a>
                    . Ao alterar o texto, incremente a versão para novos aceites.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paused-message">Mensagem quando pausado</Label>
                  <Textarea
                    id="paused-message"
                    value={draft.paused_message}
                    onChange={(e) => setDraft((d) => ({ ...d, paused_message: e.target.value }))}
                    placeholder="No momento não estamos aceitando novas indicações."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paused-until">Pausa até (opcional)</Label>
                  <Input
                    id="paused-until"
                    type="datetime-local"
                    value={draft.paused_until ?? ""}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, paused_until: e.target.value || null }))
                    }
                  />
                </div>

                <Button onClick={handleSave} disabled={saving}>
                  {saving ? "Salvando..." : "Salvar configurações"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
        </TabsContent>

        <TabsContent value="operations">
          <AdminReferralPayoutsAndCommissions />
        </TabsContent>

        <TabsContent value="materials">
          <AdminReferralMaterials />
        </TabsContent>

        <TabsContent value="emails">
          <AdminReferralEmailTemplates />
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
