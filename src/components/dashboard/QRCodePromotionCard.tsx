import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { QrCode, Smartphone, TrendingUp, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const QRCodePromotionCard = () => {
  return (
    <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200/50 shadow-lg">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <QrCode className="h-5 w-5 text-blue-600" />
              <Badge variant="secondary" className="bg-blue-100 text-blue-700 font-medium">
                Novo!
              </Badge>
            </div>
            
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              QR Code do Cardápio Pronto!
            </h3>
            
            <p className="text-gray-700 text-sm mb-4">
              Seu cardápio digital agora pode ser acessado via QR Code. 
              Clientes escaneiam e veem o menu instantaneamente no celular!
            </p>
            
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Smartphone className="h-4 w-4 text-green-600" />
                <span>Zero contato</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <TrendingUp className="h-4 w-4 text-orange-600" />
                <span>Mais vendas</span>
              </div>
            </div>
            
            <Link to="/cardapio">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                Gerar QR Code
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
          
          <div className="flex-shrink-0 ml-4">
            <div className="w-16 h-16 bg-white rounded-lg shadow-md flex items-center justify-center">
              <QrCode className="h-10 w-10 text-blue-600" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};