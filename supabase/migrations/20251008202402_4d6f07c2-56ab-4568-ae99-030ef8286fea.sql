-- Add category field to blog_posts
ALTER TABLE public.blog_posts 
ADD COLUMN category TEXT;

-- Create index for category filtering
CREATE INDEX idx_blog_posts_category ON public.blog_posts(category, published_at DESC) WHERE is_published = true;

-- Add some default categories to existing posts
UPDATE public.blog_posts 
SET category = CASE 
  WHEN title LIKE '%Digital%' OR title LIKE '%Cardápio%' THEN 'Tecnologia'
  WHEN title LIKE '%Gestão%' OR title LIKE '%Gerenciar%' THEN 'Gestão'
  WHEN title LIKE '%QR Code%' THEN 'Inovação'
  WHEN title LIKE '%Analytics%' OR title LIKE '%Relatórios%' THEN 'Análise'
  ELSE 'Dicas'
END
WHERE category IS NULL;