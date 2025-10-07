-- Add featured field to blog_posts
ALTER TABLE public.blog_posts 
ADD COLUMN is_featured BOOLEAN NOT NULL DEFAULT false;

-- Create index for featured posts
CREATE INDEX idx_blog_posts_featured ON public.blog_posts(is_featured, published_at DESC) WHERE is_published = true;