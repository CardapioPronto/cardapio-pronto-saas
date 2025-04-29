
// Este serviço será responsável por gerenciar os dados administrativos
// Em um ambiente de produção, isso se conectaria a APIs reais

interface Cliente {
  id: string;
  nome: string;
  email: string;
  documento: string;
  telefone: string;
  dataCadastro: Date;
  assinaturaAtiva: boolean;
}

interface Assinatura {
  id: string;
  clienteId: string;
  clienteNome: string;
  planoId: string;
  planoNome: string;
  status: "ativa" | "inativa";
  valor: number;
  dataInicio: Date;
  dataProximaCobranca: Date;
  metodoPagamento: string;
}

interface Plano {
  id: string;
  nome: string;
  preco: number;
  assinantesAtivos: number;
  assinantesInativos: number;
  recursos: string[];
}

// Funções simuladas que seriam substituídas por chamadas de API reais

export const obterAssinaturas = async (): Promise<Assinatura[]> => {
  // Simular delay de rede
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Dados simulados - em produção, viria de uma API
  return [
    {
      id: "sub_12345678",
      clienteId: "cli_1",
      clienteNome: "Restaurante Sabor Brasileiro",
      planoId: "premium",
      planoNome: "Premium",
      status: "ativa",
      valor: 149.90,
      dataInicio: new Date(2023, 5, 15),
      dataProximaCobranca: new Date(2023, 6, 15),
      metodoPagamento: "Cartão de crédito terminado em 4589"
    },
    {
      id: "sub_23456789",
      clienteId: "cli_2",
      clienteNome: "Pizzaria La Bella",
      planoId: "standard",
      planoNome: "Padrão",
      status: "ativa",
      valor: 99.90,
      dataInicio: new Date(2023, 4, 10),
      dataProximaCobranca: new Date(2023, 5, 10),
      metodoPagamento: "Boleto bancário"
    },
    {
      id: "sub_34567890",
      clienteId: "cli_3",
      clienteNome: "Café Central",
      planoId: "basic",
      planoNome: "Básico",
      status: "inativa",
      valor: 49.90,
      dataInicio: new Date(2023, 3, 5),
      dataProximaCobranca: new Date(2023, 4, 5),
      metodoPagamento: "PIX"
    }
  ];
};

export const obterClientes = async (): Promise<Cliente[]> => {
  // Simular delay de rede
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Dados simulados - em produção, viria de uma API
  return [
    {
      id: "cli_1",
      nome: "Restaurante Sabor Brasileiro",
      email: "contato@saborbrasileiro.com",
      documento: "12.345.678/0001-90",
      telefone: "(11) 98765-4321",
      dataCadastro: new Date(2023, 5, 15),
      assinaturaAtiva: true
    },
    {
      id: "cli_2",
      nome: "Pizzaria La Bella",
      email: "contato@labellapizzaria.com",
      documento: "23.456.789/0001-01",
      telefone: "(11) 91234-5678",
      dataCadastro: new Date(2023, 4, 10),
      assinaturaAtiva: true
    },
    {
      id: "cli_3",
      nome: "Café Central",
      email: "contato@cafecentral.com",
      documento: "34.567.890/0001-12",
      telefone: "(11) 99876-5432",
      dataCadastro: new Date(2023, 3, 5),
      assinaturaAtiva: false
    }
  ];
};

export const obterPlanos = async (): Promise<Plano[]> => {
  // Simular delay de rede
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Dados simulados - em produção, viria de uma API
  return [
    {
      id: "basic",
      nome: "Básico",
      preco: 49.90,
      assinantesAtivos: 0,
      assinantesInativos: 1,
      recursos: [
        "1 Cardápio Digital",
        "Até 30 produtos",
        "PDV básico",
        "Suporte por e-mail"
      ]
    },
    {
      id: "standard",
      nome: "Padrão",
      preco: 99.90,
      assinantesAtivos: 1,
      assinantesInativos: 0,
      recursos: [
        "1 Cardápio Digital personalizado",
        "Até 100 produtos",
        "PDV completo",
        "Gestão de mesas e comandas",
        "Relatórios básicos",
        "Suporte por chat"
      ]
    },
    {
      id: "premium",
      nome: "Premium",
      preco: 149.90,
      assinantesAtivos: 1, 
      assinantesInativos: 0,
      recursos: [
        "3 Cardápios Digitais personalizáveis",
        "Produtos ilimitados",
        "PDV completo",
        "Gestão de mesas e comandas",
        "Relatórios avançados",
        "Integração com delivery",
        "Suporte prioritário"
      ]
    }
  ];
};

// Atualizar status de uma assinatura
export const atualizarStatusAssinatura = async (
  id: string, 
  novoStatus: "ativa" | "inativa"
): Promise<boolean> => {
  // Simular delay de rede
  await new Promise(resolve => setTimeout(resolve, 800));
  
  // Simular sucesso
  console.log(`Assinatura ${id} atualizada para ${novoStatus}`);
  return true;
};
