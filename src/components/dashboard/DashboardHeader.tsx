
import { useState } from "react";
import { Menu, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import DashboardSidebar from "./DashboardSidebar";

interface DashboardHeaderProps {
  title: string;
}

const DashboardHeader = ({ title }: DashboardHeaderProps) => {
  const [notifications, setNotifications] = useState(3);

  return (
    <header className="bg-white border-b py-4 px-6 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0">
            <DashboardSidebar />
          </SheetContent>
        </Sheet>
        <h1 className="text-2xl font-bold text-navy ml-2 md:ml-0">{title}</h1>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative">
          <Button variant="ghost" size="icon">
            <Bell className="h-5 w-5" />
            {notifications > 0 && (
              <span className="absolute -top-1 -right-1 bg-orange text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                {notifications}
              </span>
            )}
          </Button>
        </div>
        <Link to="/configuracoes">
          <div className="w-8 h-8 rounded-full bg-navy flex items-center justify-center text-white cursor-pointer">
            U
          </div>
        </Link>
      </div>
    </header>
  );
};

export default DashboardHeader;
