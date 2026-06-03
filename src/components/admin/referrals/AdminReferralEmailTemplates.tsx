import { useEffect, useMemo, useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/sonner-toast";
import {
  listEmailTemplates,
  saveEmailTemplate,
  type EmailTemplate,
} from "@/services/emailOperationsService";
import { REFERRAL_EMAIL_TEMPLATE_KEYS } from "@/lib/referralEmailTemplates";

export function AdminReferralEmailTemplates() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const referralTemplates = useMemo(
    () =>
      templates
        .filter((t) =>
          REFERRAL_EMAIL_TEMPLATE_KEYS.includes(
            t.template_key as (typeof REFERRAL_EMAIL_TEMPLATE_KEYS)[number],
          ),
        )
        .sort(
          (a, b) =>
            REFERRAL_EMAIL_TEMPLATE_KEYS.indexOf(
              a.template_key as (typeof REFERRAL_EMAIL_TEMPLATE_KEYS)[number],
            ) -
            REFERRAL_EMAIL_TEMPLATE_KEYS.indexOf(
              b.template_key as (typeof REFERRAL_EMAIL_TEMPLATE_KEYS)[number],
            ),
        ),
    [templates],
  );

  const selected = referralTemplates.find((t) => t.id === selectedId) ?? referralTemplates[0] ?? null;

  useEffect(() => {
    (async () => {
      try {
        const data = await listEmailTemplates("system");
        setTemplates(data);
        const first = data.find((t) =>
          REFERRAL_EMAIL_TEMPLATE_KEYS.includes(
            t.template_key as (typeof REFERRAL_EMAIL_TEMPLATE_KEYS)[number],
          ),
        );
        if (first) setSelectedId(first.id);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erro ao carregar templates.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const updateSelected = (patch: Partial<EmailTemplate>) => {
    if (!selected) return;
    setTemplates((prev) =>
      prev.map((t) => (t.id === selected.id ? { ...t, ...patch } : t)),
    );
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const saved = await saveEmailTemplate("system", {
        ...selected,
        restaurant_id: null,
      });
      setTemplates((prev) => prev.map((t) => (t.id === saved.id ? saved : t)));
      toast.success("Template salvo.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar template.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Carregando templates...</p>;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[280px,1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">E-mails do programa</CardTitle>
          <CardDescription>
            Templates globais enviados via Resend (comissão, aprovação e saque).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {referralTemplates.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => setSelectedId(template.id)}
              className={`w-full rounded-md border p-3 text-left text-sm transition-colors ${
                selected?.id === template.id ? "border-primary bg-primary/5" : "hover:bg-muted"
              }`}
            >
              <div className="font-medium">{template.name}</div>
              <div className="text-xs text-muted-foreground">{template.template_key}</div>
            </button>
          ))}
          {!referralTemplates.length ? (
            <p className="text-sm text-muted-foreground">
              Templates não encontrados. Rode a migration da fase 4 no Supabase.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Editor</CardTitle>
          <CardDescription>
            Variáveis:{" "}
            {selected?.variables?.length
              ? selected.variables.map((v) => `{{${v}}}`).join(", ")
              : "conforme template"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {selected ? (
            <>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{selected.template_key}</Badge>
                <Badge variant="secondary">{selected.category}</Badge>
              </div>
              <div className="space-y-2">
                <Label>Assunto</Label>
                <Input
                  value={selected.subject}
                  onChange={(e) => updateSelected({ subject: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>HTML</Label>
                <Textarea
                  rows={10}
                  value={selected.html_content}
                  onChange={(e) => updateSelected({ html_content: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Texto simples</Label>
                <Textarea
                  rows={4}
                  value={selected.text_content || ""}
                  onChange={(e) => updateSelected({ text_content: e.target.value })}
                />
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saving}>
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "Salvando..." : "Salvar template"}
                </Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Selecione um template.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
