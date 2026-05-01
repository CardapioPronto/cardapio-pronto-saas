import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye, History, RefreshCw, Search, Settings, Store, UserRound } from "lucide-react";
import { useAuditoriaConfiguracoes } from "@/hooks/configuracoes";
import { AuditAction, AuditArea, ConfigurationAuditLog } from "@/services/configuracoes/auditoriaService";
import { Json } from "@/integrations/supabase/types";

const AREA_LABELS: Record<string, string> = {
  establishment: "Estabelecimento",
  system: "Sistema",
  user: "Usuário",
};

const ACTION_LABELS: Record<string, string> = {
  update: "Atualização",
  password_change: "Senha alterada",
};

const FIELD_LABELS: Record<string, string> = {
  name: "Nome",
  email: "E-mail",
  phone: "Telefone",
  phone_whatsapp: "WhatsApp",
  address: "Endereço",
  cnpj: "CNPJ",
  category: "Categoria",
  business_hours: "Horário de funcionamento",
  logo_url: "Logo",
  notification_new_order: "Notificação de novo pedido",
  notification_email: "Notificações por e-mail",
  dark_mode: "Modo escuro",
  auto_print: "Impressão automática",
  language: "Idioma",
  user_type: "Tipo de usuário",
  role: "Perfil",
  restaurant_id: "Restaurante",
  password: "Senha",
};

type ChangeValue = {
  from?: Json;
  to?: Json;
};

const isRecord = (value: Json | undefined): value is Record<string, Json> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));

const formatValue = (value: Json | undefined) => {
  if (value === null || value === undefined) return "Vazio";
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (typeof value === "string") return value || "Vazio";
  if (typeof value === "number") return String(value);
  return JSON.stringify(value);
};

const getAreaIcon = (area: string) => {
  if (area === "establishment") return <Store className="h-4 w-4" />;
  if (area === "system") return <Settings className="h-4 w-4" />;
  return <UserRound className="h-4 w-4" />;
};

const getChangeEntries = (changes: Json): Array<[string, ChangeValue]> => {
  if (!isRecord(changes)) return [];

  return Object.entries(changes).map(([field, value]) => {
    if (isRecord(value)) {
      return [field, { from: value.from, to: value.to }];
    }

    return [field, { to: value }];
  });
};

export const AuditoriaTab: React.FC = () => {
  const {
    logs,
    area,
    action,
    search,
    loading,
    summary,
    setArea,
    setAction,
    setSearch,
    refetch,
  } = useAuditoriaConfiguracoes();
  const [selectedLog, setSelectedLog] = useState<ConfigurationAuditLog | null>(null);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Eventos</p>
            <p className="text-xl font-semibold">{summary.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Últimas 24h</p>
            <p className="text-xl font-semibold">{summary.last24h}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Dados de usuário</p>
            <p className="text-xl font-semibold">{summary.userChanges}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Sistema</p>
            <p className="text-xl font-semibold">{summary.systemChanges}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Auditoria de Configurações
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Histórico de alterações em estabelecimento, sistema e dados de usuário.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr_180px_180px]">
            <div className="space-y-2">
              <Label htmlFor="audit-search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="audit-search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="pl-9"
                  placeholder="Pessoa, e-mail, campo ou módulo"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Área</Label>
              <Select value={area} onValueChange={(value) => setArea(value as AuditArea)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
                  <SelectItem value="establishment">Estabelecimento</SelectItem>
                  <SelectItem value="system">Sistema</SelectItem>
                  <SelectItem value="user">Usuário</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ação</Label>
              <Select value={action} onValueChange={(value) => setAction(value as AuditAction)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
                  <SelectItem value="update">Atualização</SelectItem>
                  <SelectItem value="password_change">Senha alterada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Área</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Campos</TableHead>
                <TableHead className="text-right">Detalhes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    {loading ? "Carregando auditoria..." : "Nenhum evento encontrado"}
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{formatDate(log.created_at)}</TableCell>
                    <TableCell>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{log.actor?.name || "Sistema"}</p>
                        {log.actor?.email && (
                          <p className="truncate text-xs text-muted-foreground">{log.actor.email}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1">
                        {getAreaIcon(log.area)}
                        {AREA_LABELS[log.area] || log.area}
                      </Badge>
                    </TableCell>
                    <TableCell>{ACTION_LABELS[log.action] || log.action}</TableCell>
                    <TableCell>
                      <div className="flex max-w-md flex-wrap gap-1">
                        {log.changed_fields.slice(0, 4).map((field) => (
                          <Badge key={field} variant="secondary">
                            {FIELD_LABELS[field] || field}
                          </Badge>
                        ))}
                        {log.changed_fields.length > 4 && (
                          <Badge variant="secondary">+{log.changed_fields.length - 4}</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedLog(log)}>
                        <Eye className="mr-1 h-4 w-4" />
                        Ver
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={Boolean(selectedLog)} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Detalhes da alteração</DialogTitle>
            <DialogDescription>
              {selectedLog && `${formatDate(selectedLog.created_at)} • ${AREA_LABELS[selectedLog.area] || selectedLog.area}`}
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Responsável</p>
                  <p className="font-medium">{selectedLog.actor?.name || "Sistema"}</p>
                  {selectedLog.actor?.email && <p className="text-sm text-muted-foreground">{selectedLog.actor.email}</p>}
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Alvo</p>
                  <p className="font-medium">
                    {selectedLog.targetUser?.name || AREA_LABELS[selectedLog.area] || selectedLog.entity_type}
                  </p>
                  {selectedLog.targetUser?.email && (
                    <p className="text-sm text-muted-foreground">{selectedLog.targetUser.email}</p>
                  )}
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campo</TableHead>
                    <TableHead>Antes</TableHead>
                    <TableHead>Depois</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getChangeEntries(selectedLog.changes).map(([field, change]) => (
                    <TableRow key={field}>
                      <TableCell className="font-medium">{FIELD_LABELS[field] || field}</TableCell>
                      <TableCell className="max-w-xs break-words text-muted-foreground">
                        {formatValue(change.from)}
                      </TableCell>
                      <TableCell className="max-w-xs break-words">{formatValue(change.to)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
