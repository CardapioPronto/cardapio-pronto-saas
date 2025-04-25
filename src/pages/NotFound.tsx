
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Home } from "lucide-react";

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-offwhite px-6">
      <div className="text-center max-w-lg">
        <h1 className="text-9xl font-bold text-navy">404</h1>
        <div className="mt-4 text-2xl md:text-3xl font-semibold text-navy">
          Página não encontrada
        </div>
        <p className="mt-4 text-lg text-navy/70">
          A página que você está procurando não existe ou foi movida.
        </p>
        <div className="mt-8">
          <Link to="/">
            <Button className="bg-green hover:bg-green-dark text-white">
              <Home className="mr-2 h-4 w-4" /> Voltar para a página inicial
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
