import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Mail } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ContactRecipient {
  id: string;
  email: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export default function AdminContactRecipients() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const queryClient = useQueryClient();

  const { data: recipients, isLoading } = useQuery({
    queryKey: ["contact-recipients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_recipients")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ContactRecipient[];
    },
  });

  const addRecipientMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("contact_recipients")
        .insert({ name, email, is_active: true });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact-recipients"] });
      toast({ title: "Destinatário adicionado com sucesso" });
      setOpen(false);
      setName("");
      setEmail("");
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao adicionar destinatário",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("contact_recipients")
        .update({ is_active: isActive })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact-recipients"] });
      toast({ title: "Status atualizado" });
    },
  });

  const deleteRecipientMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("contact_recipients")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact-recipients"] });
      toast({ title: "Destinatário removido" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addRecipientMutation.mutate();
  };

  if (isLoading) {
    return <div className="p-8">Carregando...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Destinatários de Email</h1>
          <p className="text-muted-foreground">
            Gerencie os emails que receberão as mensagens de contato
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Destinatário
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Novo Destinatário</DialogTitle>
                <DialogDescription>
                  Adicione um email que receberá as mensagens de contato
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Suporte"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="suporte@exemplo.com"
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={addRecipientMutation.isPending}>
                  {addRecipientMutation.isPending ? "Adicionando..." : "Adicionar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Destinatários</CardTitle>
        </CardHeader>
        <CardContent>
          {recipients && recipients.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recipients.map((recipient) => (
                  <TableRow key={recipient.id}>
                    <TableCell className="font-medium">{recipient.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        {recipient.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={recipient.is_active}
                          onCheckedChange={(checked) =>
                            toggleActiveMutation.mutate({
                              id: recipient.id,
                              isActive: checked,
                            })
                          }
                        />
                        <span className="text-sm">
                          {recipient.is_active ? "Ativo" : "Inativo"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover destinatário?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Este email não receberá mais as mensagens de contato.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteRecipientMutation.mutate(recipient.id)}
                            >
                              Remover
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Nenhum destinatário cadastrado ainda.
              </p>
              <p className="text-sm text-muted-foreground">
                Adicione emails para receber as mensagens de contato.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
