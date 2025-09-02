import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Download, QrCode, Share2 } from 'lucide-react';
import { toast } from 'sonner';

export const QRCodeGenerator = () => {
  const { user } = useCurrentUser();
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [menuUrl, setMenuUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.restaurant_id) {
      const url = `${window.location.origin}/cardapio/${user.restaurant_id}`;
      setMenuUrl(url);
      generateQRCode(url);
    }
  }, [user?.restaurant_id]);

  const generateQRCode = async (url: string) => {
    if (!url) return;
    
    setLoading(true);
    try {
      const qrCodeDataUrl = await QRCode.toDataURL(url, {
        width: 300,
        margin: 2,
        color: {
          dark: '#1f2937', // navy color
          light: '#ffffff'
        }
      });
      setQrCodeUrl(qrCodeDataUrl);
    } catch (error) {
      console.error('Erro ao gerar QR Code:', error);
      toast.error('Erro ao gerar QR Code');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!qrCodeUrl) return;
    
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = 'cardapio-qrcode.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('QR Code baixado com sucesso!');
  };

  const handleCopyUrl = async () => {
    if (!menuUrl) return;
    
    try {
      await navigator.clipboard.writeText(menuUrl);
      toast.success('Link copiado para a área de transferência!');
    } catch (error) {
      console.error('Erro ao copiar:', error);
      toast.error('Erro ao copiar link');
    }
  };

  const handleShare = async () => {
    if (!navigator.share || !menuUrl) {
      handleCopyUrl();
      return;
    }

    try {
      await navigator.share({
        title: 'Cardápio Digital',
        text: 'Confira nosso cardápio digital!',
        url: menuUrl
      });
    } catch (error) {
      console.error('Erro ao compartilhar:', error);
      handleCopyUrl();
    }
  };

  if (!user?.restaurant_id) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            QR Code do Cardápio
          </CardTitle>
          <CardDescription>
            Configure seu restaurante para gerar o QR Code
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Para gerar o QR Code do seu cardápio, primeiro complete o cadastro do seu restaurante.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          QR Code do Cardápio
        </CardTitle>
        <CardDescription>
          Escaneie ou compartilhe este QR Code para acessar seu cardápio digital
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col items-center space-y-4">
          {loading ? (
            <div className="w-[300px] h-[300px] bg-muted rounded-lg animate-pulse flex items-center justify-center">
              <QrCode className="h-16 w-16 text-muted-foreground" />
            </div>
          ) : qrCodeUrl ? (
            <img 
              src={qrCodeUrl} 
              alt="QR Code do Cardápio" 
              className="border border-border rounded-lg shadow-sm"
              width={300}
              height={300}
            />
          ) : (
            <div className="w-[300px] h-[300px] bg-muted rounded-lg flex items-center justify-center">
              <QrCode className="h-16 w-16 text-muted-foreground" />
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2 w-full max-w-sm">
            <Button 
              onClick={handleDownload} 
              disabled={!qrCodeUrl || loading}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Baixar PNG
            </Button>
            <Button 
              onClick={handleShare}
              disabled={!menuUrl}
              className="flex items-center gap-2"
            >
              <Share2 className="h-4 w-4" />
              Compartilhar
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Link do cardápio:</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={menuUrl}
              readOnly
              className="flex-1 px-3 py-2 text-sm border border-input bg-background rounded-md"
            />
            <Button 
              onClick={handleCopyUrl}
              variant="outline"
              size="sm"
            >
              Copiar
            </Button>
          </div>
        </div>

        <div className="bg-muted/50 p-3 rounded-lg">
          <h4 className="font-medium text-sm mb-2">Como usar:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Baixe o QR Code e imprima para colocar nas mesas</li>
            <li>• Clientes escanearão com a câmera do celular</li>
            <li>• O cardápio abrirá automaticamente no navegador</li>
            <li>• Atualizações no cardápio aparecem em tempo real</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};