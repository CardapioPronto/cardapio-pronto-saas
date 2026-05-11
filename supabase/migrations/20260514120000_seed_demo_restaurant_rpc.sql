-- =====================================================================
-- Bloco 10 — Operação assistida e go-live
-- RPC seed_demo_restaurant: cria restaurante demo padronizado com massa
-- realista (categorias, produtos, mesas, promoção, cupons, contatos e
-- campanha). Idempotente:
--   * slug já existe e p_reset=false  -> retorna o id existente.
--   * slug já existe e p_reset=true   -> apaga (apenas slugs que começam
--     com 'pubfy-demo' OU que pertencem ao mesmo owner solicitado) e
--     recria.
-- Acesso: apenas super_admin autenticado.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.seed_demo_restaurant(
  p_owner_email text,
  p_slug text DEFAULT 'pubfy-demo',
  p_reset boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_owner_id uuid;
  v_restaurant_id uuid;
  v_existing_id uuid;
  v_existing_owner uuid;
  v_area_id uuid;
  v_cat_entradas uuid;
  v_cat_pratos uuid;
  v_cat_bebidas uuid;
  v_cat_sobremesas uuid;
BEGIN
  IF v_caller IS NULL OR NOT public.is_super_admin(v_caller) THEN
    RAISE EXCEPTION 'Apenas super admins podem executar seed_demo_restaurant';
  END IF;

  IF p_owner_email IS NULL OR length(btrim(p_owner_email)) = 0 THEN
    RAISE EXCEPTION 'owner_email obrigatório';
  END IF;

  IF p_slug IS NULL OR length(btrim(p_slug)) = 0 THEN
    RAISE EXCEPTION 'slug obrigatório';
  END IF;

  SELECT id
    INTO v_owner_id
    FROM auth.users
   WHERE lower(email) = lower(btrim(p_owner_email))
   LIMIT 1;

  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'Owner com email % não encontrado em auth.users', p_owner_email;
  END IF;

  SELECT id, owner_id
    INTO v_existing_id, v_existing_owner
    FROM public.restaurants
   WHERE slug = p_slug;

  IF v_existing_id IS NOT NULL THEN
    IF NOT p_reset THEN
      RETURN jsonb_build_object(
        'status', 'exists',
        'restaurant_id', v_existing_id,
        'owner_id', v_existing_owner,
        'slug', p_slug
      );
    END IF;

    IF v_existing_owner <> v_owner_id AND p_slug NOT LIKE 'pubfy-demo%' THEN
      RAISE EXCEPTION
        'Reset recusado: restaurante % pertence a outro owner e slug não tem prefixo pubfy-demo',
        v_existing_id;
    END IF;

    DELETE FROM public.restaurants WHERE id = v_existing_id;
  END IF;

  INSERT INTO public.restaurants (
    name, slug, owner_id, category, phone, phone_whatsapp,
    address, business_hours, active
  )
  VALUES (
    'Pubfy Demo - ' || initcap(replace(p_slug, '-', ' ')),
    p_slug,
    v_owner_id,
    'restaurante',
    '(11) 98888-0001',
    '5511988880001',
    'Av. Demonstração, 100 - São Paulo/SP',
    'Seg-Dom 11:00 - 23:00',
    true
  )
  RETURNING id INTO v_restaurant_id;

  INSERT INTO public.areas (restaurant_id, name, description, is_active)
  VALUES (v_restaurant_id, 'Salão Principal', 'Salão principal de atendimento', true)
  RETURNING id INTO v_area_id;

  INSERT INTO public.mesas (restaurant_id, area_id, name, number, capacity, status, is_active)
  SELECT v_restaurant_id,
         v_area_id,
         'Mesa ' || n::text,
         n::text,
         CASE WHEN n <= 4 THEN 4 WHEN n <= 6 THEN 6 ELSE 8 END,
         'livre',
         true
  FROM generate_series(1, 6) AS n;

  INSERT INTO public.categories (restaurant_id, name, order_position)
  VALUES
    (v_restaurant_id, 'Entradas',          1),
    (v_restaurant_id, 'Pratos Principais', 2),
    (v_restaurant_id, 'Bebidas',           3),
    (v_restaurant_id, 'Sobremesas',        4);

  SELECT id INTO v_cat_entradas
    FROM public.categories
   WHERE restaurant_id = v_restaurant_id AND name = 'Entradas';
  SELECT id INTO v_cat_pratos
    FROM public.categories
   WHERE restaurant_id = v_restaurant_id AND name = 'Pratos Principais';
  SELECT id INTO v_cat_bebidas
    FROM public.categories
   WHERE restaurant_id = v_restaurant_id AND name = 'Bebidas';
  SELECT id INTO v_cat_sobremesas
    FROM public.categories
   WHERE restaurant_id = v_restaurant_id AND name = 'Sobremesas';

  INSERT INTO public.products
    (restaurant_id, category_id, name, description, price, available, order_position)
  VALUES
    (v_restaurant_id, v_cat_entradas,    'Bruschetta Italiana',          'Pão italiano tostado, tomate fresco e manjericão',         24.90, true, 1),
    (v_restaurant_id, v_cat_entradas,    'Carpaccio de Carne',           'Lâminas de filé mignon, parmesão e alcaparras',            38.00, true, 2),
    (v_restaurant_id, v_cat_entradas,    'Mix de Bolinhos',              'Bacalhau, queijo e legumes - 9 unidades',                  32.00, true, 3),
    (v_restaurant_id, v_cat_pratos,      'Filé Pubfy',                   'Filé mignon ao molho da casa, batata rústica e arroz',     78.00, true, 1),
    (v_restaurant_id, v_cat_pratos,      'Risoto de Camarão',            'Camarões salteados com risoto cremoso de limão siciliano', 72.00, true, 2),
    (v_restaurant_id, v_cat_pratos,      'Burguer Demo',                 'Pão brioche, blend 180g, queijo prato e cebola caramelizada', 39.00, true, 3),
    (v_restaurant_id, v_cat_pratos,      'Salmão Grelhado',              'Salmão com legumes e purê de mandioquinha',                84.00, true, 4),
    (v_restaurant_id, v_cat_bebidas,     'Suco Natural - Laranja',       'Copo 400ml',                                                12.00, true, 1),
    (v_restaurant_id, v_cat_bebidas,     'Refrigerante Lata',            'Coca-Cola, Guaraná ou Sprite',                              7.00,  true, 2),
    (v_restaurant_id, v_cat_bebidas,     'Água com Gás',                 'Garrafa 500ml',                                             6.00,  true, 3),
    (v_restaurant_id, v_cat_bebidas,     'Chopp Pubfy',                  'Tulipa 300ml',                                              14.00, true, 4),
    (v_restaurant_id, v_cat_sobremesas,  'Petit Gateau',                 'Bolo de chocolate quente com sorvete de creme',             28.00, true, 1),
    (v_restaurant_id, v_cat_sobremesas,  'Cheesecake de Frutas Vermelhas','Base de biscoito com calda artesanal',                     24.00, true, 2),
    (v_restaurant_id, v_cat_sobremesas,  'Sorvete Artesanal',            'Duas bolas - escolha o sabor',                              18.00, true, 3);

  INSERT INTO public.promotions (
    restaurant_id, name, description,
    discount_type, discount_value, applicable_to, target_id,
    is_active, valid_from, valid_until, min_order_value
  )
  VALUES (
    v_restaurant_id, 'Domingo de sobremesa', '10% off em todas as sobremesas',
    'percentage', 10, 'category', v_cat_sobremesas,
    true, now(), now() + interval '60 days', NULL
  );

  INSERT INTO public.coupons (
    restaurant_id, code, title, description,
    discount_type, discount_value,
    minimum_order_value, is_active, valid_until, max_uses,
    applicable_to
  )
  VALUES
    (v_restaurant_id, 'BEMVINDO10', 'Boas-vindas Pubfy',
     '10% off no primeiro pedido acima de R$ 30',
     'percentage', 10, 30, true, now() + interval '90 days', 100, 'order'),
    (v_restaurant_id, 'FRETE5',     'Desconto fixo de R$ 5',
     'R$ 5 de desconto em qualquer pedido',
     'fixed', 5, 0, true, now() + interval '90 days', NULL, 'order');

  INSERT INTO public.restaurant_email_contacts (
    restaurant_id, email, name, phone, source, accepts_marketing
  )
  VALUES
    (v_restaurant_id, 'maria.demo@example.com', 'Maria Silva', '11900000001', 'manual',       true),
    (v_restaurant_id, 'joao.demo@example.com',  'João Santos', '11900000002', 'manual',       true),
    (v_restaurant_id, 'ana.demo@example.com',   'Ana Souza',   '11900000003', 'public_order', true),
    (v_restaurant_id, 'pedro.demo@example.com', 'Pedro Lima',  '11900000004', 'public_order', false);

  INSERT INTO public.email_campaigns (
    restaurant_id, name, subject, html_content, status, audience_filter, created_by
  )
  VALUES (
    v_restaurant_id,
    'Promo lançamento Pubfy',
    'Conheça o cardápio Pubfy Demo!',
    '<h1>Bem-vindo!</h1><p>Use o cupom <b>BEMVINDO10</b> para 10% off no primeiro pedido.</p>',
    'draft',
    jsonb_build_object('only_opted_in', true),
    v_caller
  );

  RETURN jsonb_build_object(
    'status', 'created',
    'restaurant_id', v_restaurant_id,
    'owner_id', v_owner_id,
    'slug', p_slug,
    'counts', jsonb_build_object(
      'areas', 1,
      'mesas', 6,
      'categories', 4,
      'products', 14,
      'promotions', 1,
      'coupons', 2,
      'email_contacts', 4,
      'email_campaigns', 1
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.seed_demo_restaurant(text, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.seed_demo_restaurant(text, text, boolean) TO authenticated;

COMMENT ON FUNCTION public.seed_demo_restaurant(text, text, boolean) IS
  'Cria um restaurante demo com massa realista (categorias, produtos, mesas, promoção, cupons, contatos e campanha). Apenas super admins. Use p_reset=true para recriar.';
