import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, QrCode, Smartphone } from 'lucide-react';
import { Link } from 'react-router-dom';

export const QRCodePromotionCard = () => {
  return (
    <Card className="border-primary/20 bg-card">
      <CardContent className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center gap-2">
              <div className="rounded-md bg-primary/10 p-2 text-primary">
                <QrCode className="h-4 w-4" />
              </div>
              <Badge variant="secondary" className="font-medium">
                Cardápio digital
              </Badge>
            </div>
            
            <h3 className="text-lg font-semibold text-foreground">
              QR Code pronto para salão, balcão e delivery
            </h3>
            
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Centralize tema, produtos, horários, cupons e o QR Code público no módulo de cardápio.
            </p>
          </div>

          <div className="flex flex-shrink-0 items-center gap-3">
            <div className="hidden items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground sm:flex">
              <Smartphone className="h-4 w-4 text-green" />
              Público mobile
            </div>
            <Button asChild>
              <Link to="/cardapio">
                Gerenciar QR Code
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
