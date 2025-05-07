
import React, { ChangeEvent } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { DadosEstabelecimento } from "@/services/configuracoes";

interface EstabelecimentoTabProps {
  dadosEstabelecimento: DadosEstabelecimento;
  setDadosEstabelecimento: React.Dispatch<React.SetStateAction<DadosEstabelecimento>>;
  loading: boolean;
  salvarDadosEstabelecimento: () => Promise<void>;
  handleLogoChange: (e: ChangeEvent<HTMLInputElement>) => Promise<void>;
  logoLoading: boolean;
}

export const EstabelecimentoTab: React.FC<EstabelecimentoTabProps> = ({
  dadosEstabelecimento,
  setDadosEstabelecimento,
  loading,
  salvarDadosEstabelecimento,
  handleLogoChange,
  logoLoading
}) => {
  const atualizarDadosEstabelecimento = (e: React.FormEvent) => {
    e.preventDefault();
    salvarDadosEstabelecimento();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dados do Estabelecimento</CardTitle>
        <CardDescription>
          Informações que aparecerão no cardápio digital e recibos
        </CardDescription>
      </CardHeader>
      <form onSubmit={atualizarDadosEstabelecimento}>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="nome-estabelecimento">Nome do Estabelecimento</Label>
            <Input
              id="nome-estabelecimento"
              value={dadosEstabelecimento.nome}
              onChange={(e) => setDadosEstabelecimento({...dadosEstabelecimento, nome: e.target.value})}
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="endereco">Endereço</Label>
            <Input
              id="endereco"
              value={dadosEstabelecimento.endereco || ''}
              onChange={(e) => setDadosEstabelecimento({...dadosEstabelecimento, endereco: e.target.value})}
            />
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                value={dadosEstabelecimento.telefone || ''}
                onChange={(e) => setDadosEstabelecimento({...dadosEstabelecimento, telefone: e.target.value})}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={dadosEstabelecimento.email || ''}
                onChange={(e) => setDadosEstabelecimento({...dadosEstabelecimento, email: e.target.value})}
              />
            </div>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="horario">Horário de Funcionamento</Label>
            <Input
              id="horario"
              value={dadosEstabelecimento.horarioFuncionamento || ''}
              onChange={(e) => setDadosEstabelecimento({...dadosEstabelecimento, horarioFuncionamento: e.target.value})}
              placeholder="Segunda a Domingo: 11h às 23h"
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="logo">Logo do Estabelecimento</Label>
            <Input id="logo" type="file" accept="image/*" onChange={handleLogoChange} />
            <p className="text-sm text-muted-foreground">
              Tamanho recomendado: 200x200px. Formatos: JPG, PNG
            </p>
            
            {logoLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Enviando logo...
              </div>
            )}

            {dadosEstabelecimento.logo_url && (
              <div className="mt-2">
                <p className="text-sm font-medium mb-1">Logo atual:</p>
                <img
                  src={dadosEstabelecimento.logo_url}
                  alt="Logo do estabelecimento"
                  className="w-20 h-20 object-contain border rounded"
                />
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar alterações
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};
