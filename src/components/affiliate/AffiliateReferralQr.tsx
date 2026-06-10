import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner-toast";

type AffiliateReferralQrProps = {
  signupLink: string;
};

export function AffiliateReferralQr({ signupLink }: AffiliateReferralQrProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!signupLink) return;
    let cancelled = false;
    setLoading(true);
    QRCode.toDataURL(signupLink, {
      width: 220,
      margin: 2,
      color: { dark: "#0f172a", light: "#ffffff" },
    })
      .then((url) => {
        if (!cancelled) setQrCodeUrl(url);
      })
      .catch(() => {
        if (!cancelled) toast.error("Não foi possível gerar o QR Code.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [signupLink]);

  const handleDownload = () => {
    if (!qrCodeUrl) return;
    const link = document.createElement("a");
    link.href = qrCodeUrl;
    link.download = "pubfy-indique-qrcode.png";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("QR Code baixado.");
  };

  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-slate-700 bg-slate-950/50 p-4">
      {loading ? (
        <div className="flex h-[220px] w-[220px] items-center justify-center text-sm text-slate-500">
          Gerando QR...
        </div>
      ) : qrCodeUrl ? (
        <img src={qrCodeUrl} alt="QR Code do link de indicação" className="rounded-md" width={220} height={220} />
      ) : null}
      <Button variant="outline" size="sm" className="border-slate-600" onClick={handleDownload} disabled={!qrCodeUrl}>
        <Download className="mr-2 h-4 w-4" />
        Baixar QR Code
      </Button>
    </div>
  );
}
