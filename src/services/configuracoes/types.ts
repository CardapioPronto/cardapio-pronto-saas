
// Types related to configurações (settings)
export type DadosEstabelecimento = {
  nome: string;
  endereco: string | null;
  telefone: string | null;
  phone_whatsapp?: string | null;
  email: string | null;
  cnpj?: string | null;
  categoria?: string | null;
  horarioFuncionamento: string | null;
  logo_url: string | null;
};

export type ConfiguracoesSistema = {
  id?: string;
  notification_new_order: boolean;
  notification_email: boolean;
  dark_mode: boolean;
  language: string;
  auto_print: boolean;
};

export type DadosUsuario = {
  nome: string;
  email: string;
  senha: string;
  novaSenha: string;
  confirmarSenha: string;
  avatar_url: string | null;
  avatar_storage_path: string | null;
};
