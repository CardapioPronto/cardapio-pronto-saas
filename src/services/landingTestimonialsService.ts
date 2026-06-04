import { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type RpcResponse<T> = Promise<{ data: T | null; error: PostgrestError | null }>;

const rpc = supabase.rpc.bind(supabase) as unknown as <T>(
  fn: string,
  args?: Record<string, unknown>,
) => RpcResponse<T>;

export type PublicLandingTestimonial = {
  id: string;
  message: string;
  author_name: string;
  author_role: string | null;
  restaurant_name: string;
  avatar_url: string | null;
  rating: number;
  public_note: string | null;
};

export type MyLandingTestimonial = {
  id: string;
  message: string;
  status: "pending" | "published" | "rejected" | "archived" | string;
  rating: number;
  submitted_at: string;
  published_at: string | null;
};

export type TestimonialClientOption = {
  restaurant_id: string;
  name: string;
  email: string | null;
  owner_name: string | null;
  owner_email: string | null;
  logo_url: string | null;
};

export type AdminLandingTestimonial = {
  id: string;
  restaurant_id: string | null;
  message: string;
  author_name: string;
  author_role: string | null;
  restaurant_name: string;
  avatar_url: string | null;
  rating: number;
  source: "app" | "super_admin" | "external" | "imported" | string;
  status: "pending" | "published" | "rejected" | "archived" | string;
  is_featured: boolean;
  display_order: number;
  public_note: string | null;
  internal_notes: string | null;
  submitted_at: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  client_name: string | null;
  client_email: string | null;
  created_by_name: string | null;
};

export type AdminTestimonialPayload = {
  id?: string | null;
  restaurantId?: string | null;
  message: string;
  authorName: string;
  authorRole?: string | null;
  rating: number;
  source: "super_admin" | "external" | "imported" | "app";
  status: "pending" | "published" | "rejected" | "archived";
  isFeatured: boolean;
  displayOrder: number;
  publicNote?: string | null;
  internalNotes?: string | null;
};

export async function listPublicLandingTestimonials(limit = 6) {
  const response = await rpc<PublicLandingTestimonial[]>("get_public_landing_testimonials", {
    p_limit: limit,
  });

  return {
    data: response.data ?? [],
    error: response.error,
  };
}

export async function submitLandingTestimonial(params: {
  message: string;
  authorName?: string;
  authorRole?: string;
  rating?: number;
}) {
  return await rpc<string>("submit_landing_testimonial", {
    p_message: params.message,
    p_author_name: params.authorName || null,
    p_author_role: params.authorRole || null,
    p_rating: params.rating ?? 5,
  });
}

export async function listMyLandingTestimonials() {
  const response = await rpc<MyLandingTestimonial[]>("get_my_landing_testimonials");

  return {
    data: response.data ?? [],
    error: response.error,
  };
}

export async function searchTestimonialClients(search: string) {
  const response = await rpc<TestimonialClientOption[]>("admin_search_testimonial_clients", {
    p_search: search,
    p_limit: 20,
  });

  return {
    data: response.data ?? [],
    error: response.error,
  };
}

export async function listAdminLandingTestimonials(status = "todos") {
  const response = await rpc<AdminLandingTestimonial[]>("admin_list_landing_testimonials", {
    p_status: status,
  });

  return {
    data: response.data ?? [],
    error: response.error,
  };
}

export async function saveAdminLandingTestimonial(payload: AdminTestimonialPayload) {
  return await rpc<string>("admin_upsert_landing_testimonial", {
    p_id: payload.id || null,
    p_restaurant_id: payload.restaurantId || null,
    p_message: payload.message,
    p_author_name: payload.authorName,
    p_author_role: payload.authorRole || null,
    p_rating: payload.rating,
    p_source: payload.source,
    p_status: payload.status,
    p_is_featured: payload.isFeatured,
    p_display_order: payload.displayOrder,
    p_public_note: payload.publicNote || null,
    p_internal_notes: payload.internalNotes || null,
  });
}
