import { supabase } from "@/integrations/supabase/client";
import type {
  AffiliateCampaignMaterial,
  AffiliateDashboard,
  AffiliateMaterialDraft,
  AffiliateProfile,
  ReferralProgramPublicSettings,
  ReferralProgramSettingsDraft,
} from "@/types/referral";
import { applyReferralTemplate, buildRestaurantSignupUrl } from "@/lib/referralAttribution";

export async function fetchReferralProgramPublicSettings() {
  const { data, error } = await supabase.rpc("get_referral_program_public_settings");
  if (error) throw error;
  return (data ?? {}) as ReferralProgramPublicSettings;
}

export async function fetchOrCreateAffiliateProfile(options: {
  displayName?: string;
  acceptTerms: boolean;
}) {
  const { data, error } = await supabase.rpc("get_or_create_affiliate_profile", {
    p_display_name: options.displayName?.trim() || null,
    p_accept_terms: options.acceptTerms,
  });
  if (error) throw error;
  return data as AffiliateProfile;
}

export async function fetchReferralProgramAdminSettings() {
  const { data, error } = await supabase.rpc("get_referral_program_admin_settings");
  if (error) throw error;
  return data as ReferralProgramSettingsDraft;
}

export async function saveReferralProgramSettings(payload: ReferralProgramSettingsDraft) {
  const { data, error } = await supabase.rpc("save_referral_program_settings", {
    p_payload: payload,
  });
  if (error) throw error;
  return data as ReferralProgramPublicSettings;
}

export async function listAffiliateCampaignMaterials() {
  const { data, error } = await supabase.rpc("list_affiliate_campaign_materials");
  if (error) throw error;
  return (data ?? []) as AffiliateCampaignMaterial[];
}

export async function fetchAffiliateDashboard() {
  const { data, error } = await supabase.rpc("get_affiliate_dashboard");
  if (error) throw error;
  return (data ?? { has_profile: false }) as AffiliateDashboard;
}

export async function updateAffiliatePayoutProfile(payload: {
  documentCpf?: string;
  payoutPixKey?: string;
}) {
  const { data, error } = await supabase.rpc("update_affiliate_payout_profile", {
    p_document_cpf: payload.documentCpf?.trim() || null,
    p_payout_pix_key: payload.payoutPixKey?.trim() || null,
  });
  if (error) throw error;
  return data;
}

export async function requestAffiliatePayout() {
  const { data, error } = await supabase.rpc("request_affiliate_payout");
  if (error) throw error;
  return data as { request_id: string; amount_cents: number };
}

export type ReferralAdminFunnelSummary = {
  attributed_restaurants: number;
  restaurants_with_paid_subscription: number;
  conversion_to_paid_pct: number;
  commission_generated_cents: number;
  commission_paid_cents: number;
  open_payout_requests: number;
};

export type ReferralAdminTopAffiliate = {
  user_id: string;
  referral_code: string;
  display_name: string;
  attributed_restaurants: number;
  paying_restaurants: number;
  generated_commission_cents: number;
  paid_commission_cents: number;
};

export type ReferralAdminSnapshot = {
  funnel_summary: ReferralAdminFunnelSummary;
  top_affiliates: ReferralAdminTopAffiliate[];
  pending_payouts: Array<{
    id: string;
    user_id: string;
    amount_cents: number;
    status: string;
    requested_at: string;
    affiliate_code: string | null;
    pix_key: string | null;
  }>;
  recent_commissions: Array<{
    id: string;
    referrer_user_id: string;
    referral_code: string | null;
    restaurant_id: string;
    commission_amount_cents: number;
    status: string;
    restaurant_paid_at: string | null;
    created_at: string;
  }>;
  materials: AffiliateCampaignMaterial[];
};

export async function fetchReferralAdminSnapshot() {
  const { data, error } = await supabase.rpc("list_referral_admin_snapshot");
  if (error) throw error;
  return data as ReferralAdminSnapshot;
}

export async function saveAffiliateCampaignMaterial(payload: AffiliateMaterialDraft) {
  const { data, error } = await supabase.rpc("save_affiliate_campaign_material", {
    p_payload: payload,
  });
  if (error) throw error;
  return data as string;
}

export async function deleteAffiliateCampaignMaterial(materialId: string) {
  const { error } = await supabase.rpc("delete_affiliate_campaign_material", {
    p_material_id: materialId,
  });
  if (error) throw error;
}

export async function completeAffiliatePayoutRequest(requestId: string, markPaid: boolean) {
  const { data, error } = await supabase.rpc("complete_affiliate_payout_request", {
    p_request_id: requestId,
    p_mark_paid: markPaid,
  });
  if (error) throw error;

  if (markPaid) {
    const { error: notifyError } = await supabase.functions.invoke("referral-notify", {
      body: { action: "payout_paid", payout_request_id: requestId },
    });
    if (notifyError) {
      console.warn("referral-notify payout_paid:", notifyError.message);
    }
  }

  return data;
}

export async function notifyAffiliateMaturedCommissions() {
  const { data, error } = await supabase.functions.invoke("referral-notify", {
    body: { action: "mature_user" },
  });
  if (error) throw error;
  return data as { success?: boolean; matured_count?: number };
}

export async function notifyAllMaturedCommissions() {
  const { data, error } = await supabase.functions.invoke("referral-notify", {
    body: { action: "mature_all" },
  });
  if (error) throw error;
  return data as { success?: boolean; matured_count?: number };
}

const AFFILIATE_ASSETS_BUCKET = "affiliate-campaign-assets";

export function getAffiliateMaterialPublicUrl(storagePath: string) {
  const { data } = supabase.storage.from(AFFILIATE_ASSETS_BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

export async function uploadAffiliateCampaignAsset(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() || "bin";
  const path = `campaign/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from(AFFILIATE_ASSETS_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export function resolveAffiliateMaterialAssetUrl(material: AffiliateCampaignMaterial) {
  if (material.storage_path) {
    return getAffiliateMaterialPublicUrl(material.storage_path);
  }
  return material.external_url;
}

export function resolveAffiliateMaterialCopy(
  material: AffiliateCampaignMaterial,
  referralCode: string,
) {
  const refLink = buildRestaurantSignupUrl(referralCode);
  if (material.material_type === "copy" && material.copy_template) {
    return applyReferralTemplate(material.copy_template, { refLink, refCode: referralCode });
  }
  return resolveAffiliateMaterialAssetUrl(material) ?? refLink;
}
