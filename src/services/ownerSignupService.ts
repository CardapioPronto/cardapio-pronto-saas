import { User as AuthUser } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type FinalizeOwnerSignupResponse = {
  success?: boolean;
  finalized?: boolean;
  expired?: boolean;
  restaurant_id?: string;
  error?: string;
};

export type OwnerSignupFinalizeResult = {
  attempted: boolean;
  finalized: boolean;
  expired: boolean;
  restaurantId: string | null;
};

function isPendingOwnerSignup(user: AuthUser) {
  const metadata = user.user_metadata ?? {};
  return metadata.signup_intent === "owner_signup" && Boolean(metadata.pending_restaurant);
}

function isEmailConfirmed(user: AuthUser) {
  const confirmedAt = "confirmed_at" in user ? user.confirmed_at : null;
  return Boolean(user.email_confirmed_at || confirmedAt);
}

export async function finalizeOwnerSignupIfNeeded(
  user: AuthUser,
): Promise<OwnerSignupFinalizeResult> {
  if (!isPendingOwnerSignup(user) || !isEmailConfirmed(user)) {
    return {
      attempted: false,
      finalized: false,
      expired: false,
      restaurantId: null,
    };
  }

  const { data, error } = await supabase.functions.invoke<FinalizeOwnerSignupResponse>(
    "finalize-owner-signup",
    { body: {} },
  );

  if (error) throw error;

  if (data?.expired) {
    return {
      attempted: true,
      finalized: false,
      expired: true,
      restaurantId: null,
    };
  }

  if (data?.success === false) {
    throw new Error(data.error || "Não foi possível finalizar o cadastro do dono.");
  }

  return {
    attempted: true,
    finalized: Boolean(data?.finalized),
    expired: false,
    restaurantId: data?.restaurant_id ?? null,
  };
}
