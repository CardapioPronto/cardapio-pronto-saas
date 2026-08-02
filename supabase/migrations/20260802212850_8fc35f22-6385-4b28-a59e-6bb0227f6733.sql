CREATE TABLE IF NOT EXISTS public.help_articles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT,
  content TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'geral',
  keywords TEXT[] NOT NULL DEFAULT '{}',
  order_position INTEGER NOT NULL DEFAULT 0,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  published BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS help_articles_category_idx ON public.help_articles (category, order_position);
CREATE INDEX IF NOT EXISTS help_articles_published_idx ON public.help_articles (published);

GRANT SELECT ON public.help_articles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.help_articles TO authenticated;
GRANT ALL ON public.help_articles TO service_role;

ALTER TABLE public.help_articles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "help_articles_public_read" ON public.help_articles;
CREATE POLICY "help_articles_public_read"
ON public.help_articles
FOR SELECT
TO anon, authenticated
USING (published = true OR public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "help_articles_admin_write" ON public.help_articles;
CREATE POLICY "help_articles_admin_write"
ON public.help_articles
FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

DROP TRIGGER IF EXISTS update_help_articles_updated_at ON public.help_articles;
CREATE TRIGGER update_help_articles_updated_at
BEFORE UPDATE ON public.help_articles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.help_articles (slug, title, summary, content, category, keywords, order_position, is_featured, published)
VALUES
  ('primeiro-pedido', 'Como fazer seu primeiro pedido de teste', 'Passo a passo para validar cardapio, PDV e cozinha no mesmo dia.', E'1. Cadastre pelo menos uma categoria e um produto em Produtos.\n2. Ative o cardapio publico em Configuracoes > Personalizacao.\n3. Abra o link do cardapio e finalize um pedido de teste.\n4. Confirme o pedido no PDV e acompanhe na Cozinha.\n5. Finalize o pedido para concluir o checklist de implantacao.', 'primeiros-passos', ARRAY['pedido','teste','onboarding'], 1, true, true),
  ('qr-code-mesas', 'Como gerar e imprimir o QR Code das mesas', 'Gere o QR Code do cardapio e distribua nas mesas.', E'1. Acesse Mesas e cadastre as mesas do salao.\n2. Em Cardapio Digital, copie o link publico.\n3. Use o card de QR Code no Dashboard para baixar a imagem.\n4. Imprima e cole em cada mesa.', 'cardapio', ARRAY['qr code','mesa','cardapio'], 2, true, true),
  ('impressao-pedidos', 'Configurar impressao de pedidos', 'Ajuste vias padrao e impressao automatica por setor.', E'1. Acesse Configuracoes > Sistema > Impressao.\n2. Defina o numero padrao de vias.\n3. Teste a impressao a partir de um pedido do PDV.\n4. Se a impressora nao responder, confirme o driver e o navegador usados no caixa.', 'operacao', ARRAY['impressora','impressao','pdv'], 3, false, true),
  ('whatsapp-conexao', 'Conectar o WhatsApp do restaurante', 'Como parear a instancia e validar o atendimento.', E'1. Acesse Atendimento > Instancias.\n2. Crie a instancia e leia o QR Code com o WhatsApp do restaurante.\n3. Aguarde o status ficar Conectado.\n4. Envie uma mensagem de teste de outro numero para validar a automacao.', 'whatsapp', ARRAY['whatsapp','instancia','qr'], 4, false, true),
  ('pagamentos-online', 'Ativar pagamentos online', 'Habilite Pix, cartao e boleto no cardapio publico.', E'1. Acesse Recebimentos e conclua o cadastro do recebedor.\n2. Aguarde a aprovacao do cadastro.\n3. Ative os meios de pagamento desejados.\n4. Faca um pedido de teste com valor baixo para validar.', 'pagamentos', ARRAY['pix','cartao','boleto','pagarme'], 5, false, true)
ON CONFLICT (slug) DO NOTHING;