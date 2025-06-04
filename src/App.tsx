
import { useState, useEffect } from 'react';
import { Routes, Route, BrowserRouter } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Produtos from './pages/Produtos';
import Pedidos from './pages/Pedidos';
import Funcionarios from './pages/Funcionarios';
import Categorias from './pages/Categorias';
import Configuracoes from './pages/Configuracoes';
import Login from './pages/Login';
import { AuthLayout } from './layouts/AuthLayout';
import { MainLayout } from './layouts/MainLayout';
import NotFound from './pages/NotFound';
import { useSession } from './hooks/useSession';
import { initSupabase, setupAuthListeners } from './lib/supabase-init';
import Cadastro from './pages/Cadastro';
import { Toast } from '@/components/ui/toast';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/components/ui/use-toast';
import { Analytics } from '@vercel/analytics/react';
import CardapioPublico from './pages/CardapioPublico';

function App() {
  const { session, isLoading } = useSession();
  const { toast } = useToast();
  const [supabaseReady, setSupabaseReady] = useState(false);

  useEffect(() => {
    const initializeSupabase = async () => {
      const isReady = await initSupabase();
      setSupabaseReady(isReady);

      if (isReady) {
        setupAuthListeners();
      }
    };

    initializeSupabase();
  }, []);

  if (isLoading || !supabaseReady) {
    return (
      <div className="grid h-screen place-items-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-primary text-4xl text-primary animate-spin">
          🍕
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={
            <AuthLayout>
              <Login />
            </AuthLayout>
          } />
          <Route path="/cadastro" element={
            <AuthLayout>
              <Cadastro />
            </AuthLayout>
          } />

          <Route path="/" element={
            <MainLayout>
              <Dashboard />
            </MainLayout>
          } />
          <Route path="/produtos" element={
            <MainLayout>
              <Produtos />
            </MainLayout>
          } />
          <Route path="/pedidos" element={
            <MainLayout>
              <Pedidos />
            </MainLayout>
          } />
          <Route path="/funcionarios" element={
            <MainLayout>
              <Funcionarios />
            </MainLayout>
          } />
          <Route path="/categorias" element={
            <MainLayout>
              <Categorias />
            </MainLayout>
          } />
          <Route path="/configuracoes" element={
            <MainLayout>
              <Configuracoes />
            </MainLayout>
          } />
          
          {/* Rota para cardápio público */}
          <Route path="/cardapio/:slug" element={<CardapioPublico />} />
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      <Toaster />
      <Analytics />
    </div>
  );
}

export default App;
