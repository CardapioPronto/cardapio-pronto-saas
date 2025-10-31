import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Eye, Trash2, CheckCircle, Mail, Phone, MessageSquare } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
  read_at?: string;
  notes?: string;
}

export default function AdminContact() {
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [notes, setNotes] = useState("");
  const queryClient = useQueryClient();

  const { data: messages, isLoading } = useQuery({
    queryKey: ["contact-messages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_messages")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ContactMessage[];
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("contact_messages")
        .update({ read_at: new Date().toISOString(), status: "read" })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact-messages"] });
      toast({ title: "Mensagem marcada como lida" });
    },
  });

  const updateNotesMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const { error } = await supabase
        .from("contact_messages")
        .update({ notes, status: "resolved" })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact-messages"] });
      toast({ title: "Notas salvas com sucesso" });
      setSelectedMessage(null);
      setNotes("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("contact_messages")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact-messages"] });
      toast({ title: "Mensagem excluída" });
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; className: string }> = {
      pending: { label: "Pendente", className: "bg-yellow-500" },
      read: { label: "Lida", className: "bg-blue-500" },
      resolved: { label: "Resolvida", className: "bg-green-500" },
    };
    const { label, className } = variants[status] || variants.pending;
    return <Badge className={className}>{label}</Badge>;
  };

  if (isLoading) {
    return <div className="p-8">Carregando...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Mensagens de Contato</h1>
        <p className="text-muted-foreground">Gerencie as mensagens recebidas</p>
      </div>

      <div className="grid gap-4">
        {messages?.map((message) => (
          <Card key={message.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <CardTitle className="flex items-center gap-2">
                    {message.name}
                    {getStatusBadge(message.status)}
                  </CardTitle>
                  <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {message.email}
                    </div>
                    {message.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        {message.phone}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Assunto: <span className="font-medium">{message.subject}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedMessage(message);
                          setNotes(message.notes || "");
                          if (message.status === "pending") {
                            markAsReadMutation.mutate(message.id);
                          }
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Detalhes da Mensagem</DialogTitle>
                        <DialogDescription>
                          Recebida em {format(new Date(message.created_at), "PPpp", { locale: ptBR })}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-semibold mb-2">Mensagem:</h4>
                          <p className="whitespace-pre-wrap bg-muted p-4 rounded-lg">{message.message}</p>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-2">Notas internas:</h4>
                          <Textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Adicione notas sobre esta mensagem..."
                            rows={4}
                          />
                        </div>
                        <Button
                          onClick={() => updateNotesMutation.mutate({ id: message.id, notes })}
                          disabled={updateNotesMutation.isPending}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Salvar e Marcar como Resolvida
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir mensagem?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação não pode ser desfeita. A mensagem será permanentemente excluída.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteMutation.mutate(message.id)}>
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground line-clamp-2">{message.message}</p>
              {message.notes && (
                <div className="mt-2 p-2 bg-muted rounded text-sm">
                  <strong>Notas:</strong> {message.notes}
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {messages?.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Nenhuma mensagem de contato recebida ainda.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
