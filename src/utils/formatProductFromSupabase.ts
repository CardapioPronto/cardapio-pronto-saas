import { Product } from "@/types/product";
import type { Category } from "@/types/category";

type ProductCategoryRow = Pick<Category, "id" | "name" | "restaurant_id">;

type ProductSupabaseRow = {
    id: string;
    name: string;
    description: string | null;
    price: number;
    available: boolean;
    image_url?: string | null;
    image_storage_path?: string | null;
    image_uploaded_by?: string | null;
    image_uploaded_at?: string | null;
    created_by?: string | null;
    updated_by?: string | null;
    restaurant_id: string;
    created_at?: string | null;
    updated_at?: string | null;
    category?: ProductCategoryRow | ProductCategoryRow[] | null;
};

export function formatProductFromSupabase(data: ProductSupabaseRow[]): Product[] {
    return data.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description ?? "",
        price: item.price,
        available: item.available,
        image_url: item.image_url ?? null,
        image_storage_path: item.image_storage_path ?? null,
        image_uploaded_by: item.image_uploaded_by ?? null,
        image_uploaded_at: item.image_uploaded_at ?? null,
        created_by: item.created_by ?? null,
        updated_by: item.updated_by ?? null,
        restaurant_id: item.restaurant_id,
        created_at: item.created_at,
        updated_at: item.updated_at,
        category: Array.isArray(item.category) ? item.category[0] : item.category ?? null,
    }));
}
