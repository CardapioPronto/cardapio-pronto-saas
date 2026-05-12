import { Link } from 'react-router-dom';
import { Calendar, ArrowRight, Tag, BookOpen, Sparkles, TrendingUp } from 'lucide-react';
import { useBlogPosts } from '@/hooks/useBlogPosts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const formatDate = (value: string | null | undefined) =>
  new Date(value || Date.now()).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

const readingTime = (content: string) =>
  `${Math.max(2, Math.ceil(content.split(/\s+/).length / 180))} min de leitura`;

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
      <div className="flex-grow pt-20">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-navy via-navy to-green/90 py-20 text-white">
          <div className="absolute -right-28 top-8 h-80 w-80 rounded-full bg-orange/25 blur-3xl" />
          <div className="absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-green/25 blur-3xl" />
          <div className="container relative mx-auto px-6">
            <div className="mx-auto max-w-4xl text-center">
              <Badge className="mb-5 border-white/20 bg-white/10 text-white hover:bg-white/15">
                Inteligência para restaurantes
              </Badge>
              <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
                Ideias práticas para vender melhor e operar com mais controle.
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/75 md:text-xl">
                Conteúdos sobre cardápio digital, PDV, gestão, atendimento,
                delivery, tecnologia e bastidores da construção da Pubfy.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3 text-sm text-white/80">
                {['Gestão', 'Operação', 'Marketing', 'Tecnologia'].map((topic) => (
                  <span key={topic} className="rounded-full border border-white/15 bg-white/10 px-4 py-2">
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <div className="container mx-auto px-6 py-16">

          {posts.length === 0 ? (
            <div className="mx-auto max-w-xl rounded-3xl border border-beige bg-white p-10 text-center shadow-sm">
              <BookOpen className="mx-auto mb-4 h-10 w-10 text-green" />
              <h2 className="text-2xl font-bold text-navy">Conteúdos em preparação</h2>
              <p className="mt-3 text-muted-foreground">
                Estamos organizando guias e materiais práticos para restaurantes.
                Em breve os primeiros artigos estarão disponíveis aqui.
              </p>
            </div>
          ) : (
            <>
              {/* Main Featured Post */}
              {featuredPost && (
                <div className="mb-16">
                  <div className="mb-6 flex items-center gap-3">
                    <Sparkles className="h-5 w-5 text-orange" />
                    <h2 className="text-2xl font-bold text-navy">Leitura recomendada</h2>
                  </div>
                  <Card className="group overflow-hidden border-beige bg-white shadow-2xl">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                      {featuredPost.cover_image_url && (
                        <div className="aspect-[16/12] lg:aspect-auto overflow-hidden relative">
                          <Badge className="absolute top-6 right-6 z-10 bg-orange text-white px-4 py-2 text-sm">
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
                          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              <time>{formatDate(featuredPost.published_at || featuredPost.created_at)}</time>
                            </div>
                            <span>{readingTime(featuredPost.content)}</span>
                            {featuredPost.category && (
                              <Badge variant="secondary" className="gap-1">
                                <Tag className="h-3 w-3" />
                                {featuredPost.category}
                              </Badge>
                            )}
                          </div>
                          <CardTitle className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight text-navy group-hover:text-green transition-colors">
                            <Link to={`/blog/${featuredPost.slug}`}>{featuredPost.title}</Link>
                          </CardTitle>
                          <CardDescription className="text-lg leading-relaxed">
                            {featuredPost.excerpt || featuredPost.content.substring(0, 200) + '...'}
                          </CardDescription>
                          <Link to={`/blog/${featuredPost.slug}`}>
                            <Button size="lg" className="mt-4 group/btn bg-green text-white hover:bg-green-dark">
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
                  <div className="mb-8 flex items-center gap-3">
                    <TrendingUp className="h-5 w-5 text-green" />
                    <h2 className="text-2xl md:text-3xl font-bold text-navy">Mais em destaque</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {otherFeaturedPosts.map((post) => (
                      <Card key={post.id} className="group overflow-hidden border-beige bg-white hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
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
                          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              <time>{formatDate(post.published_at || post.created_at)}</time>
                            </div>
                            <span>{readingTime(post.content)}</span>
                            {post.category && (
                              <Badge variant="secondary" className="gap-1">
                                <Tag className="h-3 w-3" />
                                {post.category}
                              </Badge>
                            )}
                          </div>
                          <CardTitle className="text-2xl line-clamp-2 text-navy group-hover:text-green transition-colors">
                            <Link to={`/blog/${post.slug}`}>{post.title}</Link>
                          </CardTitle>
                          <CardDescription className="line-clamp-3 text-base">
                            {post.excerpt || post.content.substring(0, 150) + '...'}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Link to={`/blog/${post.slug}`}>
                            <Button variant="ghost" className="w-full group/btn text-green hover:text-green-dark">
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
                  <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h2 className="text-2xl md:text-3xl font-bold text-navy">Todos os artigos</h2>
                      <p className="mt-2 text-muted-foreground">Escolha uma leitura rápida para melhorar uma parte da operação.</p>
                    </div>
                    <Badge variant="outline">{regularPosts.length} publicações</Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {regularPosts.map((post) => (
                      <Card key={post.id} className="group overflow-hidden border-beige bg-white hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
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
                              <time>{formatDate(post.published_at || post.created_at)}</time>
                            </div>
                            <span>{readingTime(post.content)}</span>
                            {post.category && (
                              <Badge variant="secondary" className="gap-1">
                                <Tag className="h-3 w-3" />
                                {post.category}
                              </Badge>
                            )}
                          </div>
                          <CardTitle className="text-xl line-clamp-2 text-navy group-hover:text-green transition-colors">
                            <Link to={`/blog/${post.slug}`}>{post.title}</Link>
                          </CardTitle>
                          <CardDescription className="line-clamp-3">
                            {post.excerpt || post.content.substring(0, 150) + '...'}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Link to={`/blog/${post.slug}`}>
                            <Button variant="ghost" className="w-full group/btn text-green hover:text-green-dark">
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
