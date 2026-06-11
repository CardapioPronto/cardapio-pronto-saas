export type SupportCommonIssue = {
  title: string;
  resolution: string;
};

export type SupportKnowledge = {
  title: string;
  tutorials: string[];
  commonIssues: SupportCommonIssue[];
};

const DEFAULT_KNOWLEDGE: SupportKnowledge = {
  title: "Ajuda rapida",
  tutorials: [
    "Confira se voce esta na unidade correta no seletor do topo.",
    "Use o menu lateral para voltar ao modulo principal da operacao.",
    "Se algo parecer desatualizado, atualize a pagina e tente novamente.",
  ],
  commonIssues: [
    {
      title: "Nao encontro uma informacao",
      resolution: "Use a busca ou os filtros da tela atual e confirme se a unidade ativa e o periodo selecionado estao corretos.",
    },
    {
      title: "A tela parece travada",
      resolution: "Verifique o indicador online/offline no topo. Se estiver online, recarregue a pagina antes de acionar o suporte.",
    },
  ],
};

const KNOWLEDGE_BY_ROUTE: Array<{
  match: (pathname: string) => boolean;
  knowledge: SupportKnowledge;
}> = [
  {
    match: (pathname) => pathname === "/dashboard",
    knowledge: {
      title: "Dashboard e implantacao",
      tutorials: [
        "Use o card Implantacao guiada para ver o proximo passo do restaurante.",
        "Abra os atalhos do checklist para completar dados, produtos, QR Code e pedido de teste.",
        "Confira Acoes rapidas para pendencias operacionais do dia.",
      ],
      commonIssues: [
        {
          title: "Progresso nao avanca",
          resolution: "Atualize a pagina depois de salvar dados do restaurante, produtos ou pedido de teste. O checklist usa os dados reais do sistema.",
        },
        {
          title: "Pedido de hoje nao aparece",
          resolution: "Confirme se o pedido nao foi cancelado e se foi criado na unidade ativa selecionada no topo.",
        },
      ],
    },
  },
  {
    match: (pathname) => pathname === "/pdv",
    knowledge: {
      title: "PDV",
      tutorials: [
        "Escolha mesa ou balcao antes de finalizar, conforme o tipo de atendimento.",
        "Adicione produtos pela lista e revise a comanda antes de concluir.",
        "Use Historico para reabrir, imprimir ou revisar pedidos ja criados.",
      ],
      commonIssues: [
        {
          title: "Nao consigo finalizar o pedido",
          resolution: "Verifique se ha mesa selecionada quando o pedido for de mesa e se todos os itens ainda estao disponiveis.",
        },
        {
          title: "Valor ou itens nao atualizaram",
          resolution: "Confira a comanda no painel lateral e aguarde a sincronizacao. Se estiver offline, o pedido pode entrar na fila local.",
        },
      ],
    },
  },
  {
    match: (pathname) => pathname === "/pedidos",
    knowledge: {
      title: "Pedidos",
      tutorials: [
        "Use filtros de periodo, status e busca para encontrar pedidos especificos.",
        "Abra o detalhe do pedido para imprimir, conferir itens e acompanhar status.",
        "Atualize status conforme o fluxo da operacao: pendente, preparo, pronto e finalizado.",
      ],
      commonIssues: [
        {
          title: "Pedido nao aparece na lista",
          resolution: "Revise o periodo selecionado, o status filtrado e a unidade ativa.",
        },
        {
          title: "Pedido ficou aberto antigo",
          resolution: "Use o filtro de abertos e finalize ou cancele pedidos que nao pertencem mais ao turno atual.",
        },
      ],
    },
  },
  {
    match: (pathname) => pathname === "/cozinha",
    knowledge: {
      title: "Cozinha",
      tutorials: [
        "Acompanhe pedidos pendentes e em preparo por card.",
        "Avance o status quando o preparo iniciar e quando o pedido estiver pronto.",
        "Use a origem do pedido para diferenciar mesa, delivery, WhatsApp e iFood.",
      ],
      commonIssues: [
        {
          title: "Pedido nao chegou na cozinha",
          resolution: "Confirme em Pedidos se ele foi criado e se o status esta pendente ou em preparo.",
        },
        {
          title: "Tela da cozinha nao atualiza",
          resolution: "Verifique a conexao no topo e recarregue a pagina caso a rede tenha oscilado.",
        },
      ],
    },
  },
  {
    match: (pathname) => pathname === "/cardapio",
    knowledge: {
      title: "Cardapio digital",
      tutorials: [
        "Configure tema e personalizacao para deixar o cardapio com a marca do restaurante.",
        "Use a aba QR Code para gerar link publico, QR de mesa e links rastreaveis.",
        "Abra Visualizar para conferir a experiencia do cliente antes de divulgar.",
      ],
      commonIssues: [
        {
          title: "Cardapio publico nao abre",
          resolution: "Confira se o restaurante esta ativo, se existe slug/link publico e se ha produtos disponiveis.",
        },
        {
          title: "QR Code abre link antigo",
          resolution: "Gere novamente o QR Code apos alterar slug ou campanha rastreavel.",
        },
      ],
    },
  },
  {
    match: (pathname) => pathname === "/produtos" || pathname === "/categorias",
    knowledge: {
      title: "Produtos e categorias",
      tutorials: [
        "Crie categorias antes de organizar produtos no cardapio.",
        "Mantenha nome, descricao, preco e disponibilidade revisados.",
        "Use fotos claras para melhorar clique e conversao no cardapio publico.",
      ],
      commonIssues: [
        {
          title: "Produto nao aparece no cardapio",
          resolution: "Verifique se o produto esta ativo, com categoria correta e se o restaurante esta publicado.",
        },
        {
          title: "Estoque bloqueou a venda",
          resolution: "Revise saldo, estoque minimo e configuracao de controle de estoque do produto.",
        },
      ],
    },
  },
  {
    match: (pathname) => pathname === "/relatorios",
    knowledge: {
      title: "Relatorios",
      tutorials: [
        "Escolha a aba certa: financeiro, conversao, avaliacoes, exportacao ou performance.",
        "Revise o periodo antes de comparar resultados.",
        "Na aba Conversao, acompanhe origem, campanha, produtos, buscas e gargalos do cardapio.",
      ],
      commonIssues: [
        {
          title: "Numeros nao batem com a operacao",
          resolution: "Confirme periodo, unidade ativa e status dos pedidos considerados no relatorio.",
        },
        {
          title: "Campanha nao aparece",
          resolution: "Abra o cardapio usando o link com UTM e aguarde eventos reais de visita ou pedido.",
        },
      ],
    },
  },
  {
    match: (pathname) => pathname === "/atendimento",
    knowledge: {
      title: "Atendimento WhatsApp",
      tutorials: [
        "Crie ou conecte uma instancia antes de atender conversas.",
        "Use Conversas para assumir atendimento humano e responder clientes.",
        "Revise automacoes antes de ativar respostas automaticas.",
      ],
      commonIssues: [
        {
          title: "WhatsApp desconectado",
          resolution: "Abra a aba Instancias, gere um novo QR Code e conecte pelo celular autorizado.",
        },
        {
          title: "Mensagem nao envia",
          resolution: "Confirme se a instancia esta conectada e se o usuario tem permissao para responder como humano.",
        },
      ],
    },
  },
  {
    match: (pathname) => pathname === "/automacoes",
    knowledge: {
      title: "Automacoes",
      tutorials: [
        "Acesse integracoes de WhatsApp, e-mail, iFood e pagamentos pela lista de automacoes.",
        "Configure credenciais antes de ativar fluxos automaticos.",
        "Teste cada integracao com poucos eventos antes de usar no operacional.",
      ],
      commonIssues: [
        {
          title: "Integracao nao aparece liberada",
          resolution: "Confira permissoes do usuario e se o plano atual inclui essa funcionalidade.",
        },
        {
          title: "Automacao nao disparou",
          resolution: "Revise se a configuracao esta ativa, se ha credenciais validas e se o evento esperado ocorreu.",
        },
      ],
    },
  },
  {
    match: (pathname) => pathname === "/assinaturas" || pathname === "/recebimentos" || pathname === "/pagarme-config",
    knowledge: {
      title: "Assinaturas e pagamentos",
      tutorials: [
        "Revise status da assinatura e alertas de pagamento no topo do painel.",
        "Configure recebedor e metodos de pagamento antes de vender online.",
        "Use comprovantes e historico para conferir pagamentos pendentes ou aprovados.",
      ],
      commonIssues: [
        {
          title: "Pagamento pendente",
          resolution: "Aguarde a confirmacao do provedor e confira se o webhook foi processado. PIX e boleto podem levar alguns instantes.",
        },
        {
          title: "Recebedor recusado",
          resolution: "Revise dados cadastrais, documentos e conta bancaria antes de tentar novamente.",
        },
      ],
    },
  },
  {
    match: (pathname) => pathname === "/configuracoes",
    knowledge: {
      title: "Configuracoes",
      tutorials: [
        "Atualize dados do estabelecimento antes de divulgar o cardapio publico.",
        "Revise usuarios, permissoes e auditoria quando a equipe mudar.",
        "Mantenha telefone, WhatsApp, endereco e horarios sempre atualizados.",
      ],
      commonIssues: [
        {
          title: "Nao consigo editar uma configuracao",
          resolution: "Confirme se seu usuario tem permissao de configuracoes ou se precisa pedir acesso ao dono.",
        },
        {
          title: "Dados publicos nao atualizaram",
          resolution: "Salve novamente e recarregue o cardapio publico para conferir se o cache do navegador atualizou.",
        },
      ],
    },
  },
];

export const getSupportKnowledgeForPath = (pathname: string): SupportKnowledge => {
  return KNOWLEDGE_BY_ROUTE.find((item) => item.match(pathname))?.knowledge || DEFAULT_KNOWLEDGE;
};
