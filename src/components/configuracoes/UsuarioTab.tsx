
import React from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Loader2, Lock, Trash2 } from "lucide-react";
import { DadosUsuario } from "@/services/configuracoes";

interface UsuarioTabProps {
  dadosUsuario: DadosUsuario;
  setDadosUsuario: React.Dispatch<React.SetStateAction<DadosUsuario>>;
  loading: boolean;
  avatarLoading: boolean;
  salvarDadosUsuario: () => Promise<void>;
  fazerUploadAvatar: (file: File) => Promise<void>;
  removerAvatar: () => Promise<void>;
}

export const UsuarioTab: React.FC<UsuarioTabProps> = ({
  dadosUsuario,
  setDadosUsuario,
  loading,
  avatarLoading,
  salvarDadosUsuario,
  fazerUploadAvatar,
  removerAvatar,
}) => {
  const avatarInputRef = React.useRef<HTMLInputElement | null>(null);

  const atualizarDadosUsuario = (e: React.FormEvent) => {
    e.preventDefault();
    salvarDadosUsuario();
  };

  const initials = dadosUsuario.nome
    .split(" ")
    .map(part => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "U";

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) await fazerUploadAvatar(file);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dados do Usuário</CardTitle>
        <CardDescription>
          Gerencie sua foto, nome e senha de acesso
        </CardDescription>
      </CardHeader>
      <form onSubmit={atualizarDadosUsuario}>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4 rounded-md border bg-muted/20 p-4 sm:flex-row sm:items-center">
            <Avatar className="h-20 w-20 border bg-navy text-white">
              <AvatarImage src={dadosUsuario.avatar_url || undefined} alt={dadosUsuario.nome || "Usuário"} />
              <AvatarFallback className="bg-navy text-lg font-semibold text-white">
                {initials}
              </AvatarFallback>
            </Avatar>

            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium">Foto de perfil</p>
                <p className="text-xs text-muted-foreground">
                  Use uma imagem quadrada ou retrato em JPG, PNG ou WebP com até 5MB.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={avatarLoading}
                  onClick={() => avatarInputRef.current?.click()}
                >
                  {avatarLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="mr-2 h-4 w-4" />
                  )}
                  Alterar foto
                </Button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  onChange={handleAvatarChange}
                  disabled={avatarLoading}
                />
                {dadosUsuario.avatar_url && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={avatarLoading}
                    onClick={removerAvatar}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remover
                  </Button>
                )}
              </div>
            </div>
          </div>

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
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="email-usuario"
                type="email"
                value={dadosUsuario.email}
                disabled
                readOnly
                className="pl-9"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Alteração de e-mail somente via suporte.
            </p>
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
