
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Hero from "@/components/landing/Hero";
import Features from "@/components/landing/Features";
import Testimonials from "@/components/landing/Testimonials";
import Pricing from "@/components/landing/Pricing";
import CTA from "@/components/landing/CTA";
import { PublicSeo } from "@/components/seo/PublicSeo";
import { useEffect } from "react";
import { Helmet } from "react-helmet-async";

const LandingPage = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
    <PublicSeo
      title="Pubfy | Gestão e Cardápio Digital para Restaurantes"
      description="Venda direto com cardápio por QR Code, PDV, mesas, CRM, fidelidade, campanhas, impressão, iFood integrado e relatórios por canal."
      path="/"
    />
    <Helmet>
      <script type="application/ld+json">{JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "Pubfy",
        url: "https://pubfy.com.br",
        logo: "https://pubfy.com.br/favicon-pubfy.png",
        description: "Plataforma de cardápio digital, PDV, CRM e automações para restaurantes."
      })}</script>
      <script type="application/ld+json">{JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "Pubfy",
        url: "https://pubfy.com.br"
      })}</script>
    </Helmet>
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow">
        <Hero />
        <Features />
        <Testimonials />
        <Pricing />
        <CTA />
      </main>
      <Footer />
    </div>
    </>
  );
};

export default LandingPage;
