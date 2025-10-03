import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Send, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import AdminLayout from "@/components/admin/AdminLayout";

interface Message {
  id: string;
  restaurant_id: string;
  restaurant_name: string;
  phone_number: string;
  message_type: 'incoming' | 'outgoing' | 'auto';
  content: string;
  status: string;
  created_at: string;
}

const AdminWhatsApp = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [filteredMessages, setFilteredMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRestaurant, setSelectedRestaurant] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [replyPhone, setReplyPhone] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadMessages();
  }, []);

  useEffect(() => {
    filterMessages();
  }, [messages, searchTerm, selectedRestaurant]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select(`
          *,
          restaurants:restaurant_id (name)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const messagesWithRestaurant = data?.map((msg: any) => ({
        id: msg.id,
        restaurant_id: msg.restaurant_id,
        restaurant_name: msg.restaurants?.name || 'Desconhecido',
        phone_number: msg.phone_number,
        message_type: msg.message_type,
        content: msg.content,
        status: msg.status,
        created_at: msg.created_at
      })) || [];

      setMessages(messagesWithRestaurant);
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
      toast.error('Erro ao carregar mensagens');
    } finally {
      setLoading(false);
    }
  };

  const filterMessages = () => {
    let filtered = [...messages];

    if (searchTerm) {
      filtered = filtered.filter(msg =>
        msg.phone_number.includes(searchTerm) ||
        msg.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        msg.restaurant_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedRestaurant) {
      filtered = filtered.filter(msg => msg.restaurant_id === selectedRestaurant);
    }

    setFilteredMessages(filtered);
  };

  const sendReply = async () => {
    if (!replyPhone || !replyMessage || !selectedRestaurant) {
      toast.error('Preencha todos os campos');
      return;
    }

    setSending(true);
    try {
      const { data: integration, error: integrationError } = await supabase
        .from('whatsapp_integration')
        .select('*')
        .eq('restaurant_id', selectedRestaurant)
        .single();

      if (integrationError || !integration) {
        toast.error('Integração WhatsApp não encontrada');
        return;
      }

      // Enviar mensagem via edge function
      const { error } = await supabase.functions.invoke('send-twilio-message', {
        body: {
          accountSid: integration.twilio_account_sid,
          authToken: integration.twilio_auth_token,
          from: integration.twilio_phone_number,
          to: replyPhone,
          body: replyMessage
        }
      });

      if (error) throw error;

      // Registrar mensagem no banco
      await supabase.from('whatsapp_messages').insert({
        restaurant_id: selectedRestaurant,
        phone_number: replyPhone,
        message_type: 'outgoing',
        content: replyMessage,
        status: 'sent'
      });

      toast.success('Mensagem enviada com sucesso!');
      setReplyMessage('');
      setReplyPhone('');
      loadMessages();
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      toast.error('Erro ao enviar mensagem');
    } finally {
      setSending(false);
    }
  };

  const getMessageTypeColor = (type: string) => {
    switch (type) {
      case 'incoming': return 'bg-blue-500';
      case 'outgoing': return 'bg-green-500';
      case 'auto': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <AdminLayout title="Gestão de WhatsApp">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Gestão de WhatsApp</h1>
          <p className="text-muted-foreground">
            Visualize e responda mensagens dos restaurantes
          </p>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por telefone, mensagem ou restaurante..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Button onClick={loadMessages} variant="outline">
                Atualizar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Enviar Resposta */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              <CardTitle>Enviar Mensagem</CardTitle>
            </div>
            <CardDescription>
              Envie mensagens para os clientes dos restaurantes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Telefone</label>
                <Input
                  placeholder="+55 11 99999-9999"
                  value={replyPhone}
                  onChange={(e) => setReplyPhone(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Restaurante</label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2"
                  value={selectedRestaurant || ''}
                  onChange={(e) => setSelectedRestaurant(e.target.value)}
                >
                  <option value="">Selecione um restaurante</option>
                  {Array.from(new Set(messages.map(m => m.restaurant_id))).map(id => {
                    const msg = messages.find(m => m.restaurant_id === id);
                    return (
                      <option key={id} value={id}>
                        {msg?.restaurant_name}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Mensagem</label>
              <Textarea
                placeholder="Digite sua mensagem..."
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                rows={3}
              />
            </div>
            <Button 
              onClick={sendReply}
              disabled={!replyPhone || !replyMessage || !selectedRestaurant || sending}
              className="w-full"
            >
              <Send className="h-4 w-4 mr-2" />
              {sending ? 'Enviando...' : 'Enviar Mensagem'}
            </Button>
          </CardContent>
        </Card>

        {/* Lista de Mensagens */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Mensagens</CardTitle>
            <CardDescription>
              {filteredMessages.length} mensagens encontradas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Carregando...</div>
            ) : filteredMessages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma mensagem encontrada
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Restaurante</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Mensagem</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMessages.map((msg) => (
                    <TableRow key={msg.id}>
                      <TableCell className="whitespace-nowrap">
                        {new Date(msg.created_at).toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell>{msg.restaurant_name}</TableCell>
                      <TableCell>{msg.phone_number}</TableCell>
                      <TableCell>
                        <Badge className={getMessageTypeColor(msg.message_type)}>
                          {msg.message_type === 'incoming' ? 'Recebida' :
                           msg.message_type === 'outgoing' ? 'Enviada' : 'Automática'}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-md truncate">
                        {msg.content}
                      </TableCell>
                      <TableCell>
                        <Badge variant={msg.status === 'sent' ? 'default' : 'destructive'}>
                          {msg.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminWhatsApp;
