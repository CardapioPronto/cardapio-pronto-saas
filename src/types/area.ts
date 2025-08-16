export interface Area {
  id: string;
  name: string;
  restaurant_id: string;
  description?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateAreaData {
  name: string;
  restaurant_id: string;
  description?: string;
  is_active?: boolean;
}

export interface UpdateAreaData {
  name?: string;
  description?: string;
  is_active?: boolean;
}