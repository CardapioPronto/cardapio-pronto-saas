CREATE TABLE IF NOT EXISTS public.ifood_events (
  id text PRIMARY KEY,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  merchant_id text NOT NULL,
  order_id text,
  code text,
  full_code text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  processed_at timestamptz,
  acknowledged_at timestamptz,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ifood_events_restaurant_created
  ON public.ifood_events(restaurant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ifood_events_order_id
  ON public.ifood_events(order_id)
  WHERE order_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_ifood_id_unique
  ON public.orders(ifood_id)
  WHERE ifood_id IS NOT NULL;

ALTER TABLE public.ifood_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Restaurant can view own ifood events" ON public.ifood_events;
CREATE POLICY "Restaurant can view own ifood events"
ON public.ifood_events FOR SELECT
TO authenticated
USING (restaurant_id = public.get_user_restaurant_id());

DROP POLICY IF EXISTS "Super admins can manage ifood events" ON public.ifood_events;
CREATE POLICY "Super admins can manage ifood events"
ON public.ifood_events FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));
