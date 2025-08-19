
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BarChart3,
  CreditCard,
  Home,
  Package2,
  Settings,
  ShoppingBasket,
  UserRound,
  Menu,
  X,
  Store,
  LogOut,
  MapPin,
  TableIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { useAuth } from "@/hooks/useAuth";

const DashboardSidebar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { isSuperAdmin } = useSuperAdmin();
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <>
      {/* Mobile menu button */}
      <div className="fixed top-4 left-4 z-50 md:hidden">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsOpen(!isOpen)}
          className="rounded-full h-10 w-10 bg-white shadow-md"
        >
          {isOpen ? <X size={18} /> : <Menu size={18} />}
        </Button>
      </div>

      {/* Sidebar */}
      <div
        className={`h-screen bg-white border-r flex-shrink-0 overflow-y-auto transition-all duration-300 ${
          isOpen ? "fixed inset-0 z-40 w-64" : "hidden md:block md:w-64"
        }`}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <Link to="/" className="flex items-center">
              <span className="text-navy text-2xl font-bold">
                Cardápio<span className="text-orange">Pronto</span>
              </span>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsOpen(false)}
            >
              <X size={18} />
            </Button>
          </div>

          <div className="space-y-1">
            <Link
              to="/dashboard"
              className="flex items-center px-3 py-2 text-sm rounded-md text-navy hover:bg-beige/20"
              onClick={() => setIsOpen(false)}
            >
              <Home className="mr-3 h-4 w-4" />
              Dashboard
            </Link>
            <Link
              to="/pdv"
              className="flex items-center px-3 py-2 text-sm rounded-md text-navy hover:bg-beige/20"
              onClick={() => setIsOpen(false)}
            >
              <CreditCard className="mr-3 h-4 w-4" />
              PDV
            </Link>
            <Link
              to="/pedidos"
              className="flex items-center px-3 py-2 text-sm rounded-md text-navy hover:bg-beige/20"
              onClick={() => setIsOpen(false)}
            >
              <ShoppingBasket className="mr-3 h-4 w-4" />
              Pedidos
            </Link>
            <Link
              to="/produtos"
              className="flex items-center px-3 py-2 text-sm rounded-md text-navy hover:bg-beige/20"
              onClick={() => setIsOpen(false)}
            >
              <Package2 className="mr-3 h-4 w-4" />
              Produtos
            </Link>
            <Link
              to="/cardapio"
              className="flex items-center px-3 py-2 text-sm rounded-md text-navy hover:bg-beige/20"
              onClick={() => setIsOpen(false)}
            >
              <Store className="mr-3 h-4 w-4" />
              Menu Digital
            </Link>
            <Link
              to="/funcionarios"
              className="flex items-center px-3 py-2 text-sm rounded-md text-navy hover:bg-beige/20"
              onClick={() => setIsOpen(false)}
            >
              <UserRound className="mr-3 h-4 w-4" />
              Funcionários
            </Link>
            <Link
              to="/areas"
              className="flex items-center px-3 py-2 text-sm rounded-md text-navy hover:bg-beige/20"
              onClick={() => setIsOpen(false)}
            >
              <MapPin className="mr-3 h-4 w-4" />
              Áreas
            </Link>
            <Link
              to="/mesas"
              className="flex items-center px-3 py-2 text-sm rounded-md text-navy hover:bg-beige/20"
              onClick={() => setIsOpen(false)}
            >
              <TableIcon className="mr-3 h-4 w-4" />
              Mesas
            </Link>
            <Link
              to="/assinaturas"
              className="flex items-center px-3 py-2 text-sm rounded-md text-navy hover:bg-beige/20"
              onClick={() => setIsOpen(false)}
            >
              <BarChart3 className="mr-3 h-4 w-4" />
              Assinatura
            </Link>
            <Link
              to="/relatorios"
              className="flex items-center px-3 py-2 text-sm rounded-md text-navy hover:bg-beige/20"
              onClick={() => setIsOpen(false)}
            >
              <BarChart3 className="mr-3 h-4 w-4" />
              Relatórios
            </Link>
          </div>

          <Separator className="my-4" />

          <div className="space-y-1">
            <Link
              to="/configuracoes"
              className="flex items-center px-3 py-2 text-sm rounded-md text-navy hover:bg-beige/20"
              onClick={() => setIsOpen(false)}
            >
              <Settings className="mr-3 h-4 w-4" />
              Configurações
            </Link>
            {isSuperAdmin && (
              <Link
                to="/admin"
                className="flex items-center px-3 py-2 text-sm rounded-md bg-green/10 text-green hover:bg-green/20"
                onClick={() => setIsOpen(false)}
              >
                <UserRound className="mr-3 h-4 w-4" />
                Admin
              </Link>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center px-3 py-2 text-sm rounded-md w-full text-left text-red-500 hover:bg-red-50"
            >
              <LogOut className="mr-3 h-4 w-4" />
              Sair
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default DashboardSidebar;
