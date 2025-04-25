
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, ChevronDown } from "lucide-react";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      isScrolled ? "bg-offwhite/95 backdrop-blur-md shadow-sm py-2" : "bg-transparent py-4"
    }`}>
      <div className="container mx-auto px-6 flex items-center justify-between">
        <Link to="/" className="flex items-center">
          <span className="text-navy text-2xl font-bold">Cardápio<span className="text-orange">Pronto</span></span>
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
            <div className="absolute left-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 ease-in-out">
              <div className="py-1">
                <Link to="/cardapio-digital" className="block px-4 py-2 text-sm text-navy hover:bg-beige/20">
                  Cardápio Digital
                </Link>
                <Link to="/pdv" className="block px-4 py-2 text-sm text-navy hover:bg-beige/20">
                  PDV Online
                </Link>
                <Link to="/gestao" className="block px-4 py-2 text-sm text-navy hover:bg-beige/20">
                  Gestão Completa
                </Link>
              </div>
            </div>
          </div>
          <Link to="/precos" className="text-navy hover:text-orange transition-colors">
            Preços
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
            <Button className="bg-green hover:bg-green-dark text-white">
              Teste Grátis
            </Button>
          </Link>
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden flex items-center"
        >
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
            <Link to="/cardapio-digital" className="text-navy py-2 border-b border-beige">
              Cardápio Digital
            </Link>
            <Link to="/pdv" className="text-navy py-2 border-b border-beige">
              PDV Online
            </Link>
            <Link to="/gestao" className="text-navy py-2 border-b border-beige">
              Gestão Completa
            </Link>
            <Link to="/precos" className="text-navy py-2 border-b border-beige">
              Preços
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
                <Button className="w-full bg-green hover:bg-green-dark text-white">
                  Teste Grátis
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
