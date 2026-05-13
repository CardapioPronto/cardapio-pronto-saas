// Verificação de tokens Cloudflare Turnstile.
//
// Se TURNSTILE_SECRET_KEY não estiver configurado, retornamos `skipped: true`
// para permitir que ambientes de desenvolvimento sigam funcionando. Em
// produção, defina o secret no Supabase: Settings → Edge Functions → Secrets.
//
// Docs: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/

export type TurnstileVerifyResult =
  | { success: true; skipped?: false; action?: string; cdata?: string }
  | { success: false; skipped?: false; errorCodes?: string[] }
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
  options: { req?: Request; expectedAction?: string } = {},
): Promise<TurnstileVerifyResult> {
  const secret = Deno.env.get("TURNSTILE_SECRET_KEY")?.trim();
  if (!secret) {
    return { success: true, skipped: true };
  }

  if (!token || typeof token !== "string") {
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
    const data = (await response.json()) as CloudflareSiteverifyResponse;

    if (!data.success) {
      return { success: false, errorCodes: data["error-codes"] };
    }

    if (options.expectedAction && data.action && data.action !== options.expectedAction) {
      return { success: false, errorCodes: ["action-mismatch"] };
    }

    return { success: true, action: data.action, cdata: data.cdata };
  } catch (error) {
    console.error("[turnstile] verification failure", error);
    return { success: false, errorCodes: ["network-error"] };
  }
}
