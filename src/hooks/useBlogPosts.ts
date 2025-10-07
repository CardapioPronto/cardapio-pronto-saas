import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BlogPost, BlogPostFormData } from '@/types/blog';
import { toast } from 'sonner';

export const useBlogPosts = (includeUnpublished = false) => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('blog_posts')
        .select('*')
        .order('published_at', { ascending: false, nullsFirst: false });

      if (!includeUnpublished) {
        query = query.eq('is_published', true);
      }

      const { data, error } = await query;

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Erro ao buscar posts:', error);
      toast.error('Erro ao carregar posts do blog');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [includeUnpublished]);

  return { posts, loading, refetch: fetchPosts };
};

export const useBlogPost = (slug: string) => {
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('blog_posts')
          .select('*')
          .eq('slug', slug)
          .single();

        if (error) throw error;
        setPost(data);
      } catch (error) {
        console.error('Erro ao buscar post:', error);
        toast.error('Post não encontrado');
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchPost();
    }
  }, [slug]);

  return { post, loading };
};

export const createBlogPost = async (data: BlogPostFormData): Promise<BlogPost | null> => {
  try {
    const slug = data.title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const { data: user } = await supabase.auth.getUser();

    const postData = {
      ...data,
      slug,
      author_id: user.user?.id,
      published_at: data.is_published ? new Date().toISOString() : null,
    };

    const { data: newPost, error } = await supabase
      .from('blog_posts')
      .insert(postData)
      .select()
      .single();

    if (error) throw error;

    toast.success('Post criado com sucesso!');
    return newPost;
  } catch (error: any) {
    console.error('Erro ao criar post:', error);
    toast.error(error.message || 'Erro ao criar post');
    return null;
  }
};

export const updateBlogPost = async (id: string, data: Partial<BlogPostFormData>): Promise<boolean> => {
  try {
    const updateData: any = { ...data };

    if (data.title) {
      updateData.slug = data.title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    }

    if (data.is_published !== undefined) {
      const { data: currentPost } = await supabase
        .from('blog_posts')
        .select('is_published, published_at')
        .eq('id', id)
        .single();

      if (data.is_published && !currentPost?.is_published) {
        updateData.published_at = new Date().toISOString();
      }
    }

    const { error } = await supabase
      .from('blog_posts')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;

    toast.success('Post atualizado com sucesso!');
    return true;
  } catch (error: any) {
    console.error('Erro ao atualizar post:', error);
    toast.error(error.message || 'Erro ao atualizar post');
    return false;
  }
};

export const deleteBlogPost = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('blog_posts')
      .delete()
      .eq('id', id);

    if (error) throw error;

    toast.success('Post excluído com sucesso!');
    return true;
  } catch (error: any) {
    console.error('Erro ao excluir post:', error);
    toast.error(error.message || 'Erro ao excluir post');
    return false;
  }
};
