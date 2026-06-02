
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
  print_paper_size: "58mm" | "80mm" | "a4";
  print_default_kitchen: boolean;
  print_default_cashier: boolean;
  print_default_customer: boolean;
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
