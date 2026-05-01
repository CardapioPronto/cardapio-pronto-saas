import { PermissionType, UserType } from "@/types/employee";

export type PermissionOption = {
  value: PermissionType;
  label: string;
  description: string;
};

export type PermissionGroup = {
  title: string;
  description: string;
  permissions: PermissionOption[];
};

export const PERMISSION_LABELS: Record<PermissionType, string> = {
  dashboard_view: "Dashboard",
  subscription_view: "Assinatura",
  pdv_access: "PDV",
  orders_view: "Ver Pedidos",
  orders_manage: "Gerenciar Pedidos",
  orders_metrics_view: "Valores de Pedidos",
  products_view: "Ver Produtos",
  products_manage: "Gerenciar Produtos",
  reports_view: "Relatorios",
  settings_view: "Ver Configuracoes",
  settings_manage: "Gerenciar Configuracoes",
  employees_manage: "Gerenciar Funcionarios",
  whatsapp_manage: "WhatsApp",
  whatsapp_manage_instances: "Instancias WhatsApp",
  whatsapp_take_conversations: "Assumir Conversas",
  whatsapp_reply_as_human: "Responder Conversas",
  whatsapp_view_all_conversations: "Ver Todas Conversas",
  whatsapp_configure_automation: "Automacao WhatsApp",
};

export const USER_TYPE_LABELS: Record<UserType, string> = {
  owner: "Dono",
  manager: "Gerente",
  employee: "Funcionario",
};

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    title: "Geral",
    description: "Painel, assinatura e indicadores",
    permissions: [
      { value: "dashboard_view", label: "Ver Dashboard", description: "Visualizar o painel principal" },
      { value: "subscription_view", label: "Ver Assinatura", description: "Visualizar informacoes da assinatura" },
      { value: "reports_view", label: "Ver Relatorios", description: "Acessar relatorios e estatisticas" },
    ],
  },
  {
    title: "PDV e Pedidos",
    description: "Operacao de venda e atendimento",
    permissions: [
      { value: "pdv_access", label: "Acesso ao PDV", description: "Permite usar o sistema de PDV" },
      { value: "orders_view", label: "Ver Pedidos", description: "Visualizar lista de pedidos" },
      { value: "orders_manage", label: "Gerenciar Pedidos", description: "Criar, editar e cancelar pedidos" },
      { value: "orders_metrics_view", label: "Ver Valores e Indicadores", description: "Visualizar faturamento, totais e subtotais dos pedidos" },
    ],
  },
  {
    title: "Produtos",
    description: "Catalogo e cardapio",
    permissions: [
      { value: "products_view", label: "Ver Produtos", description: "Visualizar catalogo de produtos" },
      { value: "products_manage", label: "Gerenciar Produtos", description: "Criar, editar e remover produtos" },
    ],
  },
  {
    title: "WhatsApp e Atendimento",
    description: "Conversas, instancias e automacao",
    permissions: [
      { value: "whatsapp_manage", label: "Acessar WhatsApp", description: "Acesso geral ao modulo de atendimento" },
      { value: "whatsapp_manage_instances", label: "Gerenciar Instancias", description: "Criar, conectar e apagar instancias WhatsApp" },
      { value: "whatsapp_take_conversations", label: "Assumir Conversas", description: "Pode assumir atendimento de conversas" },
      { value: "whatsapp_reply_as_human", label: "Responder como Humano", description: "Enviar mensagens como atendente humano" },
      { value: "whatsapp_view_all_conversations", label: "Ver Todas as Conversas", description: "Visualizar conversas de todos os atendentes" },
      { value: "whatsapp_configure_automation", label: "Configurar Automacao", description: "Alterar configuracoes de IA e automacao" },
    ],
  },
  {
    title: "Configuracoes",
    description: "Ajustes do estabelecimento e equipe",
    permissions: [
      { value: "settings_view", label: "Ver Configuracoes", description: "Visualizar configuracoes do sistema" },
      { value: "settings_manage", label: "Gerenciar Configuracoes", description: "Alterar configuracoes do sistema" },
      { value: "employees_manage", label: "Gerenciar Funcionarios", description: "Adicionar e gerenciar colaboradores" },
    ],
  },
];

export const getEmployeeInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = parts.slice(0, 2).map((part) => part[0]).join("");
  return initials.toUpperCase() || "F";
};
