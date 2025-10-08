import { Link } from 'react-router-dom';
import { Calendar, ArrowRight, Star } from 'lucide-react';
import { useBlogPosts } from '@/hooks/useBlogPosts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function Blog() {
  const { posts, loading } = useBlogPosts(false);

  const featuredPosts = posts.filter(post => post.is_featured).slice(0, 3);
  const regularPosts = posts.filter(post => !post.is_featured);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-grow">
          <div className="container mx-auto px-4 py-16">
            <div className="text-center mb-12">
              <Skeleton className="h-12 w-64 mx-auto mb-4" />
              <Skeleton className="h-6 w-96 mx-auto" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <Skeleton className="h-48 w-full" />
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-full" />
                  </CardHeader>
                </Card>
              ))}
            </div>
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
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-primary/10 via-background to-background py-20">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto">
              <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Blog CardápioPronto
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground">
                Novidades, dicas e insights sobre gestão de restaurantes, tecnologia e inovação
              </p>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-16">

          {posts.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-lg text-muted-foreground">Nenhum post publicado ainda.</p>
            </div>
          ) : (
            <>
              {/* Featured Posts */}
              {featuredPosts.length > 0 && (
                <div className="mb-20">
                  <div className="flex items-center gap-3 mb-8">
                    <Star className="h-6 w-6 text-primary fill-primary" />
                    <h2 className="text-3xl md:text-4xl font-bold">Posts em Destaque</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {featuredPosts.map((post) => (
                      <Card key={post.id} className="group overflow-hidden hover:shadow-2xl transition-all duration-300 border-primary/20 bg-card">
                        {post.cover_image_url && (
                          <div className="aspect-[16/10] overflow-hidden relative">
                            <Badge className="absolute top-4 right-4 z-10 bg-primary text-primary-foreground">
                              <Star className="h-3 w-3 mr-1 fill-current" />
                              Destaque
                            </Badge>
                            <img
                              src={post.cover_image_url}
                              alt={post.title}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                          </div>
                        )}
                        <CardHeader className="space-y-3">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <time>
                              {new Date(post.published_at || post.created_at).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: 'long',
                                year: 'numeric'
                              })}
                            </time>
                          </div>
                          <CardTitle className="text-2xl line-clamp-2 group-hover:text-primary transition-colors">
                            <Link to={`/blog/${post.slug}`}>{post.title}</Link>
                          </CardTitle>
                          <CardDescription className="line-clamp-3 text-base">
                            {post.excerpt || post.content.substring(0, 150) + '...'}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Link to={`/blog/${post.slug}`}>
                            <Button variant="ghost" className="w-full group/btn">
                              Ler artigo completo
                              <ArrowRight className="ml-2 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                            </Button>
                          </Link>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </div>
            )}

              {/* Regular Posts */}
              {regularPosts.length > 0 && (
                <div>
                  <h2 className="text-3xl md:text-4xl font-bold mb-8">Todos os Artigos</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {regularPosts.map((post) => (
                      <Card key={post.id} className="group overflow-hidden hover:shadow-xl transition-all duration-300 bg-card">
                        {post.cover_image_url && (
                          <div className="aspect-[16/10] overflow-hidden">
                            <img
                              src={post.cover_image_url}
                              alt={post.title}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                          </div>
                        )}
                        <CardHeader className="space-y-3">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <time>
                              {new Date(post.published_at || post.created_at).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: 'long',
                                year: 'numeric'
                              })}
                            </time>
                          </div>
                          <CardTitle className="text-xl line-clamp-2 group-hover:text-primary transition-colors">
                            <Link to={`/blog/${post.slug}`}>{post.title}</Link>
                          </CardTitle>
                          <CardDescription className="line-clamp-3">
                            {post.excerpt || post.content.substring(0, 150) + '...'}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Link to={`/blog/${post.slug}`}>
                            <Button variant="ghost" className="w-full group/btn">
                              Ler mais
                              <ArrowRight className="ml-2 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                            </Button>
                          </Link>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
