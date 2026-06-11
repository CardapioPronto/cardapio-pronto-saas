import { Link } from "react-router-dom";
import { ArrowLeft, FileText } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { PublicSeo } from "@/components/seo/PublicSeo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const sections: { title: string; body: string[] }[] = [
  {
    title: "1. Aceitação dos termos",
    body: [
      "Ao acessar ou utilizar os serviços da Pubfy (“Plataforma”), você declara ter lido e concordado com estes Termos de Serviço. Se não concordar, interrompa o uso imediatamente.",
      "A Pubfy poderá atualizar estes termos a qualquer momento. Alterações relevantes serão comunicadas por meios razoáveis (por exemplo, aviso na Plataforma ou por e-mail cadastrado). O uso continuado após a publicação constitui aceitação das mudanças.",
    ],
  },
  {
    title: "2. Descrição do serviço",
    body: [
      "A Pubfy oferece software em nuvem para gestão de restaurantes, incluindo cardápio digital, fluxos de pedidos, integrações e ferramentas correlatas, conforme o plano contratado.",
      "Funcionalidades específicas podem variar conforme o tipo de assinatura, configurações da conta e disponibilidade técnica.",
    ],
  },
  {
    title: "3. Cadastro e responsabilidade da conta",
    body: [
      "Você deve fornecer dados verídicos e manter suas credenciais em sigilo. Atividades realizadas com seu login são de sua responsabilidade.",
      "Para contas empresariais, o representante legal ou administrador autorizado é responsável por convidar usuários, definir permissões e garantir o cumprimento destes termos pela equipe.",
    ],
  },
  {
    title: "4. Uso permitido e restrições",
    body: [
      "É vedado utilizar a Plataforma de forma que viole a lei, direitos de terceiros, segurança dos sistemas ou a experiência de outros clientes — incluindo, sem limitação, envio de código malicioso, engenharia reversa não autorizada ou tentativa de acesso indevido.",
      "O conteúdo publicado pelo restaurante (cardápio, imagens, marcas, comunicações) permanece de sua titularidade; você concede à Pubfy licença necessária apenas para operação e entrega do serviço.",
    ],
  },
  {
    title: "5. Pagamentos, planos e disponibilidade",
    body: [
      "Valores, ciclo de cobrança e políticas de cancelamento seguem o que for apresentado no momento da contratação ou no painel de assinaturas, respeitando as regras do processador de pagamentos integrado quando aplicável.",
      "Empregamos boas práticas para manter a Plataforma disponível. Indisponibilidades por manutenção programada, causas de força maior ou fatores fora do nosso controle razoável podem ocorrer.",
    ],
  },
  {
    title: "6. Dados e privacidade",
    body: [
      "O tratamento de dados pessoais segue a Política de Privacidade, disponível neste site, em conformidade com a legislação aplicável, inclusive a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), quando pertinente.",
    ],
  },
  {
    title: "7. Limitação de responsabilidade",
    body: [
      "Na medida máxima permitida pela lei aplicável, a Pubfy não se responsabiliza por lucros cessantes, danos indiretos ou consequenciais decorrentes do uso ou impossibilidade de uso da Plataforma.",
      "A Plataforma é fornecida “no estado em que se encontra”. Recomendamos que o restaurante mantenha cópias de segurança dos dados críticos para a operação sempre que fizer sentido no contexto do negócio.",
    ],
  },
  {
    title: "8. Contato",
    body: [
      "Para dúvidas sobre estes Termos, utilize o canal de contato oficial indicado na página de contato do site.",
    ],
  },
];

export default function Termos() {
  return (
    <>
    <PublicSeo
      title="Termos de Serviço | Pubfy"
      description="Regras de uso da Plataforma Pubfy. Leia com atenção antes de criar conta ou usar o serviço."
      path="/termos"
    />
    <div className="flex min-h-screen flex-col bg-offwhite">
      <Navbar />
      <main className="flex-1 pt-24">
        <section className="relative overflow-hidden border-b border-beige bg-gradient-to-br from-navy via-navy to-green/90 text-white">
          <div className="absolute -right-24 top-10 h-72 w-72 rounded-full bg-orange/20 blur-3xl" />
          <div className="container relative mx-auto px-6 py-14 md:py-20">
            <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm text-white/75 transition hover:text-white">
              <ArrowLeft className="h-4 w-4" />
              Voltar ao início
            </Link>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15">
                <FileText className="h-5 w-5" />
              </div>
              <Badge className="border-white/20 bg-white/10 text-white hover:bg-white/15">Documento legal</Badge>
            </div>
            <h1 className="mt-5 max-w-3xl text-3xl font-bold tracking-tight md:text-5xl">Termos de Serviço</h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/80 md:text-lg">
              Regras de uso da Pubfy. Leia com atenção antes de utilizar a Plataforma.
            </p>
            <p className="mt-4 text-sm text-white/85">Última atualização: maio de 2026</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/privacidade">
                <Button size="sm" variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20">
                  Política de Privacidade
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
              Estes Termos regem o relacionamento entre você (usuário ou empresa contratante) e a Pubfy. Este texto tem caráter geral;
              detalhes contratuais ou comerciais específicos podem constar em propostas, faturas ou comunicações complementares.
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
