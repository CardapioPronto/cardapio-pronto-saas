import { Category } from './category';

export type Product = {
    id: string;
    name: string;
    description: string;
    price: number;
    available: boolean;
    image_url?: string;
    category: Category | null;
    restaurant_id: string;
    created_at?: string;
    updated_at?: string;
};
