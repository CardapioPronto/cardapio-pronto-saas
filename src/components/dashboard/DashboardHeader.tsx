
import { useState } from "react";
import { Menu, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import DashboardSidebar from "./DashboardSidebar";

interface DashboardHeaderProps {
  title: string;
}

const DashboardHeader = ({ title }: DashboardHeaderProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const notifications = 3;

  return (
    <header className="z-10 flex h-16 flex-shrink-0 items-center justify-between border-b bg-white px-4 sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center">
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="mr-2 md:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0 sm:max-w-72">
            <SheetTitle className="sr-only">Menu do dashboard</SheetTitle>
            <DashboardSidebar
              className="flex w-full border-r-0 md:flex"
              onNavigate={() => setMenuOpen(false)}
            />
          </SheetContent>
        </Sheet>
        <h1 className="truncate text-xl font-semibold text-navy sm:text-2xl">{title}</h1>
      </div>
      <div className="flex flex-shrink-0 items-center gap-2 sm:gap-4">
        <div className="relative">
          <Button variant="ghost" size="icon">
            <Bell className="h-5 w-5" />
            {notifications > 0 && (
              <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-orange text-xs text-white">
                {notifications}
              </span>
            )}
          </Button>
        </div>
        <Link to="/configuracoes">
          <div className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-navy text-white">
            U
          </div>
        </Link>
      </div>
    </header>
  );
};

export default DashboardHeader;
