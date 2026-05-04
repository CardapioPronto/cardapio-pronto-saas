import { useEffect, useMemo, useState } from "react";
import type { ElementType } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  FileJson,
  KeyRound,
  Loader2,
  MessageCircle,
  RefreshCw,
  Server,
  Shield,
  Workflow,
} from "lucide-react";
import { toast } from "sonner";

const db = supabase as any;

const N8N_ENV_VARS = [
  "EVOLUTION_API_URL",
  "EVOLUTION_API_KEY",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "PUBLIC_SITE_URL",
  "N8N_INTERNAL_API_KEY",
  "GROQ_API_KEY ou OPENAI_API_KEY",
];

const EDGE_SECRETS = [
  "EVOLUTION_API_URL",
  "EVOLUTION_API_KEY",
  "N8N_WEBHOOK_URL",
  "N8N_INTERNAL_API_KEY",
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];

const WORKFLOW_FILES = [
  "docs/Evolution_Whatsapp_Generic_N8N_Groq.json",
  "docs/Evolution_Whatsapp_Generic_N8N.json",
];

interface InstanceHealth {
  id: string;
  instance_name: string;
  restaurant_id: string;
  restaurant_name: string;
  phone_number: string | null;
  status: string;
  webhook_url: string | null;
  automation_enabled: boolean;
  updated_at: string;
}

interface AutomationRow {
  instance_id: string;
  ai_enabled: boolean;
}

