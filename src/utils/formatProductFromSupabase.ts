import { Product } from "@/types/product";

export function formatProductFromSupabase(data: any[]): Product[] {
    return data.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
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
