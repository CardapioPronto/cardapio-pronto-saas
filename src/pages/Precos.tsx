
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Pricing from "@/components/landing/Pricing";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Precos = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow pt-24">
        <section className="bg-white py-12 md:py-16">
          <div className="container mx-auto px-6 text-center max-w-3xl">
            <h1 className="text-3xl md:text-5xl font-bold text-navy mb-4">
              Preço justo, simples e transparente
            </h1>
            <p className="text-lg text-navy/70">
              Um único plano completo para vender mais com cardápio digital, WhatsApp e gestão integrada.
            </p>
          </div>
        </section>

        <Pricing />

        <section className="py-16 bg-white">
          <div className="container mx-auto px-6 max-w-3xl">
            <h2 className="text-2xl md:text-3xl font-bold text-navy mb-8 text-center">
              Perguntas frequentes
            </h2>
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-navy mb-2">Preciso de cartão para testar?</h3>
                <p className="text-navy/70">Não. Você experimenta o Pubfy por 14 dias grátis sem informar dados de pagamento.</p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-navy mb-2">Existe período de fidelidade?</h3>
                <p className="text-navy/70">Não. Sem burocracia: cancele quando quiser.</p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-navy mb-2">Quanto economizo no plano anual?</h3>
                <p className="text-navy/70">No anual o valor sai por R$ 49,90/mês (cobrado R$ 599/ano), uma economia de cerca de 17% comparado ao mensal.</p>
              </div>
            </div>
            <div className="mt-10 text-center">
              <Link to="/contato">
                <Button variant="outline" className="border-navy/20 hover:bg-navy/5 text-navy">
                  Ainda tem dúvidas? Falar com especialista
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Precos;
