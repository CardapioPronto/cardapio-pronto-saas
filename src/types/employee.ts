
export type UserType = 'owner' | 'employee';

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
