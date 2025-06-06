
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { 
  Home, 
  Package, 
  ShoppingCart, 
  Users, 
  Settings, 
  BarChart3, 
  Menu,
  Tags,
  Smartphone,
  CreditCard,
  Shield
} from "lucide-react";
import { usePermissionsV2 } from "@/hooks/usePermissionsV2";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { PermissionType } from "@/types/employee";

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: Home,
    permissions: [] as PermissionType[]
  },
  {
    name: "Produtos",
    href: "/produtos",
    icon: Package,
    permissions: ['products_view'] as PermissionType[]
  },
  {
    name: "Categorias",
    href: "/categorias",
    icon: Tags,
    permissions: ['products_view'] as PermissionType[]
  },
  {
    name: "Pedidos",
    href: "/pedidos",
    icon: ShoppingCart,
    permissions: ['orders_view'] as PermissionType[]
  },
  {
    name: "PDV",
    href: "/pdv",
    icon: CreditCard,
    permissions: ['pdv_access'] as PermissionType[]
  },
  {
    name: "Cardápio Digital",
    href: "/menu-digital",
    icon: Smartphone,
    permissions: ['products_view'] as PermissionType[]
  },
  {
    name: "Funcionários",
    href: "/funcionarios",
    icon: Users,
    permissions: ['employees_manage'] as PermissionType[]
  },
  {
    name: "Relatórios",
    href: "/relatorios",
    icon: BarChart3,
    permissions: ['reports_view'] as PermissionType[]
  },
  {
    name: "Configurações",
    href: "/configuracoes",
    icon: Settings,
    permissions: ['settings_view'] as PermissionType[]
  }
];

const adminNavigation = [
  {
    name: "Admin Dashboard",
    href: "/admin",
    icon: Shield,
    permissions: [] as PermissionType[]
  }
];

interface SidebarProps {
  className?: string;
}

function SidebarContent({ className }: SidebarProps) {
  const location = useLocation();
  const { hasPermission, hasAnyPermission, loading } = usePermissionsV2();
  const { isSuperAdmin } = useSuperAdmin();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  const filteredNavigation = navigation.filter(item => {
    if (item.permissions.length === 0) return true;
    return hasAnyPermission(item.permissions);
  });

  return (
    <div className={cn("pb-12", className)}>
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
            Menu Principal
          </h2>
          <div className="space-y-1">
            {filteredNavigation.map((item) => (
              <Button
                key={item.name}
                variant={location.pathname === item.href ? "secondary" : "ghost"}
                className="w-full justify-start"
                asChild
              >
                <Link to={item.href}>
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.name}
                </Link>
              </Button>
            ))}
          </div>
        </div>

        {isSuperAdmin && (
          <div className="px-3 py-2">
            <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
              Administração
            </h2>
            <div className="space-y-1">
              {adminNavigation.map((item) => (
                <Button
                  key={item.name}
                  variant={location.pathname === item.href ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  asChild
                >
                  <Link to={item.href}>
                    <item.icon className="mr-2 h-4 w-4" />
                    {item.name}
                  </Link>
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function DashboardSidebarV2() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile sidebar */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="shrink-0 md:hidden"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="flex flex-col">
          <nav className="grid gap-2 text-lg font-medium">
            <ScrollArea className="h-full">
              <SidebarContent />
            </ScrollArea>
          </nav>
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar */}
      <div className="hidden border-r bg-muted/40 md:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <ScrollArea className="flex-1">
            <SidebarContent className="px-2" />
          </ScrollArea>
        </div>
      </div>
    </>
  );
}
