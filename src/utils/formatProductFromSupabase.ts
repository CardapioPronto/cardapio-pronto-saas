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
    stock_tracking_enabled?: boolean | null;
    stock_quantity?: number | null;
    stock_min_quantity?: number | null;
    stock_is_fractional?: boolean | null;
    multi_flavor_enabled?: boolean | null;
    financial?: { cost_price: number } | Array<{ cost_price: number }> | null;
};

export function formatProductFromSupabase(data: ProductSupabaseRow[]): Product[] {
    return data.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description ?? "",
        price: item.price,
        cost_price: Array.isArray(item.financial)
            ? item.financial[0]?.cost_price ?? null
            : item.financial?.cost_price ?? null,
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
        stock_tracking_enabled: item.stock_tracking_enabled ?? false,
        stock_quantity: item.stock_quantity ?? 0,
        stock_min_quantity: item.stock_min_quantity ?? null,
        stock_is_fractional: item.stock_is_fractional ?? false,
        multi_flavor_enabled: item.multi_flavor_enabled ?? false,
    }));
}
