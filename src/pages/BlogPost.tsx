import { useParams, Link } from 'react-router-dom';
import { Calendar, ArrowLeft } from 'lucide-react';
import { useBlogPost } from '@/hooks/useBlogPosts';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const { post, loading } = useBlogPost(slug || '');

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-grow">
          <div className="container mx-auto px-4 py-16 max-w-4xl">
            <Skeleton className="h-8 w-32 mb-8" />
            <Skeleton className="h-12 w-3/4 mb-4" />
            <Skeleton className="h-6 w-48 mb-8" />
            <Skeleton className="h-96 w-full mb-8" />
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">Post não encontrado</h1>
            <p className="text-muted-foreground mb-8">
              O post que você está procurando não existe ou foi removido.
            </p>
            <Link to="/blog">
              <Button>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar para o blog
              </Button>
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex-grow">
        <article className="container mx-auto px-4 py-16 max-w-4xl">
          <Link to="/blog">
            <Button variant="ghost" className="mb-8 group">
              <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
              Voltar para o blog
            </Button>
          </Link>

          <header className="mb-12">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              {post.title}
            </h1>

            <div className="flex items-center gap-4 text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                <time className="text-lg">
                  {new Date(post.published_at || post.created_at).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </time>
              </div>
            </div>
          </header>

          {post.cover_image_url && (
            <div className="aspect-[21/9] overflow-hidden rounded-xl mb-12 shadow-2xl">
              <img
                src={post.cover_image_url}
                alt={post.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div 
            className="prose prose-lg prose-slate max-w-none dark:prose-invert
                       prose-headings:font-bold prose-headings:text-foreground
                       prose-h2:text-3xl prose-h2:mt-12 prose-h2:mb-6
                       prose-h3:text-2xl prose-h3:mt-8 prose-h3:mb-4
                       prose-p:text-muted-foreground prose-p:leading-relaxed prose-p:mb-6
                       prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                       prose-strong:text-foreground prose-strong:font-semibold
                       prose-img:rounded-lg prose-img:shadow-lg
                       prose-code:text-primary prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded
                       prose-pre:bg-muted prose-pre:border
                       prose-ul:my-6 prose-li:my-2
                       prose-blockquote:border-l-primary prose-blockquote:bg-muted/50 prose-blockquote:py-1"
          >
            <div
              dangerouslySetInnerHTML={{ __html: post.content }}
              className="whitespace-pre-wrap"
            />
          </div>
        </article>
      </div>
      <Footer />
    </div>
  );
}
