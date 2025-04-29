
import React from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { CheckCircle2, Smartphone, QrCode, Image } from "lucide-react";

const CardapioDigital = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow pt-24">
        <section className="bg-offwhite py-16 md:py-24">
          <div className="container mx-auto px-6">
            <div className="flex flex-col md:flex-row items-center">
              <div className="md:w-1/2 mb-10 md:mb-0">
                <h1 className="text-3xl md:text-5xl font-bold text-navy mb-6">
                  Cardápio Digital Interativo
                </h1>
                <p className="text-lg text-navy/70 mb-8">
                  Transforme a experiência dos seus clientes com um cardápio
                  digital moderno, acessível por QR Code e totalmente personalizável.
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
                    alt="Cardápio Digital"
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
              Benefícios do Cardápio Digital
            </h2>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-offwhite p-6 rounded-xl">
                <Smartphone className="text-green h-10 w-10 mb-4" />
                <h3 className="text-xl font-semibold text-navy mb-2">Acesso instantâneo</h3>
                <p className="text-navy/70">
                  Seus clientes acessam o cardápio completo diretamente pelo celular, sem baixar aplicativos.
                </p>
              </div>

              <div className="bg-offwhite p-6 rounded-xl">
                <QrCode className="text-green h-10 w-10 mb-4" />
                <h3 className="text-xl font-semibold text-navy mb-2">QR Code personalizado</h3>
                <p className="text-navy/70">
                  QR Codes personalizados com sua marca para colocar nas mesas e em materiais de divulgação.
                </p>
              </div>

              <div className="bg-offwhite p-6 rounded-xl">
                <Image className="text-green h-10 w-10 mb-4" />
                <h3 className="text-xl font-semibold text-navy mb-2">Fotos atrativas</h3>
                <p className="text-navy/70">
                  Exiba fotos de alta qualidade dos seus pratos, aumentando o desejo de compra.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 bg-offwhite">
          <div className="container mx-auto px-6">
            <h2 className="text-2xl md:text-3xl font-bold text-navy mb-8 text-center">
              O que está incluído
            </h2>

            <div className="max-w-3xl mx-auto space-y-4">
              <div className="flex items-start">
                <CheckCircle2 className="text-green shrink-0 mr-3 mt-1" />
                <p className="text-navy/80">Cardápio digital personalizável com sua marca</p>
              </div>
              <div className="flex items-start">
                <CheckCircle2 className="text-green shrink-0 mr-3 mt-1" />
                <p className="text-navy/80">Categorias e subcategorias ilimitadas</p>
              </div>
              <div className="flex items-start">
                <CheckCircle2 className="text-green shrink-0 mr-3 mt-1" />
                <p className="text-navy/80">Fotos de alta qualidade para cada produto</p>
              </div>
              <div className="flex items-start">
                <CheckCircle2 className="text-green shrink-0 mr-3 mt-1" />
                <p className="text-navy/80">Descrições detalhadas e informações nutricionais</p>
              </div>
              <div className="flex items-start">
                <CheckCircle2 className="text-green shrink-0 mr-3 mt-1" />
                <p className="text-navy/80">Atualização em tempo real do cardápio</p>
              </div>
              <div className="flex items-start">
                <CheckCircle2 className="text-green shrink-0 mr-3 mt-1" />
                <p className="text-navy/80">QR Codes personalizados para acesso rápido</p>
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

export default CardapioDigital;
