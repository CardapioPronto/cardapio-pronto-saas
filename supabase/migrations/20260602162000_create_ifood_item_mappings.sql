-- Bloco 6.1: mapeamento entre itens externos do iFood e produtos internos.

CREATE TABLE IF NOT EXISTS public.ifood_item_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  merchant_id text,
  external_item_id text NOT NULL,
  external_item_name text NOT NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  last_order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  times_seen integer NOT NULL DEFAULT 1,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  mapped_at timestamptz,
  mapped_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ifood_item_mappings_times_seen_positive CHECK (times_seen >= 0),
  CONSTRAINT ifood_item_mappings_external_item_id_not_blank CHECK (btrim(external_item_id) <> ''),
  CONSTRAINT ifood_item_mappings_external_item_name_not_blank CHECK (btrim(external_item_name) <> '')
);

CREATE UNIQUE INDEX IF NOT EXISTS ifood_item_mappings_restaurant_external_uidx
  ON public.ifood_item_mappings (restaurant_id, external_item_id);

CREATE INDEX IF NOT EXISTS ifood_item_mappings_restaurant_unmapped_idx
  ON public.ifood_item_mappings (restaurant_id, last_seen_at DESC)
  WHERE product_id IS NULL;

CREATE INDEX IF NOT EXISTS ifood_item_mappings_product_idx
  ON public.ifood_item_mappings (product_id)
  WHERE product_id IS NOT NULL;

ALTER TABLE public.ifood_item_mappings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins can manage all ifood item mappings" ON public.ifood_item_mappings;

CREATE POLICY "Super admins can manage all ifood item mappings"
ON public.ifood_item_mappings
FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

COMMENT ON TABLE public.ifood_item_mappings IS
  'Mapeia itens externos do iFood para produtos internos do Pubfy. Restaurantes gerenciam via Edge Function ifood-integration.';
COMMENT ON COLUMN public.ifood_item_mappings.product_id IS
  'Produto interno vinculado. Nulo indica item iFood observado ainda sem mapeamento.';
