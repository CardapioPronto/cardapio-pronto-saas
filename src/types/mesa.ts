export interface Mesa {
  id: string;
  number: string;
  area_id?: string | null;
  restaurant_id: string;
  capacity: number | null;
  status: 'livre' | 'ocupada' | 'reservada' | 'indisponivel';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateMesaData {
  number: string;
  area_id?: string;
  restaurant_id: string;
  capacity?: number;
  status?: Mesa['status'];
  is_active?: boolean;
}

export interface UpdateMesaData {
  number?: string;
  area_id?: string;
  capacity?: number;
  status?: Mesa['status'];
  is_active?: boolean;
}

export type MesaStatus = Mesa['status'];