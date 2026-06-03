import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PublicSeo } from "@/components/seo/PublicSeo";
import { fetchReferralProgramPublicSettings } from "@/services/referralService";
import { formatReferralTermsBlocks } from "@/lib/formatReferralTerms";

export default function AffiliateTerms() {
  const [content, setContent] = useState<string | null>(null);
  const [version, setVersion] = useState("1");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const settings = await fetchReferralProgramPublicSettings();
        if (!cancelled) {
          setContent(settings.terms_content ?? null);
          setVersion(settings.terms_version ?? "1");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const blocks = content ? formatReferralTermsBlocks(content) : [];

  return (
    <>
      <PublicSeo
        title="Termos do programa de indicações"
        description="Regras de participação, comissões e saques do programa de indicações Pubfy."
        path="/indique/termos"
      />

      <Card className="mx-auto max-w-3xl border-green/20">
        <CardHeader>
          <CardTitle className="text-navy">Termos do programa de indicações</CardTitle>
          <p className="text-sm text-muted-foreground">Versão {version}</p>
        </CardHeader>
        <CardContent className="space-y-4 text-navy/85">
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando termos...</p>
          ) : blocks.length ? (
            blocks.map((block, index) => {
              if (block.type === "h1") {
                return (
                  <h2 key={index} className="text-xl font-semibold text-navy">
                    {block.text}
                  </h2>
                );
              }
              if (block.type === "h2") {
                return (
                  <h3 key={index} className="text-lg font-medium text-navy">
                    {block.text}
                  </h3>
                );
              }
              return (
                <p key={index} className="text-sm leading-relaxed">
                  {block.text}
                </p>
              );
            })
          ) : (
            <p className="text-sm text-muted-foreground">
              Os termos ainda não foram publicados. Entre em contato com a equipe Pubfy.
            </p>
          )}

          <div className="pt-4">
            <Button variant="outline" className="border-green/40 hover:bg-green/10" asChild>
              <Link to="/indique">Voltar ao programa</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
