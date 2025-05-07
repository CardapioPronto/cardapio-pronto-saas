
import { useEstabelecimento, useSistema, useUsuario } from "./configuracoes";

export function useConfiguracoes() {
  const {
    dadosEstabelecimento,
    setDadosEstabelecimento,
    loading: estabelecimentoLoading,
    logoLoading,
    salvarDadosEstabelecimento,
    fazerUploadLogo
  } = useEstabelecimento();

  const {
    dadosUsuario,
    setDadosUsuario,
    loading: usuarioLoading,
    salvarDadosUsuario
  } = useUsuario();

  const {
    configuracoesSistema,
    setConfiguracoesSistema,
    loading: sistemaLoading,
    salvarConfiguracoesDoSistema
  } = useSistema();

  // Consolidate loading states for backwards compatibility
  const loading = {
    estabelecimento: estabelecimentoLoading,
    usuario: usuarioLoading,
    configuracoes: sistemaLoading,
    logoUpload: logoLoading
  };

  return {
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
  };
}
