-- Kitchen workflow: keep production statuses fast to query and visible through realtime.

CREATE INDEX IF NOT EXISTS idx_orders_kitchen_queue
  ON public.orders(restaurant_id, status, created_at ASC)
  WHERE status IN ('pendente', 'preparo', 'em-andamento', 'pronto');

ALTER TABLE public.orders REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.sync_delivery_order_status_from_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_delivery_status text;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  v_delivery_status := CASE NEW.status
    WHEN 'aguardando_pagamento' THEN 'awaiting_payment'
    WHEN 'pagamento_falhou' THEN 'payment_failed'
    WHEN 'pendente' THEN 'pending'
    WHEN 'preparo' THEN 'preparing'
    WHEN 'em-andamento' THEN 'preparing'
    WHEN 'pronto' THEN 'ready'
    WHEN 'finalizado' THEN 'delivered'
    WHEN 'cancelado' THEN 'cancelled'
    ELSE NULL
  END;

  IF v_delivery_status IS NOT NULL THEN
    UPDATE public.delivery_orders
    SET status = v_delivery_status,
        updated_at = now()
    WHERE order_id = NEW.id
      AND status IS DISTINCT FROM v_delivery_status;
  END IF;

  RETURN NEW;
END;
$$;
