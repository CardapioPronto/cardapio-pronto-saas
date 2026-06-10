import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuthContext";
import {
  fetchAffiliateDashboard,
  listAffiliateCampaignMaterials,
  resolveAffiliateMaterialCopy,
} from "@/services/referralService";
import type { AffiliateCampaignMaterial, AffiliateProfile } from "@/types/referral";
import { buildRestaurantSignupUrl } from "@/lib/referralAttribution";
import { toast } from "@/components/ui/sonner-toast";

export default function AffiliateMaterials() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<AffiliateProfile | null>(null);
  const [materials, setMaterials] = useState<AffiliateCampaignMaterial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !user) return;

    (async () => {
      try {
        const dashboard = await fetchAffiliateDashboard();
        setProfile(dashboard.profile ?? null);
        const list = await listAffiliateCampaignMaterials();
        setMaterials(list);
      } catch {
        setProfile(null);
        setMaterials([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [user, authLoading]);

  if (authLoading || loading) {
    return <p className="text-center text-muted-foreground">Carregando materiais...</p>;
  }

  if (!user || !profile) {
    return (
      <Card className="mx-auto max-w-md">
        <CardHeader>
          <CardTitle className="text-navy">Perfil necessário</CardTitle>
          <CardDescription>
            Ative seu perfil de afiliado para acessar os materiais.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="bg-green hover:bg-green-dark text-white" asChild>
            <Link to="/indique/cadastro">Ativar perfil</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const signupLink = buildRestaurantSignupUrl(profile.referral_code);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy">Materiais de campanha</h1>
        <p className="text-muted-foreground">Use os materiais abaixo com seu link personalizado.</p>
      </div>

      <Card className="border-green/20">
        <CardHeader>
          <CardTitle className="text-base text-navy">Seu link de indicação</CardTitle>
          <CardDescription className="break-all">{signupLink}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            className="border-green/40 hover:bg-green/10"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(signupLink);
                toast.success("Link copiado.");
              } catch {
                toast.error("Não foi possível copiar.");
              }
            }}
          >
            <Copy className="mr-2 h-4 w-4" />
            Copiar link
          </Button>
        </CardContent>
      </Card>

      {materials.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-card px-4 py-5 text-center text-sm text-muted-foreground">
          Nenhum material publicado ainda. O time Pubfy adicionará campanhas pelo painel admin.
        </p>
      ) : (
        <div className="grid gap-4">
          {materials.map((material) => {
            const resolved = resolveAffiliateMaterialCopy(material, profile.referral_code);
            return (
              <Card key={material.id} className="border-green/20">
                <CardHeader>
                  <CardTitle className="text-base text-navy">{material.title}</CardTitle>
                  {material.description ? (
                    <CardDescription>{material.description}</CardDescription>
                  ) : null}
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {material.material_type === "copy" ? (
                    <Button
                      variant="outline"
                      className="border-green/40 hover:bg-green/10"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(resolved);
                          toast.success("Texto copiado.");
                        } catch {
                          toast.error("Não foi possível copiar.");
                        }
                      }}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copiar mensagem
                    </Button>
                  ) : (
                    <Button variant="outline" className="border-green/40 hover:bg-green/10" asChild>
                      <a href={resolved} target="_blank" rel="noreferrer">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Abrir material
                      </a>
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
