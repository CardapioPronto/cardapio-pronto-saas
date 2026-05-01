
import { useState, ChangeEvent } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useConfiguracoes } from "@/hooks/useConfiguracoes";
import { AuditoriaTab, EstabelecimentoTab, UsuarioTab, SistemaTab, IntegracoesTab } from "@/components/configuracoes";
import { usePermissionsV2 } from "@/hooks/usePermissionsV2";

const Configuracoes = () => {
  const { hasPermission } = usePermissionsV2();
  const {
    dadosEstabelecimento,
    setDadosEstabelecimento,
    dadosUsuario,
    setDadosUsuario,
    configuracoesSistema,
    setConfiguracoesSistema,
    loading,
    salvarDadosEstabelecimento,
    salvarDadosUsuario,
    salvarConfiguracoesDoSistema,
    fazerUploadLogo
  } = useConfiguracoes();

  const canManageAllSettings = hasPermission("settings_manage");
  const canEditEstablishment =
    canManageAllSettings || hasPermission("settings_establishment_manage");
  const canEditSystem =
    canManageAllSettings || hasPermission("settings_system_manage");
  const canManageIntegrations =
    canManageAllSettings || hasPermission("settings_integrations_manage");
  const canViewAudit =
    canManageAllSettings || hasPermission("settings_audit_view");

  const handleLogoChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!canEditEstablishment) return;

    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      await fazerUploadLogo(file);
    }
  };

  return (
    <DashboardLayout title="Configurações">
      <Tabs defaultValue="estabelecimento" className="space-y-6">
        <TabsList className="h-auto flex-wrap justify-start">
          <TabsTrigger value="estabelecimento">Estabelecimento</TabsTrigger>
          <TabsTrigger value="usuario">Usuário</TabsTrigger>
          <TabsTrigger value="sistema">Sistema</TabsTrigger>
          <TabsTrigger value="integracoes">Integrações</TabsTrigger>
          {canViewAudit && <TabsTrigger value="auditoria">Auditoria</TabsTrigger>}
        </TabsList>
        
        {/* Tab: Estabelecimento */}
        <TabsContent value="estabelecimento">
          <EstabelecimentoTab
            dadosEstabelecimento={dadosEstabelecimento}
            setDadosEstabelecimento={setDadosEstabelecimento}
            loading={loading.estabelecimento}
            salvarDadosEstabelecimento={salvarDadosEstabelecimento}
            handleLogoChange={handleLogoChange}
            logoLoading={loading.logoUpload}
            canEdit={canEditEstablishment}
          />
        </TabsContent>
        
        {/* Tab: Usuário */}
        <TabsContent value="usuario">
          <UsuarioTab
            dadosUsuario={dadosUsuario}
            setDadosUsuario={setDadosUsuario}
            loading={loading.usuario}
            salvarDadosUsuario={salvarDadosUsuario}
          />
        </TabsContent>
        
        {/* Tab: Sistema */}
        <TabsContent value="sistema">
          <SistemaTab
            configuracoesSistema={configuracoesSistema}
            setConfiguracoesSistema={setConfiguracoesSistema}
            loading={loading.configuracoes}
            salvarConfiguracoesDoSistema={salvarConfiguracoesDoSistema}
            canEdit={canEditSystem}
          />
        </TabsContent>
        
        {/* Tab: Integrações */}
        <TabsContent value="integracoes">
          <IntegracoesTab canManage={canManageIntegrations} />
        </TabsContent>

        {canViewAudit && (
          <TabsContent value="auditoria">
            <AuditoriaTab />
          </TabsContent>
        )}
      </Tabs>
    </DashboardLayout>
  );
};

export default Configuracoes;
