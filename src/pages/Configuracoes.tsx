
import { useState, ChangeEvent } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useConfiguracoes } from "@/hooks/useConfiguracoes";
import { EstabelecimentoTab, UsuarioTab, SistemaTab, IntegracoesTab } from "@/components/configuracoes";

const Configuracoes = () => {
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

  const handleLogoChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      await fazerUploadLogo(file);
    }
  };

  return (
    <DashboardLayout title="Configurações">
      <Tabs defaultValue="estabelecimento" className="space-y-6">
        <TabsList>
          <TabsTrigger value="estabelecimento">Estabelecimento</TabsTrigger>
          <TabsTrigger value="usuario">Usuário</TabsTrigger>
          <TabsTrigger value="sistema">Sistema</TabsTrigger>
          <TabsTrigger value="integracoes">Integrações</TabsTrigger>
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
          />
        </TabsContent>
        
        {/* Tab: Integrações */}
        <TabsContent value="integracoes">
          <IntegracoesTab />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default Configuracoes;
