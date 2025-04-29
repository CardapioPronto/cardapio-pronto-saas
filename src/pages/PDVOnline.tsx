
import React from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { CheckCircle2, Monitor, Clock, CreditCard } from "lucide-react";

const PDVOnline = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow pt-24">
        <section className="bg-offwhite py-16 md:py-24">
          <div className="container mx-auto px-6">
            <div className="flex flex-col md:flex-row items-center">
              <div className="md:w-1/2 mb-10 md:mb-0">
                <h1 className="text-3xl md:text-5xl font-bold text-navy mb-6">
                  PDV Online Completo
                </h1>
                <p className="text-lg text-navy/70 mb-8">
                  Gerencie vendas, controle mesas e receba pedidos em tempo real com nosso
                  PDV online acessível de qualquer dispositivo.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link to="/demonstracao">
                    <Button className="bg-green hover:bg-green-dark text-white">
                      Ver demonstração
                    </Button>
                  </Link>
                  <Link to="/teste-gratis">
                    <Button variant="outline" className="border-green hover:bg-green/10 text-navy">
                      Teste grátis por 14 dias
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="md:w-1/2 md:pl-12">
                <div className="bg-white p-4 rounded-xl shadow-lg">
                  <img
                    src="/placeholder.svg"
                    alt="PDV Online"
                    className="w-full h-auto rounded-lg"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 bg-white">
          <div className="container mx-auto px-6">
            <h2 className="text-2xl md:text-3xl font-bold text-navy mb-12 text-center">
              Vantagens do PDV Online
            </h2>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-offwhite p-6 rounded-xl">
                <Monitor className="text-green h-10 w-10 mb-4" />
                <h3 className="text-xl font-semibold text-navy mb-2">Acesso de qualquer lugar</h3>
                <p className="text-navy/70">
                  Acesse o PDV pelo navegador em qualquer dispositivo, sem necessidade de instalação.
                </p>
              </div>

              <div className="bg-offwhite p-6 rounded-xl">
                <Clock className="text-green h-10 w-10 mb-4" />
                <h3 className="text-xl font-semibold text-navy mb-2">Operação em tempo real</h3>
                <p className="text-navy/70">
                  Acompanhe pedidos, mesas e comandas em tempo real, melhorando a operação do seu negócio.
                </p>
              </div>

              <div className="bg-offwhite p-6 rounded-xl">
                <CreditCard className="text-green h-10 w-10 mb-4" />
                <h3 className="text-xl font-semibold text-navy mb-2">Múltiplos pagamentos</h3>
                <p className="text-navy/70">
                  Aceite diversas formas de pagamento e divida contas com facilidade entre os clientes.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 bg-offwhite">
          <div className="container mx-auto px-6">
            <h2 className="text-2xl md:text-3xl font-bold text-navy mb-8 text-center">
              Funcionalidades incluídas
            </h2>

            <div className="max-w-3xl mx-auto space-y-4">
              <div className="flex items-start">
                <CheckCircle2 className="text-green shrink-0 mr-3 mt-1" />
                <p className="text-navy/80">Controle de mesas e comandas</p>
              </div>
              <div className="flex items-start">
                <CheckCircle2 className="text-green shrink-0 mr-3 mt-1" />
                <p className="text-navy/80">Registro rápido de pedidos</p>
              </div>
              <div className="flex items-start">
                <CheckCircle2 className="text-green shrink-0 mr-3 mt-1" />
                <p className="text-navy/80">Múltiplas formas de pagamento</p>
              </div>
              <div className="flex items-start">
                <CheckCircle2 className="text-green shrink-0 mr-3 mt-1" />
                <p className="text-navy/80">Fechamento de caixa automático</p>
              </div>
              <div className="flex items-start">
                <CheckCircle2 className="text-green shrink-0 mr-3 mt-1" />
                <p className="text-navy/80">Relatórios de vendas detalhados</p>
              </div>
              <div className="flex items-start">
                <CheckCircle2 className="text-green shrink-0 mr-3 mt-1" />
                <p className="text-navy/80">Integração com impressoras fiscais e não fiscais</p>
              </div>
            </div>

            <div className="text-center mt-12">
              <Link to="/teste-gratis">
                <Button className="bg-green hover:bg-green-dark text-white">
                  Comece agora mesmo
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

export default PDVOnline;
