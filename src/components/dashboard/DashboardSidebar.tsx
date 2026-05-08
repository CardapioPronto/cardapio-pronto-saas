
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  CreditCard,
  Home,
  Package2,
  Settings,
  ShoppingBasket,
  UserRound,
  Store,
  LogOut,
  TableIcon,
  Headphones,
  Tags,
  Shield,
  ShieldCheck,
  Workflow,
  ChefHat,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { useAuth } from "@/hooks/useAuth";
import { usePermissionsV2 } from "@/hooks/usePermissionsV2";
import { useUserSession } from "@/hooks/useUserSession";
import { PermissionType } from "@/types/employee";
import { cn } from "@/lib/utils";
import pubfyLogo from "@/assets/pubfy-navbar-logo.png";

type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  permissions?: PermissionType[];
  activePaths?: string[];
  /** se true, exige TODAS as permissões; se false ou omitido, exige PELO MENOS UMA */
  all?: boolean;
};

interface DashboardSidebarProps {
  className?: string;
  onNavigate?: () => void;
}

const operationalLinks: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: Home, permissions: ["dashboard_view"] },
  { to: "/pdv", label: "PDV", icon: CreditCard, permissions: ["pdv_access"] },
  { to: "/pedidos", label: "Pedidos", icon: ShoppingBasket, permissions: ["orders_view"] },
  { to: "/cozinha", label: "Cozinha", icon: ChefHat, permissions: ["orders_view"] },
  { to: "/produtos", label: "Produtos", icon: Package2, permissions: ["products_view"] },
  { to: "/categorias", label: "Categorias", icon: Tags, permissions: ["products_view"] },
  { to: "/cardapio", label: "Menu Digital", icon: Store, permissions: ["products_view"] },
  { to: "/mesas", label: "Áreas e Mesas", icon: TableIcon, permissions: ["settings_view"] },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3, permissions: ["reports_view"] },
];

const communicationLinks: NavItem[] = [
  {
    to: "/atendimento",
    label: "Atendimento WhatsApp",
    icon: Headphones,
    permissions: [
      "whatsapp_manage",
      "whatsapp_manage_instances",
      "whatsapp_take_conversations",
      "whatsapp_reply_as_human",
      "whatsapp_view_all_conversations",
      "whatsapp_configure_automation",
    ],
  },
  {
    to: "/automacoes",
    label: "Automações",
    icon: Workflow,
    permissions: [
      "settings_manage",
      "settings_integrations_manage",
      "whatsapp_manage",
      "whatsapp_manage_instances",
      "whatsapp_configure_automation",
    ],
    activePaths: ["/automacoes", "/email-integracao", "/ifood-integracao", "/pagarme-config"],
  },
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

const DashboardSidebar = ({ className, onNavigate }: DashboardSidebarProps) => {
  const { isSuperAdmin } = useSuperAdmin();
  const { signOut } = useAuth();
  const { hasAnyPermission, hasPermission, loading } = usePermissionsV2();
  const { appUser } = useUserSession();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await signOut();
    onNavigate?.();
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
    const active =
      location.pathname === item.to ||
      (item.to === "/mesas" && location.pathname === "/areas") ||
      !!item.activePaths?.includes(location.pathname);
    return (
      <Link
        key={item.to}
        to={item.to}
        onClick={onNavigate}
        className={cn(
          "flex min-h-10 items-center rounded-md px-3 py-2 text-sm transition-colors",
          active
            ? "bg-primary/10 text-primary font-medium"
            : "text-foreground hover:bg-muted"
        )}
      >
        <Icon className="mr-3 h-4 w-4 flex-shrink-0" />
        <span className="truncate">{item.label}</span>
      </Link>
    );
  };

  const visibleOperational = operationalLinks.filter(canSee);
  const visibleCommunication = communicationLinks.filter(canSee);
  const visibleAdmin = adminLinks.filter(canSee);

  return (
    <aside
      className={cn(
        "hidden h-full w-64 flex-shrink-0 flex-col border-r bg-background md:flex",
        className
      )}
    >
      <div className="flex h-full min-h-0 flex-col">
        <div className="px-5 pb-4 pt-5">
          <Link to="/" className="inline-flex items-center" onClick={onNavigate}>
            <img src={pubfyLogo} alt="Pubfy" className="h-12 w-auto object-contain" />
          </Link>
        </div>

        {appUser && (
          <div className="mx-4 mb-4 rounded-md border bg-muted/35 p-3">
            <p className="truncate text-sm font-medium" title={appUser.name || appUser.email}>
              {appUser.name || appUser.email}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {userTypeLabel(appUser.user_type)}
              </Badge>
              {isSuperAdmin && (
                <Badge className="bg-primary/15 text-xs text-primary hover:bg-primary/20">
                  <ShieldCheck className="mr-1 h-3 w-3" />
                  Super Admin
                </Badge>
              )}
            </div>
          </div>
        )}

        <nav className="dashboard-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pb-4">
          {loading ? (
            <div className="space-y-2 pt-1">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded bg-muted/50" />
              ))}
            </div>
          ) : (
            <div className="space-y-1">
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
                    className="flex min-h-10 items-center rounded-md bg-primary/10 px-3 py-2 text-sm text-primary hover:bg-primary/20"
                    onClick={onNavigate}
                  >
                    <Shield className="mr-3 h-4 w-4 flex-shrink-0" />
                    <span className="truncate">Painel Admin</span>
                  </Link>
                </>
              )}
            </div>
          )}
        </nav>

        {!loading && (
          <div className="border-t p-4">
            <button
              onClick={handleLogout}
              className="flex min-h-10 w-full items-center rounded-md px-3 py-2 text-left text-sm text-destructive transition-colors hover:bg-destructive/10"
            >
              <LogOut className="mr-3 h-4 w-4 flex-shrink-0" />
              <span className="truncate">Sair</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};

export default DashboardSidebar;
