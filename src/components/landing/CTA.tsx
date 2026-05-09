import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";

const LandingCTA = () => {
  return (
    <section className="bg-navy py-16">
      <div className="container mx-auto px-6">
        <div className="grid gap-10 md:grid-cols-[1fr_0.85fr] md:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-green-light">
              <MessageCircle size={16} />
              Comece com orientacao e sem compromisso
            </span>
            <h2 className="mt-5 max-w-3xl text-3xl font-bold leading-tight text-white md:text-5xl">
              Veja o Pubfy funcionando na rotina do seu restaurante.
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/75">
              Crie sua conta, cadastre seu estabelecimento e teste o fluxo completo com cardapio, produtos, mesas, pedidos e atendimento em um so lugar.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/teste-gratis">
                <Button size="lg" className="h-12 w-full bg-orange px-7 font-semibold text-white hover:bg-orange/90 sm:w-auto">
                  Comecar teste gratis
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/contato">
                <Button size="lg" variant="outline" className="h-12 w-full border-white/60 bg-white/10 px-7 font-semibold text-white hover:bg-white/20 sm:w-auto">
                  Falar com especialista
                </Button>
              </Link>
            </div>
          </div>

          <div className="rounded-lg border border-white/20 bg-white p-6 shadow-2xl shadow-black/20">
            <h3 className="text-xl font-semibold text-navy">Checklist de uma boa primeira semana</h3>
            <ul className="mt-5 space-y-4">
              {[
                "Cadastrar produtos, categorias e imagens principais",
                "Publicar o cardapio por QR Code com tema do segmento",
                "Abrir pedidos no PDV e testar mesas ou delivery",
                "Conectar WhatsApp, campanhas e relatorios conforme a rotina",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green" />
                  <span className="text-sm leading-relaxed text-navy/75">{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 rounded-md bg-offwhite p-4">
              <p className="text-sm font-semibold text-navy">Sem compromisso</p>
              <p className="mt-1 text-sm text-navy/60">
                Teste gratuito, sem cartao, com caminho claro para ativar a operacao.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingCTA;
