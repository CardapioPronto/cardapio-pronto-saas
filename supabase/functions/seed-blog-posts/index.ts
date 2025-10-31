import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const blogPosts = [
      {
        title: "Como Transformar Seu Restaurante com Tecnologia Digital",
        slug: "como-transformar-seu-restaurante-com-tecnologia-digital",
        excerpt: "Descubra as principais ferramentas tecnológicas que estão revolucionando a gestão de restaurantes e aumentando a satisfação dos clientes.",
        content: `A transformação digital chegou ao setor de alimentação e está mudando completamente a forma como os restaurantes operam. Neste artigo, vamos explorar as principais tecnologias que você pode implementar para melhorar seu negócio.

**1. Cardápios Digitais**

Os cardápios digitais não são apenas uma tendência pós-pandemia - eles vieram para ficar. Com um cardápio digital, você pode:
- Atualizar preços e itens em tempo real
- Reduzir custos de impressão
- Oferecer uma experiência mais moderna aos clientes
- Incluir fotos atraentes dos pratos

**2. Sistema de Gestão Integrado**

Um bom sistema de gestão integra todas as áreas do seu restaurante:
- PDV (Ponto de Venda)
- Controle de estoque
- Gestão de pedidos
- Relatórios financeiros

**3. Automação de Processos**

A automação pode economizar horas de trabalho manual:
- Pedidos online integrados
- Notificações automáticas
- Gestão de reservas
- Controle de delivery

**Conclusão**

A tecnologia não é mais um diferencial - é uma necessidade. Restaurantes que adotam soluções digitais conseguem operar de forma mais eficiente, reduzir custos e oferecer uma experiência superior aos clientes.`,
        cover_image_url: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4",
        category: "Tecnologia",
        is_published: true,
        is_featured: true,
        published_at: new Date().toISOString()
      },
      {
        title: "5 Estratégias Para Aumentar as Vendas do Seu Restaurante",
        slug: "5-estrategias-para-aumentar-as-vendas-do-seu-restaurante",
        excerpt: "Aprenda técnicas comprovadas para impulsionar suas vendas e atrair mais clientes para o seu estabelecimento.",
        content: `Aumentar as vendas é o objetivo de todo restaurante. Aqui estão 5 estratégias práticas que você pode implementar hoje mesmo.

**1. Marketing Digital Eficiente**

Invista em presença online:
- Redes sociais ativas
- Google Meu Negócio otimizado
- Site responsivo e atrativo
- Promoções exclusivas online

**2. Programa de Fidelidade**

Clientes fiéis são a base de um restaurante de sucesso:
- Crie cartões de fidelidade digitais
- Ofereça recompensas atraentes
- Envie ofertas personalizadas
- Comemore datas especiais dos clientes

**3. Menu Engineering**

Otimize seu cardápio para maximizar lucros:
- Destaque pratos de alta margem
- Use descrições atraentes
- Precifique estrategicamente
- Crie combos rentáveis

**4. Delivery e Takeout**

Expanda seus canais de venda:
- Implemente sistema de pedidos online
- Otimize embalagens
- Ofereça promoções para delivery
- Mantenha qualidade no transporte

**5. Experiência do Cliente**

A experiência é tudo:
- Treine sua equipe constantemente
- Solicite feedback regularmente
- Resolva problemas rapidamente
- Supere expectativas

Implementando essas estratégias, você verá um crescimento consistente nas suas vendas.`,
        cover_image_url: "https://images.unsplash.com/photo-1556742111-a301076d9d18",
        category: "Gestão",
        is_published: true,
        is_featured: true,
        published_at: new Date(Date.now() - 86400000).toISOString() // 1 dia atrás
      },
      {
        title: "Cardápio Digital com QR Code: Guia Completo",
        slug: "cardapio-digital-com-qr-code-guia-completo",
        excerpt: "Tudo o que você precisa saber para implementar um cardápio digital com QR Code no seu restaurante.",
        content: `Os cardápios digitais com QR Code se tornaram essenciais para restaurantes modernos. Veja como implementar no seu estabelecimento.

**Por Que Usar QR Code?**

- **Sem Contato**: Mais higiênico e seguro
- **Atualizações Instantâneas**: Mude preços e itens a qualquer momento
- **Economia**: Elimine custos de impressão
- **Sustentabilidade**: Reduza o uso de papel
- **Analytics**: Acompanhe os itens mais visualizados

**Como Implementar**

1. Escolha uma plataforma de cardápio digital
2. Cadastre seus produtos com fotos e descrições
3. Gere QR Codes para cada mesa
4. Imprima e distribua os QR Codes
5. Treine sua equipe

**Melhores Práticas**

- Use fotos de alta qualidade
- Mantenha descrições claras
- Organize por categorias
- Destaque promoções
- Teste em diferentes dispositivos

**Dicas de Design**

Seu cardápio digital deve ser:
- Responsivo em todos os dispositivos
- Rápido para carregar
- Fácil de navegar
- Visualmente atraente

**Conclusão**

O cardápio digital com QR Code não é apenas uma tendência, é o futuro da experiência gastronômica.`,
        cover_image_url: "https://images.unsplash.com/photo-1556742212-5b321f3c261b",
        category: "Inovação",
        is_published: true,
        is_featured: false,
        published_at: new Date(Date.now() - 172800000).toISOString() // 2 dias atrás
      },
      {
        title: "Como Usar Dados Para Melhorar Seu Restaurante",
        slug: "como-usar-dados-para-melhorar-seu-restaurante",
        excerpt: "Aprenda a tomar decisões baseadas em dados e transforme a gestão do seu restaurante.",
        content: `Os dados são o novo ouro no mundo dos negócios, e os restaurantes não são exceção. Veja como usar analytics para crescer.

**Métricas Essenciais**

**1. Ticket Médio**
- Acompanhe por período
- Compare diferentes dias da semana
- Identifique tendências

**2. Taxa de Ocupação**
- Horários de pico
- Dias mais movimentados
- Tempo médio por mesa

**3. Produtos Mais Vendidos**
- Identifique campeões
- Elimine itens que não vendem
- Otimize estoque

**4. Tempo de Atendimento**
- Desde o pedido até a entrega
- Identifique gargalos
- Melhore processos

**Ferramentas de Análise**

Um bom sistema de gestão oferece:
- Dashboards intuitivos
- Relatórios personalizáveis
- Comparativos de período
- Alertas automáticos

**Tomada de Decisão**

Use os dados para:
- Planejar o cardápio
- Definir preços
- Gerenciar estoque
- Escalar a equipe
- Criar promoções

**Previsão de Demanda**

Com dados históricos, você pode:
- Prever dias movimentados
- Ajustar compras
- Otimizar escalas
- Reduzir desperdício

**ROI de Marketing**

Acompanhe:
- Custo por aquisição de cliente
- Retorno de campanhas
- Efetividade de promoções
- Taxa de retorno de clientes

A análise de dados transforma suposições em certezas, permitindo decisões mais acertadas.`,
        cover_image_url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71",
        category: "Análise",
        is_published: true,
        is_featured: false,
        published_at: new Date(Date.now() - 259200000).toISOString() // 3 dias atrás
      },
      {
        title: "Gestão de Cozinha: Dicas Para Aumentar a Eficiência",
        slug: "gestao-de-cozinha-dicas-para-aumentar-a-eficiencia",
        excerpt: "Descubra como otimizar os processos da sua cozinha e aumentar a produtividade da equipe.",
        content: `Uma cozinha eficiente é o coração de um restaurante de sucesso. Veja como otimizar seus processos.

**Organização Física**

**Mise en Place**
- Prepare ingredientes antecipadamente
- Organize estações de trabalho
- Tenha tudo à mão
- Reduza movimentação desnecessária

**Layout Otimizado**
- Fluxo lógico de trabalho
- Equipamentos bem posicionados
- Áreas de preparo definidas
- Espaço para circulação

**Gestão de Equipe**

**Treinamento Constante**
- Padronize receitas
- Documente processos
- Treine continuamente
- Desenvolva especialidades

**Comunicação Eficiente**
- Sistema de comandas claro
- Priorização de pedidos
- Feedback constante
- Reuniões regulares

**Controle de Qualidade**

**Padrões Definidos**
- Fichas técnicas detalhadas
- Porcionamento consistente
- Temperatura adequada
- Apresentação uniforme

**Inspeção Regular**
- Degustações periódicas
- Controle de qualidade dos insumos
- Verificação de equipamentos
- Limpeza e organização

**Gestão de Estoque**

**Controle Rigoroso**
- Sistema FIFO (First In, First Out)
- Contagem regular
- Fornecedores confiáveis
- Ponto de reposição definido

**Redução de Desperdício**
- Aproveitamento integral
- Porcionamento correto
- Armazenamento adequado
- Criatividade com sobras

**Tecnologia na Cozinha**

**Sistemas Digitais**
- Display de pedidos
- Timers automáticos
- Alertas de estoque
- Relatórios de produtividade

Uma cozinha bem gerenciada entrega qualidade consistente e opera com máxima eficiência.`,
        cover_image_url: "https://images.unsplash.com/photo-1556910103-1c02745aae4d",
        category: "Dicas",
        is_published: true,
        is_featured: true,
        published_at: new Date(Date.now() - 345600000).toISOString() // 4 dias atrás
      }
    ];

    // Insert blog posts
    const { data, error } = await supabaseClient
      .from('blog_posts')
      .insert(blogPosts);

    if (error) {
      console.error('Error inserting blog posts:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        message: 'Blog posts seeded successfully',
        count: blogPosts.length
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