const AdminWhatsApp = () => {
  const [instances, setInstances] = useState<InstanceHealth[]>([]);
  const [automation, setAutomation] = useState<AutomationRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHealth();
  }, []);

  const loadHealth = async () => {
    setLoading(true);
    try {
      const [{ data: instanceRows, error: instancesError }, { data: automationRows, error: automationError }] =
        await Promise.all([
          db
            .from("whatsapp_instances")
            .select("id, instance_name, restaurant_id, phone_number, status, webhook_url, automation_enabled, updated_at, restaurants(name)")
            .order("updated_at", { ascending: false })
            .limit(50),
          db
            .from("automation_settings")
            .select("instance_id, ai_enabled"),
        ]);

      if (instancesError) throw instancesError;
      if (automationError) throw automationError;

      setInstances((instanceRows || []).map((row: any) => ({
        id: row.id,
        instance_name: row.instance_name,
        restaurant_id: row.restaurant_id,
        restaurant_name: row.restaurants?.name || "Restaurante sem nome",
        phone_number: row.phone_number,
        status: row.status,
        webhook_url: row.webhook_url,
        automation_enabled: row.automation_enabled,
        updated_at: row.updated_at,
      })));
      setAutomation((automationRows || []) as AutomationRow[]);
    } catch (error) {
      console.error("Erro ao carregar saúde do WhatsApp:", error);
      toast.error("Erro ao carregar informações do WhatsApp");
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const aiEnabledIds = new Set(automation.filter(row => row.ai_enabled !== false).map(row => row.instance_id));
    return {
      total: instances.length,
      connected: instances.filter(instance => instance.status === "CONNECTED").length,
      webhookReady: instances.filter(instance => Boolean(instance.webhook_url)).length,
      automationReady: instances.filter(instance => instance.automation_enabled !== false && aiEnabledIds.has(instance.id)).length,
    };
  }, [instances, automation]);

  const getStatusBadge = (status: string) => {
    if (status === "CONNECTED") return <Badge className="bg-emerald-600">Conectada</Badge>;
    if (status === "CONNECTING") return <Badge variant="secondary">Conectando</Badge>;
    if (status === "ERROR") return <Badge variant="destructive">Erro</Badge>;
    return <Badge variant="outline">{status}</Badge>;
  };

  return (
    <AdminLayout title="WhatsApp e Automação">
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">WhatsApp e Automação</h1>
            <p className="text-muted-foreground">
              Configurações técnicas e acompanhamento geral da integração Evolution API + n8n.
            </p>
          </div>
          <Button variant="outline" onClick={loadHealth} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Atualizar
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <HealthCard icon={MessageCircle} label="Instâncias" value={stats.total} />
          <HealthCard icon={CheckCircle2} label="Conectadas" value={stats.connected} />
          <HealthCard icon={Workflow} label="Webhook configurado" value={stats.webhookReady} />
          <HealthCard icon={Bot} label="IA pronta" value={stats.automationReady} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Server className="h-5 w-5" />
                Variáveis do n8n
              </CardTitle>
              <CardDescription>
                Devem existir no ambiente do container n8n. Os valores não são exibidos no sistema.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EnvList values={N8N_ENV_VARS} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <KeyRound className="h-5 w-5" />
                Secrets das Edge Functions
              </CardTitle>
              <CardDescription>
                Devem estar configurados nos secrets do Supabase para uso interno da plataforma.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EnvList values={EDGE_SECRETS} />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-5 w-5" />
              Checklist de produção
            </CardTitle>
            <CardDescription>Itens técnicos que ficam sob responsabilidade da administração da plataforma.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <ChecklistItem title="Workflow ativo no n8n" description="Importar um dos fluxos oficiais, publicar e usar a URL de produção do webhook." />
            <ChecklistItem title="Logs protegidos" description="Manter retenção curta no n8n e evitar salvar payloads completos de erro com credenciais." />
            <ChecklistItem title="Secrets fora do frontend" description="Evolution, Supabase service role e chaves de IA devem ficar apenas em n8n/Supabase." />
            <ChecklistItem title="Webhook padrão" description="N8N_WEBHOOK_URL deve apontar para o endpoint público de produção do n8n." />
            <ChecklistItem title="Funções implantadas" description="evolution-api, whatsapp-n8n-context, whatsapp-n8n-evolution e persist-outgoing precisam estar publicadas." />
            <ChecklistItem title="IA configurada por loja" description="O cliente ajusta persona, mensagens, horários e handoff na aba Automação do atendimento." />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileJson className="h-5 w-5" />
              Workflows oficiais
            </CardTitle>
            <CardDescription>Arquivos mantidos no repositório para importação no n8n.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {WORKFLOW_FILES.map(file => (
                <Badge key={file} variant="secondary" className="font-mono">
                  {file}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Saúde das instâncias</CardTitle>
            <CardDescription>
              Últimas instâncias criadas pelos estabelecimentos, sem exibir chaves ou URLs sensíveis.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : instances.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground">Nenhuma instância encontrada.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Instância</TableHead>
                    <TableHead>Restaurante</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Webhook</TableHead>
                    <TableHead>Automação</TableHead>
                    <TableHead>Atualizada em</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {instances.map(instance => (
                    <TableRow key={instance.id}>
                      <TableCell className="font-medium">{instance.instance_name}</TableCell>
                      <TableCell>{instance.restaurant_name}</TableCell>
                      <TableCell>{instance.phone_number || "Não conectado"}</TableCell>
                      <TableCell>{getStatusBadge(instance.status)}</TableCell>
                      <TableCell>
                        {instance.webhook_url ? (
                          <Badge className="bg-emerald-600">Configurado</Badge>
                        ) : (
                          <Badge variant="secondary">Pendente</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {instance.automation_enabled ? (
                          <Badge variant="default">Ativa</Badge>
                        ) : (
                          <Badge variant="outline">Pausada</Badge>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {new Date(instance.updated_at).toLocaleString("pt-BR")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

interface HealthCardProps {
  icon: ElementType;
  label: string;
  value: number;
}

const HealthCard = ({ icon: Icon, label, value }: HealthCardProps) => (
  <Card>
    <CardContent className="flex items-center gap-3 p-4">
      <div className="rounded-md bg-muted p-2">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <div>
        <p className="text-2xl font-semibold">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </CardContent>
  </Card>
);

const EnvList = ({ values }: { values: string[] }) => (
  <div className="flex flex-wrap gap-2">
    {values.map(value => (
      <Badge key={value} variant="secondary" className="font-mono text-xs">
        {value}
      </Badge>
    ))}
  </div>
);

const ChecklistItem = ({ title, description }: { title: string; description: string }) => (
  <div className="flex items-start gap-3 rounded-md border p-3">
    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
    <div>
      <p className="text-sm font-medium">{title}</p>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  </div>
);

export default AdminWhatsApp;
