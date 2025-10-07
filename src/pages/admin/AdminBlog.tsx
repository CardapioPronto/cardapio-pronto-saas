import { useState } from 'react';
import { Plus, Pencil, Trash2, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useBlogPosts, deleteBlogPost } from '@/hooks/useBlogPosts';
import AdminLayout from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { BlogPostDialog } from '@/components/admin/BlogPostDialog';

export default function AdminBlog() {
  const { posts, loading, refetch } = useBlogPosts(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleDelete = async () => {
    if (deleteId) {
      const success = await deleteBlogPost(deleteId);
      if (success) {
        refetch();
      }
      setDeleteId(null);
    }
  };

  const handleEdit = (post: any) => {
    setEditingPost(post);
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingPost(null);
    setIsDialogOpen(true);
  };

  const handleDialogClose = (shouldRefetch?: boolean) => {
    setIsDialogOpen(false);
    setEditingPost(null);
    if (shouldRefetch) {
      refetch();
    }
  };

  return (
    <AdminLayout title="Gerenciar Blog">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Gerenciar Blog</h1>
            <p className="text-muted-foreground">
              Crie e gerencie posts do blog
            </p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Post
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Posts do Blog</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Carregando...</div>
            ) : posts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum post criado ainda
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Destaque</TableHead>
                    <TableHead>Data de Publicação</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {posts.map((post) => (
                    <TableRow key={post.id}>
                      <TableCell className="font-medium">{post.title}</TableCell>
                      <TableCell>
                        <Badge variant={post.is_published ? 'default' : 'secondary'}>
                          {post.is_published ? 'Publicado' : 'Rascunho'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {post.is_featured && (
                          <Badge variant="outline" className="gap-1">
                            <Eye className="h-3 w-3" />
                            Destaque
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {post.published_at
                          ? new Date(post.published_at).toLocaleDateString('pt-BR')
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Link to={`/blog/${post.slug}`} target="_blank">
                            <Button variant="ghost" size="icon">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(post)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteId(post.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <BlogPostDialog
        open={isDialogOpen}
        onOpenChange={handleDialogClose}
        post={editingPost}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este post? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
