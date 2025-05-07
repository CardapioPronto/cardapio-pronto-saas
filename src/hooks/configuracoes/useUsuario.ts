
import { useState, useEffect } from "react";
import { obterDadosUsuario, atualizarDadosUsuario } from "@/services/configuracoes";
import { toast } from "sonner";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export function useUsuario() {
  const { user } = useCurrentUser();
  const [dadosUsuario, setDadosUsuario] = useState({
    nome: "",
    email: "",
    senha: "••••••••",
    novaSenha: "",
    confirmarSenha: ""
  });
  
  const [loading, setLoading] = useState(false);

  // Carregar dados do usuário
  useEffect(() => {
    const carregarDadosUsuario = async () => {
      if (!user) return; // Não carrega dados se não houver usuário autenticado
      
      setLoading(true);
      try {
        const dados = await obterDadosUsuario();
        setDadosUsuario(prev => ({
          ...prev,
          nome: dados.nome || "",
          email: dados.email || ""
        }));
      } catch (error) {
        console.error("Erro ao carregar dados do usuário:", error);
        toast.error("Erro ao carregar dados do usuário");
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      carregarDadosUsuario();
    }
  }, [user]);

  // Atualizar dados do usuário
  const salvarDadosUsuario = async () => {
    if (dadosUsuario.novaSenha && dadosUsuario.novaSenha !== dadosUsuario.confirmarSenha) {
      toast.error("As senhas não coincidem");
      return;
    }

    setLoading(true);
    try {
      await atualizarDadosUsuario(
        dadosUsuario.nome, 
        dadosUsuario.email, 
        dadosUsuario.senha !== "••••••••" ? dadosUsuario.senha : undefined,
        dadosUsuario.novaSenha || undefined
      );
      
      setDadosUsuario(prev => ({
        ...prev,
        senha: dadosUsuario.novaSenha ? "••••••••" : prev.senha,
        novaSenha: "",
        confirmarSenha: ""
      }));
      
      toast.success("Dados do usuário atualizados com sucesso!");
    } catch (error) {
      console.error("Erro ao atualizar dados do usuário:", error);
      toast.error("Erro ao atualizar dados do usuário");
    } finally {
      setLoading(false);
    }
  };

  return {
    dadosUsuario,
    setDadosUsuario,
    loading,
    salvarDadosUsuario
  };
}
