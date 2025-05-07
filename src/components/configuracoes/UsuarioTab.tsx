
import React from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface UsuarioTabProps {
  dadosUsuario: {
    nome: string;
    email: string;
    senha: string;
    novaSenha: string;
    confirmarSenha: string;
  };
  setDadosUsuario: React.Dispatch<React.SetStateAction<{
    nome: string;
    email: string;
    senha: string;
    novaSenha: string;
    confirmarSenha: string;
  }>>;
  loading: boolean;
  salvarDadosUsuario: () => Promise<void>;
}

export const UsuarioTab: React.FC<UsuarioTabProps> = ({
  dadosUsuario,
  setDadosUsuario,
  loading,
  salvarDadosUsuario
}) => {
  const atualizarDadosUsuario = (e: React.FormEvent) => {
    e.preventDefault();
    salvarDadosUsuario();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dados do Usuário</CardTitle>
        <CardDescription>
          Gerencie suas informações pessoais e senha de acesso
        </CardDescription>
      </CardHeader>
      <form onSubmit={atualizarDadosUsuario}>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="nome-usuario">Nome</Label>
            <Input
              id="nome-usuario"
              value={dadosUsuario.nome}
              onChange={(e) => setDadosUsuario({...dadosUsuario, nome: e.target.value})}
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="email-usuario">Email</Label>
            <Input
              id="email-usuario"
              type="email"
              value={dadosUsuario.email}
              onChange={(e) => setDadosUsuario({...dadosUsuario, email: e.target.value})}
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="senha-atual">Senha atual</Label>
            <Input
              id="senha-atual"
              type="password"
              value={dadosUsuario.senha}
              readOnly
            />
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="nova-senha">Nova senha</Label>
              <Input
                id="nova-senha"
                type="password"
                value={dadosUsuario.novaSenha}
                onChange={(e) => setDadosUsuario({...dadosUsuario, novaSenha: e.target.value})}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="confirmar-senha">Confirmar senha</Label>
              <Input
                id="confirmar-senha"
                type="password"
                value={dadosUsuario.confirmarSenha}
                onChange={(e) => setDadosUsuario({...dadosUsuario, confirmarSenha: e.target.value})}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Atualizar dados
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};
