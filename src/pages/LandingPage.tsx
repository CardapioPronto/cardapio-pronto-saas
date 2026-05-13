
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
      title="Pubfy | Cardápio digital, PDV e gestão para restaurantes"
      description="Cardápio digital com QR Code, pedidos integrados à cozinha, PDV e ferramentas de gestão. Teste sem cartão e opere com mais clareza."
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
