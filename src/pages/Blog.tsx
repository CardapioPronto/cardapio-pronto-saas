import { Link } from 'react-router-dom';
import { Calendar, ArrowRight, Tag } from 'lucide-react';
import { useBlogPosts } from '@/hooks/useBlogPosts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function Blog() {
  const { posts, loading } = useBlogPosts(false);

  const featuredPost = posts.find(post => post.is_featured);
  const otherFeaturedPosts = posts.filter(post => post.is_featured && post.id !== featuredPost?.id).slice(0, 2);
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
              {/* Main Featured Post */}
              {featuredPost && (
                <div className="mb-16">
                  <Card className="group overflow-hidden border-none shadow-2xl bg-card">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                      {featuredPost.cover_image_url && (
                        <div className="aspect-[16/12] lg:aspect-auto overflow-hidden relative">
                          <Badge className="absolute top-6 right-6 z-10 bg-primary text-primary-foreground px-4 py-2 text-sm">
                            Destaque Principal
                          </Badge>
                          <img
                            src={featuredPost.cover_image_url}
                            alt={featuredPost.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                          />
                        </div>
                      )}
                      <div className="p-8 lg:p-12 flex flex-col justify-center">
                        <div className="space-y-6">
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              <time>
                                {new Date(featuredPost.published_at || featuredPost.created_at).toLocaleDateString('pt-BR', {
                                  day: '2-digit',
                                  month: 'long',
                                  year: 'numeric'
                                })}
                              </time>
                            </div>
                            {featuredPost.category && (
                              <Badge variant="secondary" className="gap-1">
                                <Tag className="h-3 w-3" />
                                {featuredPost.category}
                              </Badge>
                            )}
                          </div>
                          <CardTitle className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight group-hover:text-primary transition-colors">
                            <Link to={`/blog/${featuredPost.slug}`}>{featuredPost.title}</Link>
                          </CardTitle>
                          <CardDescription className="text-lg leading-relaxed">
                            {featuredPost.excerpt || featuredPost.content.substring(0, 200) + '...'}
                          </CardDescription>
                          <Link to={`/blog/${featuredPost.slug}`}>
                            <Button size="lg" className="mt-4 group/btn">
                              Ler artigo completo
                              <ArrowRight className="ml-2 h-5 w-5 group-hover/btn:translate-x-1 transition-transform" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              )}

              {/* Secondary Featured Posts */}
              {otherFeaturedPosts.length > 0 && (
                <div className="mb-16">
                  <h2 className="text-2xl md:text-3xl font-bold mb-8">Mais em Destaque</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {otherFeaturedPosts.map((post) => (
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
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              <time>
                                {new Date(post.published_at || post.created_at).toLocaleDateString('pt-BR', {
                                  day: '2-digit',
                                  month: 'long',
                                  year: 'numeric'
                                })}
                              </time>
                            </div>
                            {post.category && (
                              <Badge variant="secondary" className="gap-1">
                                <Tag className="h-3 w-3" />
                                {post.category}
                              </Badge>
                            )}
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

              {/* Regular Posts */}
              {regularPosts.length > 0 && (
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold mb-8">Todos os Artigos</h2>
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
                          <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              <time>
                                {new Date(post.published_at || post.created_at).toLocaleDateString('pt-BR', {
                                  day: '2-digit',
                                  month: 'long',
                                  year: 'numeric'
                                })}
                              </time>
                            </div>
                            {post.category && (
                              <Badge variant="secondary" className="gap-1">
                                <Tag className="h-3 w-3" />
                                {post.category}
                              </Badge>
                            )}
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
