
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Hero from "@/components/landing/Hero";
import Features from "@/components/landing/Features";
import Testimonials from "@/components/landing/Testimonials";
import Pricing from "@/components/landing/Pricing";
import CTA from "@/components/landing/CTA";
import { PublicSeo } from "@/components/seo/PublicSeo";
import { useEffect } from "react";

const LandingPage = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
    <PublicSeo
      title="Pubfy | Canal próprio, PDV, CRM e automações para restaurantes"
      description="Venda direto com cardápio por QR Code, PDV, mesas, CRM, fidelidade, campanhas, impressão, iFood integrado e relatórios por canal."
      path="/"
    />
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
