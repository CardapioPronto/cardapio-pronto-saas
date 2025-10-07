
import { Routes, Route } from 'react-router-dom';
import LandingPage from '@/pages/LandingPage';
import Dashboard from '@/pages/Dashboard';
import Produtos from '@/pages/Produtos';
import Pedidos from '@/pages/Pedidos';
import FuncionariosV2 from '@/pages/FuncionariosV2';
import Categorias from '@/pages/Categorias';
import Configuracoes from '@/pages/Configuracoes';
import Login from '@/pages/Login';
import Cadastro from '@/pages/Cadastro';
import NotFound from '@/pages/NotFound';
import CardapioPublico from '@/pages/CardapioPublico';
import FAQ from '@/pages/FAQ';
import Demonstracao from '@/pages/Demonstracao';
import Funcionalidades from '@/pages/Funcionalidades';
import Contato from '@/pages/Contato';
import CardapioDigital from '@/pages/CardapioDigital';
import PDVOnline from '@/pages/PDVOnline';
import GestaoCompleta from '@/pages/GestaoCompleta';
import Precos from '@/pages/Precos';
import CreateInitialAdmin from '@/pages/CreateInitialAdmin';
import PDV from '@/pages/PDV';
import MenuDigital from '@/pages/MenuDigital';
import Assinaturas from '@/pages/Assinaturas';
import PagarmeConfig from '@/pages/PagarmeConfig';
import IfoodIntegracao from '@/pages/IfoodIntegracao';
import Relatorios from '@/pages/Relatorios';
import Areas from '@/pages/Areas';
import Mesas from '@/pages/Mesas';
import Admin from '@/pages/Admin';
import AdminSubscriptions from '@/pages/admin/AdminSubscriptions';
import AdminSettings from '@/pages/admin/AdminSettings';
import AdminLogs from '@/pages/admin/AdminLogs';
import AdminSuperAdmins from '@/pages/admin/AdminSuperAdmins';
import AdminPlanos from '@/pages/admin/AdminPlanos';
import AdminBlog from '@/pages/admin/AdminBlog';
import Blog from '@/pages/Blog';
import BlogPost from '@/pages/BlogPost';
import { AuthLayout } from '@/layouts/AuthLayout';
import { MainLayout } from '@/layouts/MainLayout';
import { AdminProtectedRoute } from '@/components/admin/AdminProtectedRoute';

const AppRoutes = () => {
  return (
    <Routes>
      {/* Rotas públicas */}
      <Route path="/" element={<LandingPage />} />
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
      <Route path="/teste-gratis" element={
        <AuthLayout>
          <Cadastro />
        </AuthLayout>
      } />
      <Route path="/menu/:id" element={<CardapioPublico />} />
      <Route path="/cardapio/:slug" element={<CardapioPublico />} />
      <Route path="/faq" element={<FAQ />} />
      <Route path="/demonstracao" element={<Demonstracao />} />
      <Route path="/funcionalidades" element={<Funcionalidades />} />
      <Route path="/contato" element={<Contato />} />
      <Route path="/cardapio-digital" element={<CardapioDigital />} />
      <Route path="/pdv-online" element={<PDVOnline />} />
      <Route path="/gestao-completa" element={<GestaoCompleta />} />
      <Route path="/precos" element={<Precos />} />
      <Route path="/create-initial-admin" element={<CreateInitialAdmin />} />
      <Route path="/blog" element={<Blog />} />
      <Route path="/blog/:slug" element={<BlogPost />} />
      
      {/* Rotas protegidas */}
      <Route path="/dashboard" element={
        <MainLayout>
          <Dashboard />
        </MainLayout>
      } />
      <Route path="/pdv" element={
        <MainLayout>
          <PDV />
        </MainLayout>
      } />
      <Route path="/cardapio" element={
        <MainLayout>
          <MenuDigital />
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
          <FuncionariosV2 />
        </MainLayout>
      } />
      <Route path="/assinaturas" element={
        <MainLayout>
          <Assinaturas />
        </MainLayout>
      } />
      <Route path="/configuracoes" element={
        <MainLayout>
          <Configuracoes />
        </MainLayout>
      } />
      <Route path="/pagarme-config" element={
        <MainLayout>
          <PagarmeConfig />
        </MainLayout>
      } />
      <Route path="/ifood-integracao" element={
        <MainLayout>
          <IfoodIntegracao />
        </MainLayout>
      } />
      <Route path="/categorias" element={
        <MainLayout>
          <Categorias />
        </MainLayout>
      } />
      <Route path="/relatorios" element={
        <MainLayout>
          <Relatorios />
        </MainLayout>
      } />
      <Route path="/areas" element={
        <MainLayout>
          <Areas />
        </MainLayout>
      } />
      <Route path="/mesas" element={
        <MainLayout>
          <Mesas />
        </MainLayout>
      } />
      
      {/* Rotas de administração */}
      <Route path="/admin" element={
        <AdminProtectedRoute>
          <Admin />
        </AdminProtectedRoute>
      } />
      <Route path="/admin/subscriptions" element={
        <AdminProtectedRoute>
          <AdminSubscriptions />
        </AdminProtectedRoute>
      } />
      <Route path="/admin/settings" element={
        <AdminProtectedRoute>
          <AdminSettings />
        </AdminProtectedRoute>
      } />
      <Route path="/admin/logs" element={
        <AdminProtectedRoute>
          <AdminLogs />
        </AdminProtectedRoute>
      } />
      <Route path="/admin/admins" element={
        <AdminProtectedRoute>
          <AdminSuperAdmins />
        </AdminProtectedRoute>
      } />
      <Route path="/admin/planos" element={
        <AdminProtectedRoute>
          <AdminPlanos />
        </AdminProtectedRoute>
      } />
      <Route path="/admin/blog" element={
        <AdminProtectedRoute>
          <AdminBlog />
        </AdminProtectedRoute>
      } />
      
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;
