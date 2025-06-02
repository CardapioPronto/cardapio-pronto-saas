
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DadosEstabelecimento } from "@/services/configuracoes/estabelecimentoService";

interface EstabelecimentoTabProps {
  dadosEstabelecimento: DadosEstabelecimento;
  setDadosEstabelecimento: (dados: DadosEstabelecimento) => void;
  loading: boolean;
  salvarDadosEstabelecimento: () => Promise<void>;
  handleLogoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
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
  return (
    <Card>
      <CardHeader>
        <CardTitle>Dados do Estabelecimento</CardTitle>
        <CardDescription>
          Configure as informações do seu restaurante
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Restaurante</Label>
            <Input
              id="name"
              value={dadosEstabelecimento.name}
              onChange={(e) => setDadosEstabelecimento({...dadosEstabelecimento, name: e.target.value})}
              placeholder="Nome do seu restaurante"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="category">Categoria</Label>
            <Input
              id="category"
              value={dadosEstabelecimento.category || ''}
              onChange={(e) => setDadosEstabelecimento({...dadosEstabelecimento, category: e.target.value})}
              placeholder="Ex: Pizzaria, Hamburgueria, etc."
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              value={dadosEstabelecimento.phone || ''}
              onChange={(e) => setDadosEstabelecimento({...dadosEstabelecimento, phone: e.target.value})}
              placeholder="(11) 99999-9999"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="phone_whatsapp">WhatsApp</Label>
            <Input
              id="phone_whatsapp"
              value={dadosEstabelecimento.phone_whatsapp || ''}
              onChange={(e) => setDadosEstabelecimento({...dadosEstabelecimento, phone_whatsapp: e.target.value})}
              placeholder="+55 11 99999-9999"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              value={dadosEstabelecimento.email || ''}
              onChange={(e) => setDadosEstabelecimento({...dadosEstabelecimento, email: e.target.value})}
              placeholder="contato@restaurante.com"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="cnpj">CNPJ</Label>
            <Input
              id="cnpj"
              value={dadosEstabelecimento.cnpj || ''}
              onChange={(e) => setDadosEstabelecimento({...dadosEstabelecimento, cnpj: e.target.value})}
              placeholder="00.000.000/0000-00"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">Endereço</Label>
          <Textarea
            id="address"
            value={dadosEstabelecimento.address}
            onChange={(e) => setDadosEstabelecimento({...dadosEstabelecimento, address: e.target.value})}
            placeholder="Endereço completo do restaurante"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="business_hours">Horário de Funcionamento</Label>
          <Textarea
            id="business_hours"
            value={dadosEstabelecimento.business_hours || ''}
            onChange={(e) => setDadosEstabelecimento({...dadosEstabelecimento, business_hours: e.target.value})}
            placeholder="Ex: Segunda a Sexta: 11h às 22h, Sábado e Domingo: 11h às 23h"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="logo">Logo do Restaurante</Label>
          <Input
            id="logo"
            type="file"
            accept="image/*"
            onChange={handleLogoChange}
            disabled={logoLoading}
          />
          {logoLoading && <p className="text-sm text-muted-foreground">Fazendo upload...</p>}
          {dadosEstabelecimento.logo_url && (
            <div className="mt-2">
              <img 
                src={dadosEstabelecimento.logo_url} 
                alt="Logo atual" 
                className="h-16 w-16 object-cover rounded"
              />
            </div>
          )}
        </div>

        <Button 
          onClick={salvarDadosEstabelecimento} 
          disabled={loading}
          className="w-full"
        >
          {loading ? "Salvando..." : "Salvar Dados"}
        </Button>
      </CardContent>
    </Card>
  );
};
