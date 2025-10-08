export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  cover_image_url: string | null;
  author_id: string | null;
  is_published: boolean;
  is_featured: boolean;
  category: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BlogPostFormData {
  title: string;
  content: string;
  excerpt?: string;
  cover_image_url?: string;
  is_published: boolean;
  is_featured?: boolean;
  category?: string;
}
