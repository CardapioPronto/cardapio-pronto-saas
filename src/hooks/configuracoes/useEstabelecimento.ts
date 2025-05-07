
import { useState, useEffect } from "react";
import { obterDadosEstabelecimento, atualizarDadosEstabelecimento, uploadLogo, DadosEstabelecimento } from "@/services/configuracoes";
import { toast } from "sonner";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export function useEstabelecimento() {
  const { user } = useCurrentUser();
  const [dadosEstabelecimento, setDadosEstabelecimento] = useState<DadosEstabelecimento>({
    nome: "",
    endereco: null,
    telefone: null,
    email: null,
    horarioFuncionamento: null,
    logo_url: null
  });
  
  const [loading, setLoading] = useState(false);
  const [logoLoading, setLogoLoading] = useState(false);

  // Carregar dados do estabelecimento
  useEffect(() => {
    const carregarDadosEstabelecimento = async () => {
      if (!user) return; // Não carrega dados se não houver usuário autenticado
      
      setLoading(true);
      try {
        const dados = await obterDadosEstabelecimento();
        setDadosEstabelecimento(dados);
      } catch (error) {
        console.error("Erro ao carregar dados do estabelecimento:", error);
        toast.error("Erro ao carregar dados do estabelecimento");
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      carregarDadosEstabelecimento();
    }
  }, [user]);

  // Atualizar dados do estabelecimento
  const salvarDadosEstabelecimento = async () => {
    setLoading(true);
    try {
      await atualizarDadosEstabelecimento(dadosEstabelecimento);
      toast.success("Dados do estabelecimento atualizados com sucesso!");
    } catch (error) {
      console.error("Erro ao atualizar dados do estabelecimento:", error);
      toast.error("Erro ao atualizar dados do estabelecimento");
    } finally {
      setLoading(false);
    }
  };

  // Upload de logo do estabelecimento
  const fazerUploadLogo = async (file: File) => {
    setLogoLoading(true);
    try {
      const result = await uploadLogo(file);
      setDadosEstabelecimento(prev => ({
        ...prev,
        logo_url: result.url
      }));
      toast.success("Logo atualizado com sucesso!");
    } catch (error) {
      console.error("Erro ao fazer upload do logo:", error);
      toast.error("Erro ao fazer upload do logo");
    } finally {
      setLogoLoading(false);
    }
  };

  return {
    dadosEstabelecimento,
    setDadosEstabelecimento,
    loading,
    logoLoading,
    salvarDadosEstabelecimento,
    fazerUploadLogo
  };
}
