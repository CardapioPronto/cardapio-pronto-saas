
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, Phone, Clock, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { WhatsAppService } from "@/services/whatsapp/whatsappService";
import { WhatsAppMessage } from "@/services/whatsapp/types";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export const WhatsAppMessages: React.FC = () => {
  const { user } = useCurrentUser();
  const restaurantId = user?.restaurant_id ?? "";
  
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const loadMessages = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await WhatsAppService.getMessages(restaurantId);
      setMessages(data);
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    if (restaurantId) {
      loadMessages();
    }
  }, [restaurantId, loadMessages]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <Clock className="h-3 w-3" />;
      case 'delivered':
        return <CheckCircle className="h-3 w-3" />;
      case 'read':
        return <CheckCircle className="h-3 w-3 text-blue-500" />;
      case 'failed':
        return <AlertCircle className="h-3 w-3 text-red-500" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'bg-yellow-100 text-yellow-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'read':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getMessageTypeColor = (type: string) => {
    switch (type) {
      case 'incoming':
        return 'bg-blue-100 text-blue-800';
      case 'outgoing':
        return 'bg-green-100 text-green-800';
      case 'auto':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-green-600" />
          <CardTitle>Histórico de Mensagens WhatsApp</CardTitle>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadMessages}
          disabled={loading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Carregando mensagens...</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <MessageCircle className="h-12 w-12 text-muted-foreground mb-2" />
            <div className="text-muted-foreground">Nenhuma mensagem encontrada</div>
            <div className="text-sm text-muted-foreground">
              As mensagens do WhatsApp aparecerão aqui
            </div>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {messages.map((message) => {
                let messageTypeLabel = '';
                if (message.message_type === 'incoming') {
                  messageTypeLabel = 'Recebida';
                } else if (message.message_type === 'outgoing') {
                  messageTypeLabel = 'Enviada';
                } else {
                  messageTypeLabel = 'Automática';
                }

                let messageStatusLabel = '';
                if (message.status === 'sent') {
                  messageStatusLabel = 'Enviada';
                } else if (message.status === 'delivered') {
                  messageStatusLabel = 'Entregue';
                } else if (message.status === 'read') {
                  messageStatusLabel = 'Lida';
                } else {
                  messageStatusLabel = 'Falhou';
                }

                // Extracted className for the container
                const containerClassName = "border rounded-lg p-4 space-y-2";

                // Extracted orderIdDisplay for conditional rendering
                const orderIdDisplay = message.order_id
                  ? <span>Pedido: {message.order_id.substring(0, 8)}</span>
                  : null;

                // Extracted createdAtDisplay for conditional rendering
                const createdAtDisplay = message.created_at
                  ? formatDistanceToNow(
                      new Date(message.created_at),
                      { addSuffix: true, locale: ptBR }
                    )
                  : null;

                return (
                  <div
                    key={message.id}
                    className={containerClassName}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{message.phone_number}</span>
                        <Badge 
                          variant="outline" 
                          className={getMessageTypeColor(message.message_type)}
                        >
                          {messageTypeLabel}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="outline" 
                          className={`${getStatusColor(message.status)} flex items-center gap-1`}
                        >
                          {getStatusIcon(message.status)}
                          {messageStatusLabel}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="text-sm bg-gray-50 p-3 rounded">
                      {message.content}
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      {orderIdDisplay}
                      <span>
                        {createdAtDisplay}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
