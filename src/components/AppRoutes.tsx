
import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthLayout } from '@/layouts/AuthLayout';
import { MainLayout } from '@/layouts/MainLayout';
import { AdminProtectedRoute } from '@/components/admin/AdminProtectedRoute';
import { ProtectedRoute } from '@/components/ProtectedRoute';

const LandingPage = lazy(() => import('@/pages/LandingPage'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Produtos = lazy(() => import('@/pages/Produtos'));
const Pedidos = lazy(() => import('@/pages/Pedidos'));
const Cozinha = lazy(() => import('@/pages/Cozinha'));
const FuncionariosV2 = lazy(() => import('@/pages/FuncionariosV2'));
const Categorias = lazy(() => import('@/pages/Categorias'));
const Configuracoes = lazy(() => import('@/pages/Configuracoes'));
const Login = lazy(() => import('@/pages/Login'));
const Cadastro = lazy(() => import('@/pages/Cadastro'));
const EsqueciSenha = lazy(() => import('@/pages/EsqueciSenha'));
const ResetPassword = lazy(() => import('@/pages/ResetPassword'));
const NotFound = lazy(() => import('@/pages/NotFound'));
const CardapioPublico = lazy(() => import('@/pages/CardapioPublico'));
const AcompanharPedido = lazy(() => import('@/pages/AcompanharPedido'));
const FAQ = lazy(() => import('@/pages/FAQ'));
const Demonstracao = lazy(() => import('@/pages/Demonstracao'));
const Funcionalidades = lazy(() => import('@/pages/Funcionalidades'));
const Sobre = lazy(() => import('@/pages/Sobre'));
const Carreiras = lazy(() => import('@/pages/Carreiras'));
const Termos = lazy(() => import('@/pages/Termos'));
const Privacidade = lazy(() => import('@/pages/Privacidade'));
const Cookies = lazy(() => import('@/pages/Cookies'));
const Contato = lazy(() => import('@/pages/Contato'));
const CardapioDigital = lazy(() => import('@/pages/CardapioDigital'));
const PDVOnline = lazy(() => import('@/pages/PDVOnline'));
const GestaoCompleta = lazy(() => import('@/pages/GestaoCompleta'));
const Precos = lazy(() => import('@/pages/Precos'));
const Blog = lazy(() => import('@/pages/Blog'));
const BlogPost = lazy(() => import('@/pages/BlogPost'));
const PDV = lazy(() => import('@/pages/PDV'));
const MenuDigital = lazy(() => import('@/pages/MenuDigital'));
const Assinaturas = lazy(() => import('@/pages/Assinaturas'));
const PagarmeConfig = lazy(() => import('@/pages/PagarmeConfig'));
const IfoodIntegracao = lazy(() => import('@/pages/IfoodIntegracao'));
const EmailIntegracao = lazy(() => import('@/pages/EmailIntegracao'));
const Automacoes = lazy(() => import('@/pages/Automacoes'));
const Relatorios = lazy(() => import('@/pages/Relatorios'));
const Mesas = lazy(() => import('@/pages/Mesas'));
const Atendimento = lazy(() => import('@/pages/Atendimento'));
const Admin = lazy(() => import('@/pages/Admin'));
const AdminSubscriptions = lazy(() => import('@/pages/admin/AdminSubscriptions'));
const AdminSettings = lazy(() => import('@/pages/admin/AdminSettings'));
const AdminLogs = lazy(() => import('@/pages/admin/AdminLogs'));
const AdminSuperAdmins = lazy(() => import('@/pages/admin/AdminSuperAdmins'));
const AdminPlanos = lazy(() => import('@/pages/admin/AdminPlanos'));
const AdminBlog = lazy(() => import('@/pages/admin/AdminBlog'));
const AdminContact = lazy(() => import('@/pages/admin/AdminContact'));
const AdminContactRecipients = lazy(() => import('@/pages/admin/AdminContactRecipients'));
const AdminPagarme = lazy(() => import('@/pages/admin/AdminPagarme'));
const AdminPagarmeWebhooks = lazy(() => import('@/pages/admin/AdminPagarmeWebhooks'));
const AdminWhatsApp = lazy(() => import('@/pages/admin/AdminWhatsApp'));
const AdminEmail = lazy(() => import('@/pages/admin/AdminEmail'));

const RouteFallback = () => (
  <div className="min-h-screen w-full flex items-center justify-center bg-background">
    <span className="text-sm text-muted-foreground">Carregando...</span>
  </div>
);

const AppRoutes = () => {
  return (
    <Suspense fallback={<RouteFallback />}>
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
      <Route path="/esqueci-senha" element={
        <AuthLayout>
          <EsqueciSenha />
        </AuthLayout>
      } />
      <Route path="/reset-password" element={
        <AuthLayout>
          <ResetPassword />
        </AuthLayout>
      } />
      <Route path="/teste-gratis" element={
        <AuthLayout>
          <Cadastro />
        </AuthLayout>
      } />
      <Route path="/menu/:id" element={<CardapioPublico />} />
      <Route path="/cardapio/:slug" element={<CardapioPublico />} />
      <Route path="/pedido/:id" element={<AcompanharPedido />} />
      <Route path="/faq" element={<FAQ />} />
      <Route path="/demonstracao" element={<Demonstracao />} />
      <Route path="/funcionalidades" element={<Funcionalidades />} />
      <Route path="/sobre" element={<Sobre />} />
      <Route path="/carreiras" element={<Carreiras />} />
      <Route path="/contato" element={<Contato />} />
      <Route path="/termos" element={<Termos />} />
      <Route path="/privacidade" element={<Privacidade />} />
      <Route path="/cookies" element={<Cookies />} />
      <Route path="/cardapio-digital" element={<CardapioDigital />} />
      <Route path="/pdv-online" element={<PDVOnline />} />
      <Route path="/gestao-completa" element={<GestaoCompleta />} />
      <Route path="/precos" element={<Precos />} />
      <Route path="/blog" element={<Blog />} />
      <Route path="/blog/:slug" element={<BlogPost />} />
      
      {/* Rotas protegidas */}
      <Route path="/dashboard" element={
        <ProtectedRoute requiredPermissions={["dashboard_view"]} redirectOnDenied="/pdv">
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
      <Route path="/cozinha" element={
        <ProtectedRoute requiredPermissions={['orders_view']}>
          <MainLayout>
            <Cozinha />
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
        <ProtectedRoute requiredPermissions={["subscription_view"]}>
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
        <ProtectedRoute requiredPermissions={['settings_manage', 'settings_integrations_manage']} requireAny>
          <MainLayout>
            <PagarmeConfig />
          </MainLayout>
        </ProtectedRoute>
      } />
      <Route path="/ifood-integracao" element={
        <ProtectedRoute requiredPermissions={['settings_manage', 'settings_integrations_manage']} requireAny>
          <MainLayout>
            <IfoodIntegracao />
          </MainLayout>
        </ProtectedRoute>
      } />
      <Route path="/email-integracao" element={
        <ProtectedRoute requiredPermissions={['settings_manage', 'settings_integrations_manage']} requireAny>
          <MainLayout>
            <EmailIntegracao />
          </MainLayout>
        </ProtectedRoute>
      } />
      <Route path="/automacoes" element={
        <ProtectedRoute
          requiredPermissions={[
            'settings_manage',
            'settings_integrations_manage',
            'whatsapp_manage',
            'whatsapp_manage_instances',
            'whatsapp_configure_automation',
          ]}
          requireAny
        >
          <MainLayout>
            <Automacoes />
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
        <ProtectedRoute requiredPermissions={['orders_manage', 'settings_view']} requireAny>
          <MainLayout>
            <Mesas />
          </MainLayout>
        </ProtectedRoute>
      } />
      <Route path="/mesas" element={
        <ProtectedRoute requiredPermissions={['orders_manage', 'settings_view']} requireAny>
          <MainLayout>
            <Mesas />
          </MainLayout>
        </ProtectedRoute>
      } />
      <Route path="/atendimento" element={
        <ProtectedRoute
          requiredPermissions={['whatsapp_manage', 'whatsapp_take_conversations', 'whatsapp_reply_as_human', 'whatsapp_view_all_conversations', 'whatsapp_configure_automation']}
          requireAny
        >
          <MainLayout>
            <Atendimento />
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
      <Route path="/admin/pagarme" element={
        <AdminProtectedRoute>
          <AdminPagarme />
        </AdminProtectedRoute>
      } />
      <Route path="/admin/pagarme-webhooks" element={
        <AdminProtectedRoute>
          <AdminPagarmeWebhooks />
        </AdminProtectedRoute>
      } />
      <Route path="/admin/whatsapp" element={
        <AdminProtectedRoute>
          <AdminWhatsApp />
        </AdminProtectedRoute>
      } />
      <Route path="/admin/email" element={
        <AdminProtectedRoute>
          <AdminEmail />
        </AdminProtectedRoute>
      } />
      
      <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
