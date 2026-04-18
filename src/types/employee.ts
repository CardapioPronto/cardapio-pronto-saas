
export type UserType = 'owner' | 'manager' | 'employee';

export type PermissionType = 
  | 'dashboard_view'
  | 'subscription_view'
  | 'pdv_access'
  | 'orders_view'
  | 'orders_manage'
  | 'products_view'
  | 'products_manage'
  | 'reports_view'
  | 'settings_view'
  | 'settings_manage'
  | 'employees_manage'
  | 'whatsapp_manage'
  | 'whatsapp_manage_instances'
  | 'whatsapp_take_conversations'
  | 'whatsapp_reply_as_human'
  | 'whatsapp_view_all_conversations'
  | 'whatsapp_configure_automation';

/**
 * Cargos pré-definidos com presets de permissões.
 * - owner: dono do restaurante (todas as permissões, não-removível)
 * - manager: gerente (todas operacionais; sem assinatura/funcionários por padrão)
 * - employee: funcionário (permissões definidas individualmente)
 */
export type EmployeeRole = 'manager' | 'cashier' | 'waiter' | 'whatsapp_attendant' | 'custom';

export interface RolePreset {
  id: EmployeeRole;
  label: string;
  description: string;
  user_type: 'manager' | 'employee';
  permissions: PermissionType[];
}

export const ROLE_PRESETS: RolePreset[] = [
  {
    id: 'manager',
    label: 'Gerente',
    description: 'Acesso total operacional (sem financeiro/funcionários por padrão)',
    user_type: 'manager',
    permissions: [
      'dashboard_view', 'pdv_access',
      'orders_view', 'orders_manage',
      'products_view', 'products_manage',
      'reports_view', 'settings_view',
      'whatsapp_manage', 'whatsapp_manage_instances',
      'whatsapp_take_conversations', 'whatsapp_reply_as_human',
      'whatsapp_view_all_conversations', 'whatsapp_configure_automation',
    ],
  },
  {
    id: 'cashier',
    label: 'Caixa',
    description: 'PDV, pedidos e visualização de produtos',
    user_type: 'employee',
    permissions: ['pdv_access', 'orders_view', 'orders_manage', 'products_view'],
  },
  {
    id: 'waiter',
    label: 'Garçom / Salão',
    description: 'PDV e gestão de pedidos',
    user_type: 'employee',
    permissions: ['pdv_access', 'orders_view', 'orders_manage', 'products_view'],
  },
  {
    id: 'whatsapp_attendant',
    label: 'Atendente WhatsApp',
    description: 'Conversas WhatsApp e visualização de pedidos',
    user_type: 'employee',
    permissions: [
      'whatsapp_manage', 'whatsapp_take_conversations',
      'whatsapp_reply_as_human', 'orders_view', 'products_view',
    ],
  },
  {
    id: 'custom',
    label: 'Personalizado',
    description: 'Defina manualmente as permissões',
    user_type: 'employee',
    permissions: [],
  },
];

export interface Employee {
  id: string;
  user_id: string;
  restaurant_id: string;
  employee_name: string;
  employee_email: string;
  user_type: UserType;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface EmployeePermission {
  id: string;
  employee_id: string;
  permission: PermissionType;
  granted_by: string;
  created_at: string;
}

export interface EmployeeWithPermissions extends Employee {
  permissions: PermissionType[];
}
