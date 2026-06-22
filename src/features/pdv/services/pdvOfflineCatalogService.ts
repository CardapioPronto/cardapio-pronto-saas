import { supabase } from "@/integrations/supabase/client";
import { formatProductFromSupabase } from "@/utils/formatProductFromSupabase";
import type { Product, Category } from "@/types";
import type { Mesa } from "@/types/mesa";
import type { Area } from "@/types/area";

const CACHE_VERSION = 1;
const CACHE_KEY_PREFIX = "pubfy:pdv-catalog";
const PRODUCT_BATCH_SIZE = 500;
const MAX_CACHED_PRODUCTS = 5000;
export const PDV_CATALOG_STALE_AFTER_MS = 8 * 60 * 60 * 1000;
export const PDV_CATALOG_EXPIRED_AFTER_MS = 24 * 60 * 60 * 1000;

const PRODUCT_SELECT = `
  id,
  name,
  description,
  price,
  available,
  image_url,
  image_storage_path,
  image_uploaded_by,
  image_uploaded_at,
  created_by,
  updated_by,
  restaurant_id,
  created_at,
  updated_at,
  stock_tracking_enabled,
  stock_quantity,
  stock_min_quantity,
  stock_is_fractional,
  category:categories!products_category_id_fkey (
    id,
    name,
    restaurant_id
  )
`;

export type PDVOfflineCatalogSnapshot = {
  version: number;
  restaurantId: string;
  syncedAt: string;
  products: Product[];
  productsTotal: number;
  productsTruncated: boolean;
  categories: Category[];
  mesas: Mesa[];
  areas: Area[];
};

export type PDVOfflineCatalogFreshness = {
  status: "missing" | "fresh" | "stale" | "expired";
  ageMs: number | null;
  ageHours: number | null;
  label: string;
  isStale: boolean;
  isExpired: boolean;
};

const getCacheKey = (restaurantId: string) =>
  `${CACHE_KEY_PREFIX}:v${CACHE_VERSION}:${restaurantId}`;

const isValidSnapshot = (
  value: unknown,
  restaurantId: string,
): value is PDVOfflineCatalogSnapshot => {
  if (!value || typeof value !== "object") return false;

  const snapshot = value as Partial<PDVOfflineCatalogSnapshot>;
  return snapshot.version === CACHE_VERSION
    && snapshot.restaurantId === restaurantId
    && typeof snapshot.syncedAt === "string"
    && Array.isArray(snapshot.products)
    && Array.isArray(snapshot.categories)
    && Array.isArray(snapshot.mesas)
    && Array.isArray(snapshot.areas);
};

export function readPDVOfflineCatalog(
  restaurantId: string,
): PDVOfflineCatalogSnapshot | null {
  if (!restaurantId || typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(getCacheKey(restaurantId));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as unknown;
    return isValidSnapshot(parsed, restaurantId) ? parsed : null;
  } catch (error) {
    console.warn("Não foi possível ler o cache local do PDV:", error);
    return null;
  }
}

export function getPDVOfflineCatalogFreshness(
  syncedAt: string | null | undefined,
  now = Date.now(),
): PDVOfflineCatalogFreshness {
  if (!syncedAt) {
    return {
      status: "missing",
      ageMs: null,
      ageHours: null,
      label: "Sem sincronizacao local",
      isStale: false,
      isExpired: false,
    };
  }

  const syncedTime = new Date(syncedAt).getTime();
  if (Number.isNaN(syncedTime)) {
    return {
      status: "missing",
      ageMs: null,
      ageHours: null,
      label: "Sincronizacao local indisponivel",
      isStale: false,
      isExpired: false,
    };
  }

  const ageMs = Math.max(0, now - syncedTime);
  const ageHours = Math.floor(ageMs / (60 * 60 * 1000));
  const isExpired = ageMs >= PDV_CATALOG_EXPIRED_AFTER_MS;
  const isStale = ageMs >= PDV_CATALOG_STALE_AFTER_MS;
  const label = ageHours < 1
    ? "Atualizado ha menos de 1 hora"
    : `Atualizado ha ${ageHours}h`;

  return {
    status: isExpired ? "expired" : isStale ? "stale" : "fresh",
    ageMs,
    ageHours,
    label,
    isStale,
    isExpired,
  };
}

export function writePDVOfflineCatalog(snapshot: PDVOfflineCatalogSnapshot) {
  if (typeof window === "undefined") return false;

  try {
    window.localStorage.setItem(getCacheKey(snapshot.restaurantId), JSON.stringify(snapshot));
    return true;
  } catch (error) {
    console.warn("Não foi possível salvar o cache local do PDV:", error);
    return false;
  }
}

async function fetchAvailableProducts(restaurantId: string) {
  const products: Product[] = [];
  let productsTotal = 0;

  while (products.length < MAX_CACHED_PRODUCTS) {
    const from = products.length;
    const to = from + PRODUCT_BATCH_SIZE - 1;
    const { data, error, count } = await supabase
      .from("products")
      .select(PRODUCT_SELECT, { count: "exact" })
      .eq("restaurant_id", restaurantId)
      .eq("available", true)
      .order("name", { ascending: true })
      .range(from, to);

    if (error) throw error;

    const batch = formatProductFromSupabase(
      (data ?? []) as Parameters<typeof formatProductFromSupabase>[0],
    );
    products.push(...batch);
    productsTotal = count ?? products.length;

    if (batch.length < PRODUCT_BATCH_SIZE || products.length >= productsTotal) break;
  }

  return {
    products,
    productsTotal,
    productsTruncated: products.length < productsTotal,
  };
}

export async function fetchPDVOfflineCatalog(
  restaurantId: string,
): Promise<PDVOfflineCatalogSnapshot> {
  const [productsResult, categoriesResult, mesasResult, areasResult] = await Promise.all([
    fetchAvailableProducts(restaurantId),
    supabase
      .from("categories")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("name"),
    supabase
      .from("mesas")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .eq("is_active", true)
      .order("number"),
    supabase
      .from("areas")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .eq("is_active", true)
      .order("name"),
  ]);

  if (categoriesResult.error) throw categoriesResult.error;
  if (mesasResult.error) throw mesasResult.error;
  if (areasResult.error) throw areasResult.error;

  return {
    version: CACHE_VERSION,
    restaurantId,
    syncedAt: new Date().toISOString(),
    products: productsResult.products,
    productsTotal: productsResult.productsTotal,
    productsTruncated: productsResult.productsTruncated,
    categories: (categoriesResult.data ?? []) as Category[],
    mesas: (mesasResult.data ?? []) as Mesa[],
    areas: (areasResult.data ?? []) as Area[],
  };
}

export async function fetchPDVMesas(restaurantId: string): Promise<Mesa[]> {
  const { data, error } = await supabase
    .from("mesas")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("is_active", true)
    .order("number");

  if (error) throw error;
  return (data ?? []) as Mesa[];
}
