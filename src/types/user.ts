
export type UserType = 'owner' | 'manager' | 'employee';

export type User = {
    id: string;
    email: string;
    name: string | null;
    restaurant_id: string | null;
    user_type: UserType | null;
    role: string;
    avatar_url?: string | null;
    avatar_storage_path?: string | null;
    created_at?: string;
    updated_at?: string;
};
