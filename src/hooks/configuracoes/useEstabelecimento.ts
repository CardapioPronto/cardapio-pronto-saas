
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
    phone_whatsapp: null,
    email: null,
    cnpj: null,
    categoria: null,
    horarioFuncionamento: null,
    logo_url: null
  });
  
  const [loading, setLoading] = useState(false);
  const [logoLoading, setLogoLoading] = useState(false);

  useEffect(() => {
    const carregarDadosEstabelecimento = async () => {
      if (!user) return;
      
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
