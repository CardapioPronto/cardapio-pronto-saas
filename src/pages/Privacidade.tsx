import { Link } from "react-router-dom";
import { ArrowLeft, Shield } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const sections: { title: string; body: string[] }[] = [
  {
    title: "1. Quem somos",
    body: [
      "A Pubfy disponibiliza soluções de software para operações gastronômicas. Esta Política de Privacidade descreve como tratamos dados pessoais no contexto do site e da Plataforma.",
    ],
  },
  {
    title: "2. Dados que podemos coletar",
    body: [
      "Dados de cadastro e conta: nome, e-mail, telefone, dados da empresa, preferências de uso e registros de suporte.",
      "Dados de uso e dispositivo: logs técnicos, identificadores de sessão, endereço IP, tipo de navegador e eventos seguros relacionados ao funcionamento do serviço.",
      "Dados operacionais inseridos por você ou sua equipe na Plataforma (por exemplo: cardápio, pedidos e configurações), necessários para a prestação do serviço.",
    ],
  },
  {
    title: "3. Finalidades e bases legais",
    body: [
      "Prestar, operar e aprimorar a Plataforma; autenticar usuários e aplicar permissões;",
      "Cumprir obrigações legais e regulatórias;",
      "Comunicações sobre conta, segurança, atualização de produto e suporte;",
      "Prevenção a fraudes, segurança da informação e continuidade do serviço;",
      "Medição de uso agregado e melhoria de performance, respeitando configurações e legislação aplicável.",
      "Quando necessário consentimento específico (por exemplo, para certas comunicações de marketing não essenciais), indicaremos de forma destacada.",
    ],
  },
  {
    title: "4. Compartilhamento",
    body: [
      "Podemos compartilhar dados com provedores de infraestrutura, processadores de pagamento, serviços de e-mail/notificação e parceiros técnicos que atuem como operadores sob instruções e contratos adequados.",
      "Também poderemos divulgar informações se exigido por lei, ordem judicial ou autoridade competente, ou para proteger direitos, segurança e integridade dos usuários e da Pubfy.",
    ],
  },
  {
    title: "5. Retenção",
    body: [
      "Mantemos dados pelo tempo necessário para cumprir as finalidades descritas, requisitos legais, resolução de litígios e demonstração do cumprimento de obrigações.",
    ],
  },
  {
    title: "6. Direitos dos titulares (LGPD)",
    body: [
      "Na medida aplicável à relação jurídica e ao papel da Pubfy (controladora ou operadora), você poderá solicitar confirmação de tratamento, acesso, correção, anonimização, portabilidade, eliminação de dados desnecessários e informações sobre compartilhamentos.",
      "Para exercer seus direitos, utilize o canal de contato oficial. Podemos solicitar informações razoáveis para confirmar sua identidade antes de atender à solicitação.",
    ],
  },
  {
    title: "7. Segurança",
    body: [
      "Adotamos medidas administrativas, técnicas e organizacionais proporcionais ao risco para proteger dados contra acesso não autorizado, vazamentos e uso indevido. Nenhum sistema é infalível; mantenha credenciais seguras e atualizadas.",
    ],
  },
  {
    title: "8. Transferência internacional",
    body: [
      "Ao utilizar serviços com infraestrutura global (por exemplo, provedores em nuvem), dados podem ser processados em outros países. Nesses casos, buscamos cláusulas contratuais e salvaguardas compatíveis com a legislação aplicável.",
    ],
  },
  {
    title: "9. Alterações desta política",
    body: [
      "Podemos revisar esta Política periodicamente. A versão atual estará sempre disponível nesta página, com data de atualização ao final.",
    ],
  },
  {
    title: "10. Contato",
    body: [
      "Para questões relacionadas à privacidade e proteção de dados, entre em contato pelos meios informados na página de contato do site.",
    ],
  },
];

export default function Privacidade() {
  return (
    <div className="flex min-h-screen flex-col bg-offwhite">
      <Navbar />
      <main className="flex-1 pt-24">
        <section className="relative overflow-hidden border-b border-beige bg-gradient-to-br from-navy via-navy to-green/90 text-white">
          <div className="absolute -left-20 bottom-0 h-72 w-72 rounded-full bg-green/20 blur-3xl" />
          <div className="container relative mx-auto px-6 py-14 md:py-20">
            <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm text-white/75 transition hover:text-white">
              <ArrowLeft className="h-4 w-4" />
              Voltar ao início
            </Link>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15">
                <Shield className="h-5 w-5" />
              </div>
              <Badge className="border-white/20 bg-white/10 text-white hover:bg-white/15">Privacidade e LGPD</Badge>
            </div>
            <h1 className="mt-5 max-w-3xl text-3xl font-bold tracking-tight md:text-5xl">Política de Privacidade</h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/80 md:text-lg">
              Como tratamos dados pessoais na Pubfy — transparência e responsabilidade no uso das informações.
            </p>
            <p className="mt-4 text-sm text-white/60">Última atualização: maio de 2026</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/termos">
                <Button size="sm" variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20">
                  Termos de Serviço
                </Button>
              </Link>
              <Link to="/cookies">
                <Button size="sm" variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20">
                  Política de Cookies
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-6 py-12 md:py-16">
          <div className="mx-auto max-w-3xl rounded-2xl border border-beige bg-white p-6 shadow-sm md:p-10">
            <p className="text-sm leading-relaxed text-navy/70">
              Esta política é aplicável aos visitantes do site institucional e aos usuários da Plataforma. Detalhes técnicos e operacionais
              podem ser complementados por documentos internos, termos específicos de produto ou requisitos de integrações contratadas.
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
  );
}
