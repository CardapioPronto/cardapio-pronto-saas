
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
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
  Bot,
  Headphones,
  Tags,
  Shield,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { useAuth } from "@/hooks/useAuth";
import { usePermissionsV2 } from "@/hooks/usePermissionsV2";
import { useUserSession } from "@/hooks/useUserSession";
import { PermissionType } from "@/types/employee";
import { cn } from "@/lib/utils";

type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  permissions?: PermissionType[];
  /** se true, exige TODAS as permissões; se false ou omitido, exige PELO MENOS UMA */
  all?: boolean;
};

const operationalLinks: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: Home, permissions: ["dashboard_view"] },
  { to: "/pdv", label: "PDV", icon: CreditCard, permissions: ["pdv_access"] },
  { to: "/pedidos", label: "Pedidos", icon: ShoppingBasket, permissions: ["orders_view"] },
  { to: "/produtos", label: "Produtos", icon: Package2, permissions: ["products_view"] },
  { to: "/categorias", label: "Categorias", icon: Tags, permissions: ["products_view"] },
  { to: "/cardapio", label: "Menu Digital", icon: Store, permissions: ["products_view"] },
  { to: "/areas", label: "Áreas", icon: MapPin, permissions: ["settings_view"] },
  { to: "/mesas", label: "Mesas", icon: TableIcon, permissions: ["settings_view"] },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3, permissions: ["reports_view"] },
];

const communicationLinks: NavItem[] = [
  { to: "/atendimento", label: "Atendimento WhatsApp", icon: Headphones, permissions: ["whatsapp_manage"] },
];

const adminLinks: NavItem[] = [
  { to: "/funcionarios", label: "Funcionários", icon: UserRound, permissions: ["employees_manage"] },
  { to: "/assinaturas", label: "Assinatura", icon: CreditCard, permissions: ["subscription_view"] },
  { to: "/configuracoes", label: "Configurações", icon: Settings, permissions: ["settings_view"] },
];

const userTypeLabel = (t?: string | null) => {
  switch (t) {
    case "owner": return "Dono";
    case "manager": return "Gerente";
    case "employee": return "Funcionário";
    default: return "Usuário";
  }
};

const DashboardSidebar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { isSuperAdmin } = useSuperAdmin();
  const { signOut } = useAuth();
  const { hasAnyPermission, hasPermission, loading } = usePermissionsV2();
  const { appUser } = useUserSession();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const canSee = (item: NavItem) => {
    if (!item.permissions || item.permissions.length === 0) return true;
    return item.all
      ? item.permissions.every(hasPermission)
      : hasAnyPermission(item.permissions);
  };

  const renderLink = (item: NavItem) => {
    const Icon = item.icon;
    const active = location.pathname === item.to;
    return (
      <Link
        key={item.to}
        to={item.to}
        onClick={() => setIsOpen(false)}
        className={cn(
          "flex items-center px-3 py-2 text-sm rounded-md transition-colors",
          active
            ? "bg-primary/10 text-primary font-medium"
            : "text-foreground hover:bg-muted"
        )}
      >
        <Icon className="mr-3 h-4 w-4" />
        {item.label}
      </Link>
    );
  };

  const visibleOperational = operationalLinks.filter(canSee);
  const visibleCommunication = communicationLinks.filter(canSee);
  const visibleAdmin = adminLinks.filter(canSee);

  return (
    <>
      {/* Mobile menu button */}
      <div className="fixed top-4 left-4 z-50 md:hidden">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsOpen(!isOpen)}
          className="rounded-full h-10 w-10 bg-background shadow-md"
        >
          {isOpen ? <X size={18} /> : <Menu size={18} />}
        </Button>
      </div>

      <aside
        className={cn(
          "h-screen bg-background border-r flex-shrink-0 overflow-y-auto transition-all duration-300",
          isOpen ? "fixed inset-0 z-40 w-64" : "hidden md:block md:w-64"
        )}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <Link to="/" className="flex items-center">
              <span className="text-foreground text-2xl font-bold">Pubfy</span>
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

          {/* Identificação do usuário e cargo */}
          {appUser && (
            <div className="mb-6 p-3 rounded-lg bg-muted/50">
              <p className="text-sm font-medium truncate" title={appUser.name || appUser.email}>
                {appUser.name || appUser.email}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-xs">
                  {userTypeLabel(appUser.user_type)}
                </Badge>
                {isSuperAdmin && (
                  <Badge className="text-xs bg-primary/15 text-primary hover:bg-primary/20">
                    <ShieldCheck className="h-3 w-3 mr-1" />
                    Super Admin
                  </Badge>
                )}
              </div>
            </div>
          )}

          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-9 bg-muted/50 rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              {visibleOperational.length > 0 && (
                <div className="space-y-1">{visibleOperational.map(renderLink)}</div>
              )}

              {visibleCommunication.length > 0 && (
                <>
                  <Separator className="my-4" />
                  <div className="space-y-1">{visibleCommunication.map(renderLink)}</div>
                </>
              )}

              {visibleAdmin.length > 0 && (
                <>
                  <Separator className="my-4" />
                  <div className="space-y-1">{visibleAdmin.map(renderLink)}</div>
                </>
              )}

              {isSuperAdmin && (
                <>
                  <Separator className="my-4" />
                  <Link
                    to="/admin"
                    className="flex items-center px-3 py-2 text-sm rounded-md bg-primary/10 text-primary hover:bg-primary/20"
                    onClick={() => setIsOpen(false)}
                  >
                    <Shield className="mr-3 h-4 w-4" />
                    Painel Admin
                  </Link>
                </>
              )}

              <Separator className="my-4" />
              <button
                onClick={handleLogout}
                className="flex items-center px-3 py-2 text-sm rounded-md w-full text-left text-destructive hover:bg-destructive/10"
              >
                <LogOut className="mr-3 h-4 w-4" />
                Sair
              </button>
            </>
          )}
        </div>
      </aside>
    </>
  );
};

export default DashboardSidebar;
