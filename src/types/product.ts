import { Category } from './category';

export type Product = {
    id: string;
    name: string;
    description: string;
    price: number;
    available: boolean;
    image_url?: string | null;
    image_storage_path?: string | null;
    image_uploaded_by?: string | null;
    image_uploaded_at?: string | null;
    created_by?: string | null;
    updated_by?: string | null;
    category: Category | null;
    restaurant_id: string;
    created_at?: string;
    updated_at?: string;
    stock_tracking_enabled?: boolean;
    stock_quantity?: number;
    stock_min_quantity?: number | null;
    stock_is_fractional?: boolean;
};

export type StockMovementType =
    | "sale"
    | "sale_revert"
    | "adjustment_in"
    | "adjustment_out"
    | "inventory_count"
    | "manual_negative_override";

export type StockMovement = {
    id: string;
    restaurant_id: string;
    product_id: string;
    quantity_delta: number;
    movement_type: StockMovementType;
    reason: string | null;
    notes: string | null;
    order_id: string | null;
    order_item_id: string | null;
    idempotency_key: string | null;
    created_at: string;
    created_by: string | null;
};
