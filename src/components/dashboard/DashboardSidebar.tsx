
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Home, ShoppingCart, Menu, Package, FileText, CreditCard, Settings, LogOut } from "lucide-react";

const sidebarItems = [
  { icon: Home, label: "Dashboard", href: "/dashboard" },
  { icon: ShoppingCart, label: "PDV", href: "/pdv" },
  { icon: Menu, label: "Cardápio Digital", href: "/cardapio" },
  { icon: Package, label: "Produtos", href: "/produtos" },
  { icon: FileText, label: "Pedidos", href: "/pedidos" },
  { icon: CreditCard, label: "Assinaturas", href: "/assinaturas" },
  { icon: Settings, label: "Configurações", href: "/configuracoes" },
];

const integrationItems = [
  { label: "iFood", href: "/ifood-integracao" },
  { label: "Pagar.me", href: "/pagarme-config" },
];

const DashboardSidebar = () => {
  const location = useLocation();

  return (
    <aside className="w-64 bg-white shadow-md flex-shrink-0 hidden md:block">
      <div className="h-full flex flex-col">
        <div className="p-4 border-b">
          <Link to="/dashboard" className="flex items-center">
            <span className="text-navy text-xl font-bold">Cardápio<span className="text-orange">Pronto</span></span>
          </Link>
        </div>
        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            {sidebarItems.map((item, index) => {
              const isActive = location.pathname === item.href;
              return (
                <li key={index}>
                  <Link
                    to={item.href}
                    className={cn(
                      "flex items-center py-2 px-3 rounded-md transition-colors",
                      isActive
                        ? "bg-green/10 text-green"
                        : "text-navy/70 hover:bg-beige/30 hover:text-navy"
                    )}
                  >
                    <item.icon className="h-5 w-5 mr-3" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
            
            <li className="pt-4">
              <div className="px-3 mb-2 text-xs font-semibold text-muted-foreground">
                Integrações
              </div>
              <ul className="space-y-1">
                {integrationItems.map((item, index) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <li key={index}>
                      <Link
                        to={item.href}
                        className={cn(
                          "flex items-center py-2 px-3 rounded-md transition-colors",
                          isActive
                            ? "bg-green/10 text-green"
                            : "text-navy/70 hover:bg-beige/30 hover:text-navy"
                        )}
                      >
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </li>
          </ul>
        </nav>
        <div className="p-4 border-t">
          <Link
            to="/login"
            className="flex items-center py-2 px-3 rounded-md text-navy/70 hover:bg-beige/30 hover:text-navy transition-colors"
          >
            <LogOut className="h-5 w-5 mr-3" />
            <span>Sair</span>
          </Link>
        </div>
      </div>
    </aside>
  );
};

export default DashboardSidebar;
