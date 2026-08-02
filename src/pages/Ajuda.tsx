import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { LifeBuoy, Search } from "lucide-react";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { filterHelpArticles, listHelpArticles, type HelpArticle } from "@/services/helpCenterService";

const Ajuda = () => {
  const [articles, setArticles] = useState<HelpArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [term, setTerm] = useState("");

  useEffect(() => {
    let active = true;
    listHelpArticles(false)
      .then((data) => {
        if (active) setArticles(data);
      })
      .catch(() => {
        if (active) setArticles([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const grouped = useMemo(() => {
    const filtered = filterHelpArticles(articles, term);
    const map = new Map<string, HelpArticle[]>();
    filtered.forEach((article) => {
      const list = map.get(article.category) ?? [];
      list.push(article);
      map.set(article.category, list);
    });
    return Array.from(map.entries());
  }, [articles, term]);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Central de Ajuda | Pubfy</title>
        <meta
          name="description"
          content="Tutoriais e soluções rápidas do Pubfy: cardápio digital, PDV, QR Code, WhatsApp, impressão e pagamentos online."
        />
        <link rel="canonical" href="https://pubfy.com.br/ajuda" />
      </Helmet>
      <Navbar />
      <main className="container mx-auto max-w-4xl px-4 py-12">
        <div className="mb-8 space-y-3 text-center">
          <Badge variant="secondary" className="mx-auto">
            <LifeBuoy className="mr-1 h-3 w-3" /> Suporte Pubfy
          </Badge>
          <h1 className="text-3xl font-bold md:text-4xl">Central de Ajuda</h1>
          <p className="text-muted-foreground">
            Guias curtos para colocar o restaurante para vender sem depender do suporte.
          </p>
        </div>

        <div className="relative mb-8">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Buscar por cardápio, PDV, WhatsApp, impressão..."
            className="pl-9"
            aria-label="Buscar na central de ajuda"
          />
        </div>

        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((index) => (
              <Skeleton key={index} className="h-16 w-full" />
            ))}
          </div>
        ) : grouped.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Nenhum artigo encontrado para esta busca.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {grouped.map(([category, items]) => (
              <section key={category}>
                <h2 className="mb-3 text-xl font-semibold capitalize">{category.replace(/-/g, " ")}</h2>
                <Accordion type="single" collapsible className="rounded-lg border">
                  {items.map((article) => (
                    <AccordionItem key={article.id} value={article.id} className="px-4">
                      <AccordionTrigger className="text-left">{article.title}</AccordionTrigger>
                      <AccordionContent>
                        {article.summary && (
                          <p className="mb-2 text-sm text-muted-foreground">{article.summary}</p>
                        )}
                        <div className="whitespace-pre-line text-sm leading-relaxed">{article.content}</div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </section>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Ajuda;
