
import React, { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from "@/lib/utils";
import { 
  Users, Settings, CreditCard, Home, BarChart3, Shield, List, Database, Layers
} from "lucide-react";

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
}

const AdminLayout = ({ children, title }: AdminLayoutProps) => {
  const location = useLocation();

  const menuItems = [
    { icon: Home, label: "Dashboard", href: "/admin" },
    { icon: CreditCard, label: "Assinaturas", href: "/admin/subscriptions" },
    { icon: Users, label: "Clientes", href: "/admin/customers" },
    { icon: List, label: "Restaurantes", href: "/admin/restaurants" },
    { icon: Database, label: "Dados do Sistema", href: "/admin/data" },
    { icon: Settings, label: "Configurações", href: "/admin/settings" },
    { icon: BarChart3, label: "Logs e Métricas", href: "/admin/logs" },
    { icon: Shield, label: "Administradores", href: "/admin/admins" },
    { icon: Layers, label: "Planos", href: "/admin/planos" },
  ];

  return (
    <div className="min-h-screen flex bg-slate-100">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-800 text-white shadow-md flex-shrink-0">
        <div className="h-full flex flex-col">
          <div className="p-4 border-b border-slate-700">
            <Link to="/admin" className="flex items-center">
              <span className="text-xl font-bold">Admin <span className="text-orange">Dashboard</span></span>
            </Link>
          </div>
          <nav className="flex-1 p-4">
            <ul className="space-y-1">
              {menuItems.map((item, index) => {
                const isActive = location.pathname === item.href;
                return (
                  <li key={index}>
                    <Link
                      to={item.href}
                      className={cn(
                        "flex items-center py-2 px-3 rounded-md transition-colors",
                        isActive
                          ? "bg-green text-white"
                          : "text-slate-300 hover:bg-slate-700 hover:text-white"
                      )}
                    >
                      <item.icon className="h-5 w-5 mr-3" />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          <div className="p-4 border-t border-slate-700">
            <Link
              to="/dashboard"
              className="flex items-center py-2 px-3 rounded-md text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            >
              <span>Voltar para o App</span>
            </Link>
          </div>
        </div>
      </aside>
      
      {/* Main content */}
      <div className="flex-1 flex flex-col">
        <header className="bg-white shadow-sm">
          <div className="px-6 py-4">
            <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
          </div>
        </header>
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
