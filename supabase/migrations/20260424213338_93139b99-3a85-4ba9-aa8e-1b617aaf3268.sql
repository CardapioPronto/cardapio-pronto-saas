-- 1) Adicionar banner_url em restaurants
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS banner_url text;

-- 2) Adicionar addons em order_items
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS addons jsonb DEFAULT '[]'::jsonb;

-- 3) Criar tabela delivery_orders
CREATE TABLE IF NOT EXISTS public.delivery_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  zip_code text NOT NULL,
  street text NOT NULL,
  number text NOT NULL,
  complement text,
  neighborhood text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  reference_point text,
  delivery_fee numeric NOT NULL DEFAULT 0,
  subtotal numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  payment_method text,
  change_for numeric,
  notes text,
  status text NOT NULL DEFAULT 'pending',
  whatsapp_sent_at timestamptz,
  whatsapp_message_id text,
  estimated_delivery_minutes integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_delivery_orders_restaurant ON public.delivery_orders(restaurant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_status ON public.delivery_orders(status);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_phone ON public.delivery_orders(customer_phone);

ALTER TABLE public.delivery_orders ENABLE ROW LEVEL SECURITY;

-- Trigger updated_at
DROP TRIGGER IF EXISTS update_delivery_orders_updated_at ON public.delivery_orders;
CREATE TRIGGER update_delivery_orders_updated_at
  BEFORE UPDATE ON public.delivery_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) RLS delivery_orders
-- Qualquer um pode criar (público)
CREATE POLICY "Anyone can create delivery orders"
ON public.delivery_orders FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Qualquer um pode ver (precisa do ID, usado para tracking público)
CREATE POLICY "Anyone can view delivery order by id"
ON public.delivery_orders FOR SELECT
TO anon, authenticated
USING (true);

-- Restaurante pode atualizar seus próprios
CREATE POLICY "Restaurant can update own delivery orders"
ON public.delivery_orders FOR UPDATE
TO authenticated
USING (restaurant_id = public.get_user_restaurant_id());

-- Super admin pode tudo
CREATE POLICY "Super admins can manage delivery orders"
ON public.delivery_orders FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()));

-- 5) Tabela de histórico de status
CREATE TABLE IF NOT EXISTS public.delivery_order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_order_id uuid NOT NULL REFERENCES public.delivery_orders(id) ON DELETE CASCADE,
  previous_status text,
  new_status text NOT NULL,
  changed_by uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dosh_order ON public.delivery_order_status_history(delivery_order_id, created_at DESC);

ALTER TABLE public.delivery_order_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view status history"
ON public.delivery_order_status_history FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Restaurant can insert status history"
ON public.delivery_order_status_history FOR INSERT
TO authenticated
WITH CHECK (
  delivery_order_id IN (
    SELECT id FROM public.delivery_orders
    WHERE restaurant_id = public.get_user_restaurant_id()
  )
);

CREATE POLICY "Super admins manage status history"
ON public.delivery_order_status_history FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()));

-- 6) Trigger para registrar mudança de status
CREATE OR REPLACE FUNCTION public.log_delivery_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.delivery_order_status_history (delivery_order_id, previous_status, new_status)
    VALUES (NEW.id, NULL, NEW.status);
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.delivery_order_status_history (delivery_order_id, previous_status, new_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_delivery_status ON public.delivery_orders;
CREATE TRIGGER trg_log_delivery_status
  AFTER INSERT OR UPDATE OF status ON public.delivery_orders
  FOR EACH ROW EXECUTE FUNCTION public.log_delivery_order_status_change();

-- 7) Realtime
ALTER TABLE public.delivery_orders REPLICA IDENTITY FULL;
ALTER TABLE public.delivery_order_status_history REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'delivery_orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_orders;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'delivery_order_status_history'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_order_status_history;
  END IF;
END $$;

-- 8) Bucket de assets do restaurante (banner, logo)
INSERT INTO storage.buckets (id, name, public)
VALUES ('restaurant-assets', 'restaurant-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas do bucket
CREATE POLICY "Public can read restaurant assets"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'restaurant-assets');

CREATE POLICY "Restaurant owners can upload assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'restaurant-assets'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.restaurants WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Restaurant owners can update assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'restaurant-assets'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.restaurants WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Restaurant owners can delete assets"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'restaurant-assets'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.restaurants WHERE owner_id = auth.uid()
  )
);