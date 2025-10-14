
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
import AdminContact from '@/pages/admin/AdminContact';
import AdminContactRecipients from '@/pages/admin/AdminContactRecipients';
import { AuthLayout } from '@/layouts/AuthLayout';
import { MainLayout } from '@/layouts/MainLayout';
import { AdminProtectedRoute } from '@/components/admin/AdminProtectedRoute';
import { ProtectedRoute } from '@/components/ProtectedRoute';

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
        <ProtectedRoute>
          <MainLayout>
            <Dashboard />
          </MainLayout>
        </ProtectedRoute>
      } />
      <Route path="/pdv" element={
        <ProtectedRoute requiredPermissions={['pdv_access']}>
          <MainLayout>
            <PDV />
          </MainLayout>
        </ProtectedRoute>
      } />
      <Route path="/menu-digital" element={
        <ProtectedRoute requiredPermissions={['products_view']}>
          <MainLayout>
            <MenuDigital />
          </MainLayout>
        </ProtectedRoute>
      } />
      <Route path="/cardapio" element={
        <ProtectedRoute requiredPermissions={['products_view']}>
          <MainLayout>
            <MenuDigital />
          </MainLayout>
        </ProtectedRoute>
      } />
      <Route path="/produtos" element={
        <ProtectedRoute requiredPermissions={['products_view']}>
          <MainLayout>
            <Produtos />
          </MainLayout>
        </ProtectedRoute>
      } />
      <Route path="/pedidos" element={
        <ProtectedRoute requiredPermissions={['orders_view']}>
          <MainLayout>
            <Pedidos />
          </MainLayout>
        </ProtectedRoute>
      } />
      <Route path="/funcionarios" element={
        <ProtectedRoute requiredPermissions={['employees_manage']}>
          <MainLayout>
            <FuncionariosV2 />
          </MainLayout>
        </ProtectedRoute>
      } />
      <Route path="/assinaturas" element={
        <ProtectedRoute>
          <MainLayout>
            <Assinaturas />
          </MainLayout>
        </ProtectedRoute>
      } />
      <Route path="/configuracoes" element={
        <ProtectedRoute requiredPermissions={['settings_view']}>
          <MainLayout>
            <Configuracoes />
          </MainLayout>
        </ProtectedRoute>
      } />
      <Route path="/pagarme-config" element={
        <ProtectedRoute requiredPermissions={['settings_manage']}>
          <MainLayout>
            <PagarmeConfig />
          </MainLayout>
        </ProtectedRoute>
      } />
      <Route path="/ifood-integracao" element={
        <ProtectedRoute requiredPermissions={['settings_manage']}>
          <MainLayout>
            <IfoodIntegracao />
          </MainLayout>
        </ProtectedRoute>
      } />
      <Route path="/categorias" element={
        <ProtectedRoute requiredPermissions={['products_view']}>
          <MainLayout>
            <Categorias />
          </MainLayout>
        </ProtectedRoute>
      } />
      <Route path="/relatorios" element={
        <ProtectedRoute requiredPermissions={['reports_view']}>
          <MainLayout>
            <Relatorios />
          </MainLayout>
        </ProtectedRoute>
      } />
      <Route path="/areas" element={
        <ProtectedRoute requiredPermissions={['settings_manage']}>
          <MainLayout>
            <Areas />
          </MainLayout>
        </ProtectedRoute>
      } />
      <Route path="/mesas" element={
        <ProtectedRoute requiredPermissions={['settings_manage']}>
          <MainLayout>
            <Mesas />
          </MainLayout>
        </ProtectedRoute>
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
      <Route path="/admin/contact" element={
        <AdminProtectedRoute>
          <AdminContact />
        </AdminProtectedRoute>
      } />
      <Route path="/admin/contact-recipients" element={
        <AdminProtectedRoute>
          <AdminContactRecipients />
        </AdminProtectedRoute>
      } />
      
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;
