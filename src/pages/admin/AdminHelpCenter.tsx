import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import AdminLayout from "@/components/admin/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  deleteHelpArticle,
  listHelpArticles,
  saveHelpArticle,
  slugifyHelpTitle,
  type HelpArticle,
} from "@/services/helpCenterService";

const emptyForm = {
  title: "",
  slug: "",
  summary: "",
  content: "",
  category: "geral",
  keywords: "",
  order_position: 0,
  is_featured: false,
  published: true,
};

type FormState = typeof emptyForm;

export default function AdminHelpCenter() {
  const [articles, setArticles] = useState<HelpArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setArticles(await listHelpArticles(true));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao carregar artigos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (article: HelpArticle) => {
    setEditingId(article.id);
    setForm({
      title: article.title,
      slug: article.slug,
      summary: article.summary ?? "",
      content: article.content,
      category: article.category,
      keywords: article.keywords.join(", "),
      order_position: article.order_position,
      is_featured: article.is_featured,
      published: article.published,
    });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      toast.error("Título e conteúdo são obrigatórios.");
      return;
    }
    setSaving(true);
    try {
      await saveHelpArticle(
        {
          title: form.title.trim(),
          slug: form.slug.trim() || slugifyHelpTitle(form.title),
          summary: form.summary.trim() || null,
          content: form.content,
          category: form.category.trim() || "geral",
          keywords: form.keywords
            .split(",")
            .map((keyword) => keyword.trim())
            .filter(Boolean),
          order_position: Number(form.order_position) || 0,
          is_featured: form.is_featured,
          published: form.published,
        },
        editingId,
      );
      toast.success(editingId ? "Artigo atualizado." : "Artigo criado.");
      setOpen(false);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao salvar artigo");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (article: HelpArticle) => {
    try {
      await deleteHelpArticle(article.id);
      toast.success("Artigo removido.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao remover artigo");
    }
  };

  return (
    <AdminLayout title="Central de Ajuda">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Central de Ajuda</h1>
            <p className="text-muted-foreground">
              Crie e publique artigos exibidos em <code>/ajuda</code> para os restaurantes.
            </p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Novo artigo
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Artigos ({articles.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="py-6 text-center text-muted-foreground">Carregando...</p>
            ) : articles.length === 0 ? (
              <p className="py-6 text-center text-muted-foreground">Nenhum artigo cadastrado.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Ordem</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {articles.map((article) => (
                    <TableRow key={article.id}>
                      <TableCell className="font-medium">
                        {article.title}
                        <span className="block text-xs text-muted-foreground">{article.slug}</span>
                      </TableCell>
                      <TableCell className="capitalize">{article.category.replace(/-/g, " ")}</TableCell>
                      <TableCell>{article.order_position}</TableCell>
                      <TableCell>
                        <Badge variant={article.published ? "default" : "secondary"}>
                          {article.published ? "Publicado" : "Rascunho"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(article)}>
                          <Pencil className="h-4 w-4" />
                          <span className="sr-only">Editar</span>
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(article)}>
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Excluir</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar artigo" : "Novo artigo"}</DialogTitle>
            <DialogDescription>
              O conteúdo aceita texto simples com quebras de linha e listas numeradas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="help-title">Título</Label>
              <Input
                id="help-title"
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="help-slug">Slug</Label>
                <Input
                  id="help-slug"
                  value={form.slug}
                  placeholder={slugifyHelpTitle(form.title) || "identificador-do-artigo"}
                  onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="help-category">Categoria</Label>
                <Input
                  id="help-category"
                  value={form.category}
                  onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="help-summary">Resumo</Label>
              <Input
                id="help-summary"
                value={form.summary}
                onChange={(event) => setForm((prev) => ({ ...prev, summary: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="help-content">Conteúdo</Label>
              <Textarea
                id="help-content"
                rows={10}
                value={form.content}
                onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="help-keywords">Palavras-chave (separadas por vírgula)</Label>
                <Input
                  id="help-keywords"
                  value={form.keywords}
                  onChange={(event) => setForm((prev) => ({ ...prev, keywords: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="help-order">Ordem</Label>
                <Input
                  id="help-order"
                  type="number"
                  value={form.order_position}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, order_position: Number(event.target.value) }))
                  }
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  id="help-published"
                  checked={form.published}
                  onCheckedChange={(checked) => setForm((prev) => ({ ...prev, published: checked }))}
                />
                <Label htmlFor="help-published">Publicado</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="help-featured"
                  checked={form.is_featured}
                  onCheckedChange={(checked) => setForm((prev) => ({ ...prev, is_featured: checked }))}
                />
                <Label htmlFor="help-featured">Destaque</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
