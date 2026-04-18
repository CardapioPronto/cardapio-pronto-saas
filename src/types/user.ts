
export type UserType = 'owner' | 'manager' | 'employee';

export type User = {
    id: string;
    email: string;
    name: string | null;
    restaurant_id: string | null;
    user_type: UserType | null;
    role: string;
    created_at?: string;
    updated_at?: string;
};
