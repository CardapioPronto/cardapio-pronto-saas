import { Category } from './category';

export type Product = {
    id: string;
    name: string;
    description: string;
    price: number;
    available: boolean;
    image_url?: string;
    image_storage_path?: string | null;
    image_uploaded_by?: string | null;
    image_uploaded_at?: string | null;
    created_by?: string | null;
    updated_by?: string | null;
    category: Category | null;
    restaurant_id: string;
    created_at?: string;
    updated_at?: string;
};
