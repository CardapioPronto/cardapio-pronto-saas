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
  reports_view: "Relatórios",
  settings_view: "Ver Configurações",
  settings_manage: "Gerenciar Configurações",
  settings_establishment_manage: "Editar Estabelecimento",
  settings_system_manage: "Editar Sistema",
  settings_integrations_manage: "Gerenciar Integrações",
  settings_audit_view: "Ver Auditoria",
  employees_manage: "Gerenciar Funcionários",
  whatsapp_manage: "WhatsApp",
  whatsapp_manage_instances: "Instâncias WhatsApp",
  whatsapp_take_conversations: "Assumir Conversas",
  whatsapp_reply_as_human: "Responder Conversas",
  whatsapp_view_all_conversations: "Ver Todas Conversas",
  whatsapp_configure_automation: "Automação WhatsApp",
};

export const USER_TYPE_LABELS: Record<UserType, string> = {
  owner: "Dono",
  manager: "Gerente",
  employee: "Funcionário",
};

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    title: "Geral",
    description: "Painel, assinatura e indicadores",
    permissions: [
      { value: "dashboard_view", label: "Ver Dashboard", description: "Visualizar o painel principal" },
      { value: "subscription_view", label: "Ver Assinatura", description: "Visualizar informações da assinatura" },
      { value: "reports_view", label: "Ver Relatórios", description: "Acessar relatórios e estatísticas" },
    ],
  },
  {
    title: "PDV e Pedidos",
    description: "Operação de venda e atendimento",
    permissions: [
      { value: "pdv_access", label: "Acesso ao PDV", description: "Permite usar o sistema de PDV" },
      { value: "orders_view", label: "Ver Pedidos", description: "Visualizar lista de pedidos" },
      { value: "orders_manage", label: "Gerenciar Pedidos", description: "Criar, editar e cancelar pedidos" },
      { value: "orders_metrics_view", label: "Ver Valores e Indicadores", description: "Visualizar faturamento, totais e subtotais dos pedidos" },
    ],
  },
  {
    title: "Produtos",
    description: "Catálogo e cardápio",
    permissions: [
      { value: "products_view", label: "Ver Produtos", description: "Visualizar catálogo de produtos" },
      { value: "products_manage", label: "Gerenciar Produtos", description: "Criar, editar e remover produtos" },
    ],
  },
  {
    title: "WhatsApp e Atendimento",
    description: "Conversas, instâncias e automação",
    permissions: [
      { value: "whatsapp_manage", label: "Acessar WhatsApp", description: "Acesso geral ao módulo de atendimento" },
      { value: "whatsapp_manage_instances", label: "Gerenciar Instâncias", description: "Criar, conectar e apagar instâncias WhatsApp" },
      { value: "whatsapp_take_conversations", label: "Assumir Conversas", description: "Pode assumir atendimento de conversas" },
      { value: "whatsapp_reply_as_human", label: "Responder como Humano", description: "Enviar mensagens como atendente humano" },
      { value: "whatsapp_view_all_conversations", label: "Ver Todas as Conversas", description: "Visualizar conversas de todos os atendentes" },
      { value: "whatsapp_configure_automation", label: "Configurar Automação", description: "Alterar configurações de IA e automação" },
    ],
  },
  {
    title: "Configurações",
    description: "Ajustes do estabelecimento e equipe",
    permissions: [
      { value: "settings_view", label: "Ver Configurações", description: "Visualizar configurações do sistema" },
      { value: "settings_establishment_manage", label: "Editar Estabelecimento", description: "Alterar dados, contatos e logo da loja" },
      { value: "settings_system_manage", label: "Editar Sistema", description: "Alterar preferências operacionais e impressão" },
      { value: "settings_integrations_manage", label: "Gerenciar Integrações", description: "Acessar configurações de WhatsApp, iFood e pagamentos" },
      { value: "settings_audit_view", label: "Ver Auditoria", description: "Consultar histórico de alterações em configurações e usuário" },
      { value: "settings_manage", label: "Gerenciar Tudo", description: "Permissão legada com acesso total às configurações" },
      { value: "employees_manage", label: "Gerenciar Funcionários", description: "Adicionar e gerenciar colaboradores" },
    ],
  },
];

export const getEmployeeInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = parts.slice(0, 2).map((part) => part[0]).join("");
  return initials.toUpperCase() || "F";
};
