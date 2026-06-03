import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PubfyWordmark } from "@/components/brand/PubfyWordmark";
import { useAuth } from "@/hooks/useAuthContext";
import { useUserSession } from "@/hooks/useUserSession";
import { useMemo } from "react";

const navItems = [
  { to: "/indique/painel", label: "Painel" },
  { to: "/indique/materiais", label: "Materiais" },
  { to: "/indique/termos", label: "Termos" },
];

export function AffiliateLayout() {
  const { user, signOut } = useAuth();
  const { appUser } = useUserSession();
  const navigate = useNavigate();
  const restaurantId = useMemo(() => appUser?.restaurant_id ?? null, [appUser?.restaurant_id]);

  return (
    <div className="min-h-screen bg-beige/20 text-navy">
      <header className="sticky top-0 z-20 border-b bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <Link to="/indique" className="flex items-center gap-2">
            <PubfyWordmark className="h-7 w-auto" />
            <span className="rounded-full bg-orange/15 px-2 py-0.5 text-xs font-medium text-orange">
              Indicações
            </span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm md:flex">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `transition ${isActive ? "font-semibold text-orange" : "text-navy/80 hover:text-navy"}`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {restaurantId ? (
              <Button variant="outline" size="sm" className="border-green/40 hover:bg-green/10" asChild>
                <Link to="/dashboard">Meu restaurante</Link>
              </Button>
            ) : null}
            {user ? (
              <Button
                variant="ghost"
                size="sm"
                className="text-navy/80 hover:text-navy"
                onClick={async () => {
                  await signOut();
                  navigate("/indique");
                }}
              >
                Sair
              </Button>
            ) : (
              <Button size="sm" className="bg-green hover:bg-green-dark text-white" asChild>
                <Link to="/login">Entrar</Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 md:py-10">
        <Outlet />
      </main>
    </div>
  );
}
