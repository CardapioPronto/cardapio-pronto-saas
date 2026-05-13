import { Link } from "react-router-dom";
import { ArrowLeft, Cookie } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { PublicSeo } from "@/components/seo/PublicSeo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const sections: { title: string; body: string[] }[] = [
  {
    title: "1. O que são cookies?",
    body: [
      "Cookies são pequenos arquivos armazenados no seu navegador quando você visita um site. Eles ajudam a lembrar preferências, manter sessões seguras e entender como o site é utilizado.",
    ],
  },
  {
    title: "2. Como usamos cookies na Pubfy",
    body: [
      "Cookies essenciais: necessários ao funcionamento básico da Plataforma e do site — por exemplo, manter você autenticado e aplicar segurança.",
      "Cookies de preferências: salvam idioma, modo de visualização ou outras escolhas que melhoram a experiência.",
      "Cookies analíticos: permitem medições agregadas de tráfego e performance para aprimorar o produto (quando ativados e em conformidade com as configurações do ambiente).",
    ],
  },
  {
    title: "3. Cookies de terceiros",
    body: [
      "Algumas funcionalidades podem integrar ferramentas de terceiros (por exemplo: monitoramento de erros ou pagamentos). Esses parceiros podem definir seus próprios cookies sujeitos às respectivas políticas.",
    ],
  },
  {
    title: "4. Gerenciamento das preferências",
    body: [
      "A maioria dos navegadores permite bloquear ou apagar cookies nas configurações. Lembre-se de que cookies essenciais podem impactar login e recursos principais se forem desativados.",
      "Quando disponibilizamos um centro de preferências ou banner específico, você poderá revisar categorias antes de aceitar o uso opcional.",
    ],
  },
  {
    title: "5. Base legal",
    body: [
      "Utilizamos cookies estritamente necessários para prestação do serviço. Para categorias opcionais, empregamos consentimento quando exigido pela legislação e pelas configurações do produto.",
    ],
  },
  {
    title: "6. Atualizações",
    body: [
      "Esta Política de Cookies pode ser atualizada periodicamente para refletir mudanças técnicas ou regulatórias. A versão atual estará sempre publicada nesta página.",
    ],
  },
  {
    title: "7. Contato",
    body: [
      "Dúvidas sobre cookies ou preferências podem ser encaminhadas pelo canal oficial de contato indicado em nosso site.",
    ],
  },
];

export default function CookiesPage() {
  return (
    <>
    <PublicSeo
      title="Política de Cookies | Pubfy"
      description="Transparência sobre cookies e tecnologias similares utilizadas no site institucional e na Plataforma Pubfy."
      path="/cookies"
    />
    <div className="flex min-h-screen flex-col bg-offwhite">
      <Navbar />
      <main className="flex-1 pt-24">
        <section className="relative overflow-hidden border-b border-beige bg-gradient-to-br from-navy via-navy to-orange/85 text-white">
          <div className="absolute -right-16 bottom-0 h-64 w-64 rounded-full bg-green/25 blur-3xl" />
          <div className="container relative mx-auto px-6 py-14 md:py-20">
            <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm text-white/75 transition hover:text-white">
              <ArrowLeft className="h-4 w-4" />
              Voltar ao início
            </Link>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15">
                <Cookie className="h-5 w-5" />
              </div>
              <Badge className="border-white/20 bg-white/10 text-white hover:bg-white/15">Transparência</Badge>
            </div>
            <h1 className="mt-5 max-w-3xl text-3xl font-bold tracking-tight md:text-5xl">Política de Cookies</h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/80 md:text-lg">
              Informações sobre cookies e tecnologias similares utilizadas no site e na Plataforma Pubfy.
            </p>
            <p className="mt-4 text-sm text-white/60">Última atualização: maio de 2026</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/termos">
                <Button size="sm" variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20">
                  Termos de Serviço
                </Button>
              </Link>
              <Link to="/privacidade">
                <Button size="sm" variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20">
                  Política de Privacidade
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-6 py-12 md:py-16">
          <div className="mx-auto max-w-3xl rounded-2xl border border-beige bg-white p-6 shadow-sm md:p-10">
            <p className="text-sm leading-relaxed text-navy/70">
              Esta política complementa nossa {" "}
              <Link to="/privacidade" className="font-medium text-green underline-offset-4 hover:underline">
                Política de Privacidade
              </Link>
              . Ao continuar navegando, você declara estar ciente de como utilizamos cookies, nos termos abaixo.
            </p>
            <div className="mt-10 space-y-10">
              {sections.map((sec) => (
                <div key={sec.title}>
                  <h2 className="text-lg font-semibold text-navy">{sec.title}</h2>
                  <div className="mt-3 space-y-3 text-sm leading-relaxed text-navy/75">
                    {sec.body.map((p) => (
                      <p key={p}>{p}</p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
    </>
  );
}
