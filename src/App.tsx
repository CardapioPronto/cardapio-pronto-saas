import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import React from "react";
import { AuthProvider, useAuth } from "./hooks/useAuth";

import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import Dashboard from "./pages/Dashboard";
import MenuDigital from "./pages/MenuDigital";
import PDV from "./pages/PDV";
import Produtos from "./pages/Produtos";
import Assinaturas from "./pages/Assinaturas";
import Configuracoes from "./pages/Configuracoes";
import Pedidos from "./pages/Pedidos";
import Cadastro from "./pages/Cadastro";
import CardapioPublico from "./pages/CardapioPublico";
import FAQ from "./pages/FAQ";
import Demonstracao from "./pages/Demonstracao";
import Funcionalidades from "./pages/Funcionalidades";
import Contato from "./pages/Contato";
import Admin from "./pages/Admin";
import PagarmeConfig from "./pages/PagarmeConfig";
import IfoodIntegracao from "./pages/IfoodIntegracao";
import CreateInitialAdmin from "./pages/CreateInitialAdmin";

// Importamos as novas páginas
import CardapioDigital from "./pages/CardapioDigital";
import PDVOnline from "./pages/PDVOnline";
import GestaoCompleta from "./pages/GestaoCompleta";
import Precos from "./pages/Precos";
import Categorias from "./pages/Categorias";

// Importamos as páginas de administração
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminSuperAdmins from "./pages/admin/AdminSuperAdmins";
import AdminSubscriptions from "./pages/admin/AdminSubscriptions";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminLogs from "./pages/admin/AdminLogs";
import { AdminProtectedRoute } from "./components/admin/AdminProtectedRoute";

const queryClient = new QueryClient();

// Componente de proteção de rotas
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="h-screen w-screen flex items-center justify-center">Carregando...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Rotas públicas */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/cadastro" element={<Cadastro />} />
            <Route path="/teste-gratis" element={<Cadastro />} />
            <Route path="/menu/:id" element={<CardapioPublico />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/demonstracao" element={<Demonstracao />} />
            <Route path="/funcionalidades" element={<Funcionalidades />} />
            <Route path="/contato" element={<Contato />} />
            <Route path="/cardapio-digital" element={<CardapioDigital />} />
            <Route path="/pdv-online" element={<PDVOnline />} />
            <Route path="/gestao-completa" element={<GestaoCompleta />} />
            <Route path="/precos" element={<Precos />} />
            <Route path="/create-initial-admin" element={<CreateInitialAdmin />} />
            <Route path="/categorias" element={<Categorias />} />
            
            {/* Rotas protegidas */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/pdv" element={<ProtectedRoute><PDV /></ProtectedRoute>} />
            <Route path="/cardapio" element={<ProtectedRoute><MenuDigital /></ProtectedRoute>} />
            <Route path="/produtos" element={<ProtectedRoute><Produtos /></ProtectedRoute>} />
            <Route path="/pedidos" element={<ProtectedRoute><Pedidos /></ProtectedRoute>} />
            <Route path="/assinaturas" element={<ProtectedRoute><Assinaturas /></ProtectedRoute>} />
            <Route path="/configuracoes" element={<ProtectedRoute><Configuracoes /></ProtectedRoute>} />
            <Route path="/pagarme-config" element={<ProtectedRoute><PagarmeConfig /></ProtectedRoute>} />
            <Route path="/ifood-integracao" element={<ProtectedRoute><IfoodIntegracao /></ProtectedRoute>} />
            
            {/* Rotas de administração */}
            <Route path="/admin" element={<AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>} />
            <Route path="/admin/subscriptions" element={<AdminProtectedRoute><AdminSubscriptions /></AdminProtectedRoute>} />
            <Route path="/admin/settings" element={<AdminProtectedRoute><AdminSettings /></AdminProtectedRoute>} />
            <Route path="/admin/logs" element={<AdminProtectedRoute><AdminLogs /></AdminProtectedRoute>} />
            <Route path="/admin/admins" element={<AdminProtectedRoute><AdminSuperAdmins /></AdminProtectedRoute>} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
