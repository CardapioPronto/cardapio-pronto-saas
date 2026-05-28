import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, ChevronDown, BarChart3, QrCode, ShoppingCart } from "lucide-react";
import { PubfyWordmark } from "@/components/brand/PubfyWordmark";
import { useActivePlan } from "@/hooks/useActivePlan";
import { DEFAULT_TRIAL_DAYS } from "@/lib/trialDays";

const solutionLinks = [
  {
    to: "/cardapio-digital",
    title: "Cardápio e QR Code",
    description: "Menu público, temas, fotos e pedidos pelo celular.",
    icon: QrCode,
  },
  {
    to: "/pdv-online",
    title: "PDV e Pedidos",
    description: "Mesa, comanda, delivery e fila de preparo no navegador.",
    icon: ShoppingCart,
  },
  {
    to: "/gestao-completa",
    title: "Gestão e Relatórios",
    description: "Indicadores, equipe, permissões e integrações.",
    icon: BarChart3,
  },
];

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { plan } = useActivePlan();
  const trialDays = plan?.trial_days ?? DEFAULT_TRIAL_DAYS;
  const signupLabel = trialDays > 0 ? "Teste grátis" : "Criar conta";

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? "bg-offwhite/95 backdrop-blur-md shadow-sm py-2" : "bg-offwhite/95 backdrop-blur-md shadow-sm py-3"
      }`}
    >
      <div className="container mx-auto px-6 flex items-center justify-between">
        <Link to="/" className="flex items-center" aria-label="Pubfy página inicial">
          <PubfyWordmark className="min-h-[2.75rem]" />
        </Link>

        {/* Desktop menu */}
        <nav className="hidden md:flex items-center space-x-8">
          <Link to="/" className="text-navy hover:text-orange transition-colors">
            Início
          </Link>
          <div className="relative group">
            <button className="flex items-center text-navy hover:text-orange transition-colors">
              Soluções <ChevronDown size={16} className="ml-1" />
            </button>
            <div className="absolute left-1/2 mt-3 w-[420px] -translate-x-1/2 rounded-lg bg-white p-3 shadow-xl ring-1 ring-black/5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 ease-in-out">
              <div className="space-y-1">
                {solutionLinks.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="flex gap-3 rounded-md px-3 py-3 text-navy transition hover:bg-offwhite"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-green/10 text-green">
                      <item.icon size={19} />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold">{item.title}</span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-navy/60">{item.description}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
          <Link to="/precos" className="text-navy hover:text-orange transition-colors">
            Preços
          </Link>
          <Link to="/blog" className="text-navy hover:text-orange transition-colors">
            Blog
          </Link>
          <Link to="/contato" className="text-navy hover:text-orange transition-colors">
            Contato
          </Link>
        </nav>

        <div className="hidden md:flex items-center space-x-4">
          <Link to="/login">
            <Button variant="outline" className="border-green hover:bg-green/10 text-navy">
              Entrar
            </Button>
          </Link>
          <Link to="/teste-gratis">
            <Button className="bg-green hover:bg-green-dark text-white">{signupLabel}</Button>
          </Link>
        </div>

        {/* Mobile menu button */}
        <button onClick={() => setIsOpen(!isOpen)} className="md:hidden flex items-center text-navy">
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="md:hidden bg-offwhite absolute top-full left-0 w-full shadow-md">
          <div className="container mx-auto px-6 py-4 flex flex-col space-y-4">
            <Link to="/" className="text-navy py-2 border-b border-beige">
              Início
            </Link>
            {solutionLinks.map((item) => (
              <Link key={item.to} to={item.to} className="text-navy py-2 border-b border-beige">
                {item.title}
              </Link>
            ))}
            <Link to="/precos" className="text-navy py-2 border-b border-beige">
              Preços
            </Link>
            <Link to="/blog" className="text-navy py-2 border-b border-beige">
              Blog
            </Link>
            <Link to="/contato" className="text-navy py-2 border-b border-beige">
              Contato
            </Link>
            <div className="flex flex-col space-y-2 pt-2">
              <Link to="/login">
                <Button variant="outline" className="w-full border-green hover:bg-green/10 text-navy">
                  Entrar
                </Button>
              </Link>
              <Link to="/teste-gratis">
                <Button className="w-full bg-green hover:bg-green-dark text-white">{signupLabel}</Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
