
import React from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { CheckCircle2, BarChart3, Package, Calendar } from "lucide-react";

const GestaoCompleta = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow pt-24">
        <section className="bg-offwhite py-16 md:py-24">
          <div className="container mx-auto px-6">
            <div className="flex flex-col md:flex-row items-center">
              <div className="md:w-1/2 mb-10 md:mb-0">
                <h1 className="text-3xl md:text-5xl font-bold text-navy mb-6">
                  Gestão Completa para Restaurantes
                </h1>
                <p className="text-lg text-navy/70 mb-8">
                  Tenha o controle total do seu negócio com nossa plataforma de gestão
                  integrada: estoque, financeiro, relatórios e muito mais.
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
                    alt="Gestão Completa"
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
              Principais recursos de gestão
            </h2>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-offwhite p-6 rounded-xl">
                <BarChart3 className="text-green h-10 w-10 mb-4" />
                <h3 className="text-xl font-semibold text-navy mb-2">Relatórios detalhados</h3>
                <p className="text-navy/70">
                  Acompanhe o desempenho do seu negócio com relatórios de vendas, produtos mais vendidos e lucratividade.
                </p>
              </div>

              <div className="bg-offwhite p-6 rounded-xl">
                <Package className="text-green h-10 w-10 mb-4" />
                <h3 className="text-xl font-semibold text-navy mb-2">Controle de estoque</h3>
                <p className="text-navy/70">
                  Gerencie seu inventário, receba alertas de estoque baixo e controle o custo dos seus produtos.
                </p>
              </div>

              <div className="bg-offwhite p-6 rounded-xl">
                <Calendar className="text-green h-10 w-10 mb-4" />
                <h3 className="text-xl font-semibold text-navy mb-2">Gestão financeira</h3>
                <p className="text-navy/70">
                  Controle suas despesas, receitas e fluxo de caixa de forma simples e eficiente.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 bg-offwhite">
          <div className="container mx-auto px-6">
            <h2 className="text-2xl md:text-3xl font-bold text-navy mb-8 text-center">
              Ferramentas de gestão incluídas
            </h2>

            <div className="max-w-3xl mx-auto space-y-4">
              <div className="flex items-start">
                <CheckCircle2 className="text-green shrink-0 mr-3 mt-1" />
                <p className="text-navy/80">Dashboard com indicadores de desempenho</p>
              </div>
              <div className="flex items-start">
                <CheckCircle2 className="text-green shrink-0 mr-3 mt-1" />
                <p className="text-navy/80">Controle de estoque e insumos</p>
              </div>
              <div className="flex items-start">
                <CheckCircle2 className="text-green shrink-0 mr-3 mt-1" />
                <p className="text-navy/80">Gestão financeira completa</p>
              </div>
              <div className="flex items-start">
                <CheckCircle2 className="text-green shrink-0 mr-3 mt-1" />
                <p className="text-navy/80">Relatórios de vendas por período</p>
              </div>
              <div className="flex items-start">
                <CheckCircle2 className="text-green shrink-0 mr-3 mt-1" />
                <p className="text-navy/80">Controle de fornecedores</p>
              </div>
              <div className="flex items-start">
                <CheckCircle2 className="text-green shrink-0 mr-3 mt-1" />
                <p className="text-navy/80">Gestão de funcionários e permissões</p>
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

export default GestaoCompleta;
