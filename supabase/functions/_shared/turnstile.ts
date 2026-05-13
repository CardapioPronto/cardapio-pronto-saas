// Verificação de tokens Cloudflare Turnstile.
//
// Se TURNSTILE_SECRET_KEY não estiver configurado, retornamos `skipped: true`
// para permitir que ambientes de desenvolvimento sigam funcionando. Em
// produção, defina o secret no Supabase: Settings → Edge Functions → Secrets.
//
// Docs: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/

export type TurnstileVerifyResult =
  | { success: true; skipped?: false; action?: string; hostname?: string; cdata?: string }
  | { success: false; skipped?: false; errorCodes?: string[]; hostname?: string; action?: string }
  | { success: true; skipped: true };

interface CloudflareSiteverifyResponse {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  action?: string;
  cdata?: string;
  "error-codes"?: string[];
}

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

function pickRemoteIp(req?: Request): string | undefined {
  if (!req) return undefined;
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || undefined;
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    undefined
  );
}

export async function verifyTurnstileToken(
  token: string | undefined | null,
  options: { req?: Request } = {},
): Promise<TurnstileVerifyResult> {
  const secret = Deno.env.get("TURNSTILE_SECRET_KEY")?.trim();
  if (!secret) {
    console.warn("[turnstile] TURNSTILE_SECRET_KEY not configured; skipping verification");
    return { success: true, skipped: true };
  }

  if (!token || typeof token !== "string") {
    console.warn("[turnstile] missing or invalid token in request body");
    return { success: false, errorCodes: ["missing-input-response"] };
  }

  const body = new URLSearchParams();
  body.set("secret", secret);
  body.set("response", token);
  const remoteIp = pickRemoteIp(options.req);
  if (remoteIp) body.set("remoteip", remoteIp);

  try {
    const response = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    });

    if (!response.ok) {
      console.error("[turnstile] siteverify returned non-2xx", {
        status: response.status,
      });
      return { success: false, errorCodes: [`siteverify-http-${response.status}`] };
    }

    const data = (await response.json()) as CloudflareSiteverifyResponse;

    if (!data.success) {
      console.warn("[turnstile] verification rejected by Cloudflare", {
        errorCodes: data["error-codes"],
        hostname: data.hostname,
        action: data.action,
      });
      return {
        success: false,
        errorCodes: data["error-codes"],
        hostname: data.hostname,
        action: data.action,
      };
    }

    return {
      success: true,
      action: data.action,
      hostname: data.hostname,
      cdata: data.cdata,
    };
  } catch (error) {
    console.error("[turnstile] verification network failure", error);
    return { success: false, errorCodes: ["network-error"] };
  }
}
