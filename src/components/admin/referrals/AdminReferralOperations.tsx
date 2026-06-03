import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCentsToBrl } from "@/lib/formatCents";
import {
  completeAffiliatePayoutRequest,
  deleteAffiliateCampaignMaterial,
  fetchReferralAdminSnapshot,
  notifyAllMaturedCommissions,
  saveAffiliateCampaignMaterial,
  uploadAffiliateCampaignAsset,
} from "@/services/referralService";
import type { AffiliateCampaignMaterial, AffiliateMaterialDraft } from "@/types/referral";
import { toast } from "@/components/ui/sonner-toast";

const emptyMaterialDraft = (): AffiliateMaterialDraft => ({
  title: "",
  description: "",
  category: "general",
  material_type: "copy",
  copy_template: "Conheça o Pubfy: {{ref_link}}",
  sort_order: 0,
  is_active: true,
});

const commissionStatusLabel: Record<string, string> = {
  pending: "Em carência",
  approved: "Aprovada",
  paid: "Paga",
  reversed: "Estornada",
};

export function AdminReferralPayoutsAndCommissions() {
  const [snapshot, setSnapshot] = useState<Awaited<ReturnType<typeof fetchReferralAdminSnapshot>> | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setSnapshot(await fetchReferralAdminSnapshot());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const handlePayout = async (requestId: string, markPaid: boolean) => {
    try {
      await completeAffiliatePayoutRequest(requestId, markPaid);
      toast.success(markPaid ? "Saque marcado como pago." : "Solicitação rejeitada.");
      await reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar saque.");
    }
  };

  if (loading) return <p className="text-sm text-muted-foreground">Carregando operações...</p>;

  const handleMatureAll = async () => {
    try {
      const result = await notifyAllMaturedCommissions();
      toast.success(
        result.matured_count
          ? `${result.matured_count} comissão(ões) aprovada(s) e notificada(s).`
          : "Nenhuma comissão pendente de aprovação.",
      );
      await reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao processar carências.");
    }
  };

  const pendingPayoutCount = snapshot?.pending_payouts?.length ?? 0;
  const pendingPayoutTotalCents =
    snapshot?.pending_payouts?.reduce((acc, row) => acc + Number(row.amount_cents || 0), 0) ?? 0;
  const recentCommissions = snapshot?.recent_commissions ?? [];
  const funnel = snapshot?.funnel_summary;
  const topAffiliates = snapshot?.top_affiliates ?? [];
  const commissionsByStatus = recentCommissions.reduce<Record<string, number>>((acc, row) => {
    const key = row.status || "unknown";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Restaurantes atribuídos</CardDescription>
            <CardTitle>{funnel?.attributed_restaurants ?? 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Base total do programa</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Com pagamento</CardDescription>
            <CardTitle>{funnel?.restaurants_with_paid_subscription ?? 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Assinaturas que já pagaram</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Conversão para pago</CardDescription>
            <CardTitle>{Number(funnel?.conversion_to_paid_pct ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Pago / atribuídos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Comissão gerada</CardDescription>
            <CardTitle>{formatCentsToBrl(funnel?.commission_generated_cents ?? 0)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Exceto estornos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Comissão paga</CardDescription>
            <CardTitle>{formatCentsToBrl(funnel?.commission_paid_cents ?? 0)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Total já liquidado</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Saques pendentes</CardDescription>
            <CardTitle>{pendingPayoutCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Total: {formatCentsToBrl(pendingPayoutTotalCents)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Comissões em carência</CardDescription>
            <CardTitle>{commissionsByStatus.pending ?? 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Base: últimas 50 comissões</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Comissões aprovadas</CardDescription>
            <CardTitle>{commissionsByStatus.approved ?? 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Disponíveis para saque</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Comissões pagas</CardDescription>
            <CardTitle>{commissionsByStatus.paid ?? 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Pagamentos concluídos</p>
          </CardContent>
        </Card>
      </div>
      <div className="flex justify-end">
        <Button variant="outline" onClick={handleMatureAll}>
          Processar carências e notificar
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Saques pendentes</CardTitle>
          <CardDescription>Confirme o PIX manualmente e marque como pago.</CardDescription>
        </CardHeader>
        <CardContent>
          {(snapshot?.pending_payouts?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma solicitação pendente.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Afiliado</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>PIX</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snapshot?.pending_payouts.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.affiliate_code ?? row.user_id.slice(0, 8)}</TableCell>
                    <TableCell>{formatCentsToBrl(row.amount_cents)}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{row.pix_key ?? "—"}</TableCell>
                    <TableCell className="space-x-2">
                      <Button size="sm" onClick={() => handlePayout(row.id, true)}>
                        Marcar pago
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handlePayout(row.id, false)}>
                        Rejeitar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Comissões recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {recentCommissions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma comissão registrada ainda.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Afiliado</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentCommissions.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.referral_code ?? "—"}</TableCell>
                    <TableCell>{formatCentsToBrl(row.commission_amount_cents)}</TableCell>
                    <TableCell>{commissionStatusLabel[row.status] ?? row.status}</TableCell>
                    <TableCell>{new Date(row.created_at).toLocaleDateString("pt-BR")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top afiliados</CardTitle>
          <CardDescription>
            Ranking por comissão gerada.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {topAffiliates.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ainda não há afiliados com performance acumulada.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Afiliado</TableHead>
                  <TableHead>Atribuídos</TableHead>
                  <TableHead>Com pagamento</TableHead>
                  <TableHead>Gerado</TableHead>
                  <TableHead>Pago</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topAffiliates.map((row) => (
                  <TableRow key={row.user_id}>
                    <TableCell>{row.display_name || row.referral_code}</TableCell>
                    <TableCell>{row.attributed_restaurants}</TableCell>
                    <TableCell>{row.paying_restaurants}</TableCell>
                    <TableCell>{formatCentsToBrl(row.generated_commission_cents)}</TableCell>
                    <TableCell>{formatCentsToBrl(row.paid_commission_cents)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function AdminReferralMaterials() {
  const [materials, setMaterials] = useState<AffiliateCampaignMaterial[]>([]);
  const [draft, setDraft] = useState<AffiliateMaterialDraft>(emptyMaterialDraft());
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const reload = useCallback(async () => {
    const snapshot = await fetchReferralAdminSnapshot();
    setMaterials(snapshot.materials ?? []);
  }, []);

  useEffect(() => {
    reload().catch((error) => {
      toast.error(error instanceof Error ? error.message : "Erro ao carregar materiais.");
    });
  }, [reload]);

  const handleSave = async () => {
    if (!draft.title.trim()) {
      toast.error("Informe o título do material.");
      return;
    }
    setSaving(true);
    try {
      await saveAffiliateCampaignMaterial(draft);
      toast.success("Material salvo.");
      setDraft(emptyMaterialDraft());
      await reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar material.");
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const path = await uploadAffiliateCampaignAsset(file);
      setDraft((d) => ({ ...d, storage_path: path }));
      toast.success("Arquivo enviado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro no upload.");
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (material: AffiliateCampaignMaterial) => {
    setDraft({
      id: material.id,
      title: material.title,
      description: material.description ?? "",
      category: material.category,
      material_type: material.material_type,
      storage_path: material.storage_path ?? undefined,
      external_url: material.external_url ?? undefined,
      copy_template: material.copy_template ?? undefined,
      sort_order: material.sort_order,
      is_active: material.is_active ?? true,
    });
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAffiliateCampaignMaterial(id);
      toast.success("Material removido.");
      await reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao remover.");
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>{draft.id ? "Editar material" : "Novo material"}</CardTitle>
          <CardDescription>Use {"{{ref_link}}"} e {"{{ref_code}}"} nos textos.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label>Título</Label>
            <Input value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select
              value={draft.material_type}
              onValueChange={(value) =>
                setDraft((d) => ({
                  ...d,
                  material_type: value as AffiliateMaterialDraft["material_type"],
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="copy">Texto copiável</SelectItem>
                <SelectItem value="image">Imagem</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="video_link">Link de vídeo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {draft.material_type === "copy" ? (
            <div className="space-y-2">
              <Label>Texto modelo</Label>
              <Textarea
                rows={4}
                value={draft.copy_template ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, copy_template: e.target.value }))}
              />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label>URL externa (opcional)</Label>
                <Input
                  value={draft.external_url ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, external_url: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Upload (bucket affiliate-campaign-assets)</Label>
                <Input type="file" onChange={(e) => handleUpload(e.target.files?.[0])} disabled={uploading} />
                {draft.storage_path ? (
                  <p className="text-xs text-muted-foreground">{draft.storage_path}</p>
                ) : null}
              </div>
            </>
          )}
          <div className="flex items-center gap-2">
            <Switch
              checked={draft.is_active}
              onCheckedChange={(v) => setDraft((d) => ({ ...d, is_active: v }))}
            />
            <Label>Ativo</Label>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Salvar material"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Materiais publicados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {materials.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum material cadastrado.</p>
          ) : (
            materials.map((material) => (
              <div key={material.id} className="flex items-center justify-between rounded border p-3">
                <div>
                  <p className="font-medium">{material.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {material.material_type} · {material.is_active ? "ativo" : "inativo"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleEdit(material)}>
                    Editar
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(material.id)}>
                    Excluir
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
