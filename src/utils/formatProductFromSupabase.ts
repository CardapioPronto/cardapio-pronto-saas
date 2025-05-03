import { Product } from "@/types/product";

export function formatProductFromSupabase(data: any[]): Product[] {
    return data.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        price: item.price,
        available: item.available,
        image_url: item.image_url ?? null,
        restaurant_id: item.restaurant_id,
        category: Array.isArray(item.category) ? item.category[0] : item.category ?? null,
    }));
}
