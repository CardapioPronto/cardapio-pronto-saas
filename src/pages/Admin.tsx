import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { User, CreditCard, FileText, Settings } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { Link } from "react-router-dom";
import { 
  obterAssinaturas, 
  obterClientes, 
  obterPlanos,
  atualizarStatusAssinatura
} from "@/services/adminService";
import { useQuery } from "@tanstack/react-query";

const Admin = () => {
  const [searchTerm, setSearchTerm] = useState("");
  
  // Carregar dados com react-query
  const { 
    data: assinaturas = [], 
    isLoading: isLoadingAssinaturas 
  } = useQuery({
    queryKey: ['assinaturas'],
    queryFn: obterAssinaturas,
  });
  
  const { 
    data: clientes = [], 
    isLoading: isLoadingClientes 
  } = useQuery({
    queryKey: ['clientes'],
    queryFn: obterClientes,
  });
  
  const { 
    data: planos = [], 
    isLoading: isLoadingPlanos 
  } = useQuery({
    queryKey: ['planos'],
    queryFn: obterPlanos,
  });

  // Função para filtrar itens baseado no termo de busca
  const filtrarItens = (items: any[], fields: string[]) => {
    if (!searchTerm) return items;
    
    return items.filter(item => 
      fields.some(field => 
        item[field] && item[field].toString().toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  };
  
  const assinaturasFiltradas = filtrarItens(assinaturas, ['id', 'clienteNome', 'planoNome']);
  const clientesFiltrados = filtrarItens(clientes, ['nome', 'email', 'documento']);

  // Função para alternar o status de uma assinatura
  const alternarStatusAssinatura = async (id: string, statusAtual: "ativa" | "inativa") => {
    const novoStatus = statusAtual === "ativa" ? "inativa" : "ativa";
    
    try {
      await atualizarStatusAssinatura(id, novoStatus);
      toast.success(`Status da assinatura alterado com sucesso para ${novoStatus}`);
      
      // Em um ambiente real, isso recarregaria os dados da API
      // Aqui simulamos uma alteração local temporária
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      toast.error("Erro ao atualizar status da assinatura");
      console.error(error);
    }
  };

  return (
    <DashboardLayout title="Administração">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Painel Administrativo</h1>
          <div className="flex items-center gap-3">
            <Link to="/pagarme-config">
              <Button variant="outline" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <span>Configurar Pagar.me</span>
              </Button>
            </Link>
            <div className="w-64">
              <Input
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        <Tabs defaultValue="assinaturas" className="w-full">
          <TabsList className="grid w-full md:w-auto grid-cols-3 md:inline-flex mb-4">
            <TabsTrigger value="assinaturas" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              <span>Assinaturas</span>
            </TabsTrigger>
            <TabsTrigger value="clientes" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>Clientes</span>
            </TabsTrigger>
            <TabsTrigger value="planos" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span>Planos</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assinaturas">
            <Card>
              <CardHeader>
                <CardTitle>Assinaturas</CardTitle>
                <CardDescription>
                  Gerencie as assinaturas de seus clientes
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingAssinaturas ? (
                  <div className="flex justify-center items-center h-40">
                    <p className="text-muted-foreground">Carregando assinaturas...</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Plano</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Próxima cobrança</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assinaturasFiltradas.map((assinatura) => (
                        <TableRow key={assinatura.id}>
                          <TableCell className="font-mono text-xs">{assinatura.id}</TableCell>
                          <TableCell>{assinatura.clienteNome}</TableCell>
                          <TableCell>{assinatura.planoNome}</TableCell>
                          <TableCell>R$ {assinatura.valor.toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge 
                              className={assinatura.status === "ativa" ? "bg-green" : "bg-red-500"}
                            >
                              {assinatura.status === "ativa" ? "Ativa" : "Inativa"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {assinatura.status === "ativa" 
                              ? assinatura.dataProximaCobranca.toLocaleDateString("pt-BR")
                              : "N/A"}
                          </TableCell>
                          <TableCell className="text-right flex justify-end gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => alternarStatusAssinatura(assinatura.id, assinatura.status)}
                            >
                              {assinatura.status === "ativa" ? "Desativar" : "Ativar"}
                            </Button>
                            <Button variant="outline" size="sm">
                              Detalhes
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {assinaturasFiltradas.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="h-24 text-center">
                            Nenhuma assinatura encontrada.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="clientes">
            <Card>
              <CardHeader>
                <CardTitle>Clientes</CardTitle>
                <CardDescription>
                  Gerenciar informações dos clientes
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingClientes ? (
                  <div className="flex justify-center items-center h-40">
                    <p className="text-muted-foreground">Carregando clientes...</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Telefone</TableHead>
                        <TableHead>Documento</TableHead>
                        <TableHead>Cadastro</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clientesFiltrados.map((cliente) => (
                        <TableRow key={cliente.id}>
                          <TableCell>{cliente.nome}</TableCell>
                          <TableCell>{cliente.email}</TableCell>
                          <TableCell>{cliente.telefone}</TableCell>
                          <TableCell>{cliente.documento}</TableCell>
                          <TableCell>{cliente.dataCadastro.toLocaleDateString("pt-BR")}</TableCell>
                          <TableCell>
                            <Badge 
                              className={cliente.assinaturaAtiva ? "bg-green" : "bg-red-500"}
                            >
                              {cliente.assinaturaAtiva ? "Ativo" : "Inativo"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="outline" size="sm">
                              Detalhes
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {clientesFiltrados.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="h-24 text-center">
                            Nenhum cliente encontrado.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="planos">
            <Card>
              <CardHeader>
                <CardTitle>Planos</CardTitle>
                <CardDescription>
                  Gerencie os planos de assinatura disponíveis
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingPlanos ? (
                  <div className="flex justify-center items-center h-40">
                    <p className="text-muted-foreground">Carregando planos...</p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-3 gap-6">
                    {planos.map((plano) => (
                      <Card key={plano.id} className="overflow-hidden">
                        <CardHeader>
                          <CardTitle>{plano.nome}</CardTitle>
                          <CardDescription>
                            <span className="text-2xl font-bold">R$ {plano.preco.toFixed(2)}</span>
                            <span className="text-sm">/mensal</span>
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <p className="text-sm font-medium mb-1">Assinantes:</p>
                            <div className="flex gap-3">
                              <Badge variant="outline" className="bg-green/10 text-green border-green">
                                {plano.assinantesAtivos} ativos
                              </Badge>
                              <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500">
                                {plano.assinantesInativos} inativos
                              </Badge>
                            </div>
                          </div>
                          
                          <div>
                            <p className="text-sm font-medium mb-1">Recursos:</p>
                            <ul className="text-sm space-y-1">
                              {plano.recursos.map((recurso, idx) => (
                                <li key={idx} className="flex items-start">
                                  <span className="text-green mr-2">•</span>
                                  <span>{recurso}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          
                          <Button variant="outline" className="w-full">
                            Editar plano
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Admin;
