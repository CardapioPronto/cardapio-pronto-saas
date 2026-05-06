import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const html = (title: string, message: string, status = 200) =>
  new Response(
    `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title}</title>
  <style>
    body{font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;margin:0;background:#f8fafc;color:#0f172a}
    main{min-height:100vh;display:grid;place-items:center;padding:24px}
    section{max-width:520px;background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:28px;box-shadow:0 12px 40px rgba(15,23,42,.08)}
    h1{font-size:22px;margin:0 0 12px}
    p{line-height:1.6;color:#475569;margin:0}
  </style>
</head>
<body><main><section><h1>${title}</h1><p>${message}</p></section></main></body>
</html>`,
    { status, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } },
  );

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const token = (url.searchParams.get("token") || "").trim();

  if (!token) {
    return html("Link inválido", "Não encontramos um token de descadastro válido.", 400);
  }

  const { data: contact, error } = await admin
    .from("restaurant_email_contacts")
    .select("id, email")
    .eq("unsubscribe_token", token)
    .maybeSingle();

  if (error) {
    console.error("unsubscribe lookup error:", error);
    return html("Erro ao descadastrar", "Não foi possível concluir o descadastro agora.", 500);
  }

  if (!contact) {
    return html("Link expirado", "Não encontramos esse contato ou o link não é mais válido.", 404);
  }

  const { error: updateError } = await admin
    .from("restaurant_email_contacts")
    .update({
      accepts_marketing: false,
      unsubscribed_at: new Date().toISOString(),
    })
    .eq("id", contact.id);

  if (updateError) {
    console.error("unsubscribe update error:", updateError);
    return html("Erro ao descadastrar", "Não foi possível concluir o descadastro agora.", 500);
  }

  return html(
    "Descadastro confirmado",
    "Seu e-mail foi removido das campanhas de marketing deste restaurante. E-mails transacionais, como confirmação de pedido, ainda podem ser enviados quando necessários.",
  );
});
