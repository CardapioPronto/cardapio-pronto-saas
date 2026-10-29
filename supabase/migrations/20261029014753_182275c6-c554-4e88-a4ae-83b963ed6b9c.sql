CREATE OR REPLACE FUNCTION public._tmp_t3()
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE v_methods jsonb;
BEGIN
  WITH cls AS (
    SELECT o.id, o.total, lower(trim(coalesce(o.payment_method,''))) pm, 'received'::text klass, coalesce(sp.splits,'[]'::jsonb) splits
    FROM public.orders o
    LEFT JOIN LATERAL (
      SELECT jsonb_agg(jsonb_build_object('method',x.method,'amount',x.amount)) splits, sum(x.amount) split_sum
      FROM public.order_payment_splits x WHERE x.order_id = o.id
    ) sp ON true
    LIMIT 10
  )
  SELECT jsonb_build_object(
    'dinheiro', coalesce(sum(v) FILTER (WHERE m='dinheiro'),0),
    'pix', coalesce(sum(v) FILTER (WHERE m='pix'),0),
    'credito', coalesce(sum(v) FILTER (WHERE m='credito'),0),
    'debito', coalesce(sum(v) FILTER (WHERE m='debito'),0),
    'voucher', coalesce(sum(v) FILTER (WHERE m='voucher'),0))
  INTO v_methods
  FROM (
    SELECT CASE c.pm WHEN 'cash' THEN 'dinheiro' WHEN 'credit' THEN 'credito' WHEN 'credit_card' THEN 'credito' WHEN 'cartao_credito' THEN 'credito'
           WHEN 'debit' THEN 'debito' WHEN 'debit_card' THEN 'debito' WHEN 'cartao_debito' THEN 'debito'
           WHEN 'vale' THEN 'voucher' WHEN 'meal_voucher' THEN 'voucher' ELSE c.pm END m, c.total v
    FROM (SELECT * FROM cls WHERE klass='received' AND pm <> 'misto') c
    UNION ALL
    SELECT e->>'method', (e->>'amount')::numeric
    FROM (SELECT * FROM cls WHERE klass='received' AND pm='misto') c2, jsonb_array_elements(c2.splits) e
  ) t;
  RETURN v_methods;
END $$;