
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Menu, Bell, CheckCircle2, Loader2, Settings, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useDashboardNotifications } from "@/hooks/useDashboardNotifications";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import DashboardSidebar from "./DashboardSidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { cleanupStaleRadixOverlays } from "@/lib/radixOverlayCleanup";

interface DashboardHeaderProps {
  title: string;
}

const DashboardHeader = ({ title }: DashboardHeaderProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const isMobile = useIsMobile();
  const location = useLocation();
  const { user } = useCurrentUser();
  const { notifications, unreadCount, loading } = useDashboardNotifications();
  const { isOnline } = useNetworkStatus();

  useEffect(() => {
    setMenuOpen(false);
    cleanupStaleRadixOverlays();
  }, [location.pathname]);

  useEffect(() => {
    if (!isMobile) {
      setMenuOpen(false);
    }
  }, [isMobile]);

  const initials = (user?.name || user?.email || "Usuário")
    .split(" ")
    .map(part => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="z-10 flex h-16 flex-shrink-0 items-center justify-between border-b bg-white px-4 sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center">
        {isMobile && (
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="mr-2">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 sm:max-w-72">
              <SheetTitle className="sr-only">Menu do dashboard</SheetTitle>
              <DashboardSidebar
                className="flex w-full border-r-0"
                onNavigate={() => setMenuOpen(false)}
              />
            </SheetContent>
          </Sheet>
        )}
        <h1 className="truncate text-xl font-semibold text-navy sm:text-2xl">{title}</h1>
      </div>
      <div className="flex flex-shrink-0 items-center gap-2 sm:gap-4">
        <Badge
          variant="outline"
          className={
            isOnline
              ? "hidden border-emerald-200 bg-emerald-50 text-emerald-700 sm:inline-flex"
              : "border-red-200 bg-red-50 text-red-700"
          }
          aria-live="polite"
        >
          {isOnline ? <Wifi className="mr-1 h-3.5 w-3.5" /> : <WifiOff className="mr-1 h-3.5 w-3.5" />}
          {isOnline ? "Online" : "Offline"}
        </Badge>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange px-1 text-[10px] leading-none text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0">
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-semibold">Notificações</p>
                <p className="text-xs text-muted-foreground">Pontos que precisam de atenção</p>
              </div>
              {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
            <Separator />
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 px-6 py-8 text-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                <div>
                  <p className="text-sm font-medium">Tudo em dia</p>
                  <p className="text-xs text-muted-foreground">
                    Pedidos, atendimento e instâncias estão sem pendências relevantes.
                  </p>
                </div>
              </div>
            ) : (
              <ScrollArea className="max-h-80">
                <div className="p-2">
                  {notifications.map(notification => {
                    const Icon = notification.icon;
                    return (
                      <Link
                        key={notification.id}
                        to={notification.href}
                        className="flex gap-3 rounded-md p-3 transition-colors hover:bg-muted"
                      >
                        <div className="mt-0.5 rounded-md bg-muted p-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-sm font-medium">{notification.title}</p>
                            <Badge variant={notification.tone === "danger" ? "destructive" : "secondary"}>
                              {notification.count}
                            </Badge>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">{notification.description}</p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </PopoverContent>
        </Popover>

        <Link to="/configuracoes" aria-label="Abrir configurações do usuário">
          <Avatar className="h-9 w-9 border bg-navy text-white">
            <AvatarImage src={user?.avatar_url || undefined} alt={user?.name || "Usuário"} />
            <AvatarFallback className="bg-navy text-sm font-semibold text-white">
              {initials || <Settings className="h-4 w-4" />}
            </AvatarFallback>
          </Avatar>
        </Link>
      </div>
    </header>
  );
};

export default DashboardHeader;
