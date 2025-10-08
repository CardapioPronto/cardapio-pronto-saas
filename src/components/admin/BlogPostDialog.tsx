import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createBlogPost, updateBlogPost } from '@/hooks/useBlogPosts';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const CATEGORIES = ['Tecnologia', 'Gestão', 'Inovação', 'Análise', 'Dicas', 'Marketing', 'Tendências'];

const blogPostSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório').max(200, 'Título muito longo'),
  content: z.string().min(1, 'Conteúdo é obrigatório'),
  excerpt: z.string().max(500, 'Resumo muito longo').optional(),
  cover_image_url: z.string().url('URL inválida').optional().or(z.literal('')),
  category: z.string().optional(),
  is_published: z.boolean(),
  is_featured: z.boolean(),
});

type BlogPostFormData = z.infer<typeof blogPostSchema>;

interface BlogPostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post?: any;
}

export function BlogPostDialog({ open, onOpenChange, post }: BlogPostDialogProps) {
  const form = useForm<BlogPostFormData>({
    resolver: zodResolver(blogPostSchema),
    defaultValues: {
      title: '',
      content: '',
      excerpt: '',
      cover_image_url: '',
      category: '',
      is_published: false,
      is_featured: false,
    },
  });

  useEffect(() => {
    if (post) {
      form.reset({
        title: post.title,
        content: post.content,
        excerpt: post.excerpt || '',
        cover_image_url: post.cover_image_url || '',
        category: post.category || '',
        is_published: post.is_published,
        is_featured: post.is_featured,
      });
    } else {
      form.reset({
        title: '',
        content: '',
        excerpt: '',
        cover_image_url: '',
        category: '',
        is_published: false,
        is_featured: false,
      });
    }
  }, [post, form]);

  const onSubmit = async (data: BlogPostFormData) => {
    const formData = {
      ...data,
      excerpt: data.excerpt || undefined,
      cover_image_url: data.cover_image_url || undefined,
      category: data.category || undefined,
    };

    let success = false;
    if (post) {
      success = await updateBlogPost(post.id, formData);
    } else {
      const result = await createBlogPost(formData);
      success = !!result;
    }

    if (success) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{post ? 'Editar Post' : 'Novo Post'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Digite o título do post" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="excerpt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Resumo (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Breve descrição do post"
                      rows={2}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cover_image_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL da Imagem de Capa (opcional)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="https://exemplo.com/imagem.jpg" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria (opcional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Conteúdo</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Escreva o conteúdo do post..."
                      rows={15}
                      className="font-mono"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_published"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Publicar post</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      O post ficará visível publicamente
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_featured"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Post em destaque</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      O post aparecerá na seção de destaques
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit">
                {post ? 'Atualizar' : 'Criar'} Post
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
