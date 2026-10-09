CREATE TABLE public.waitlist_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  public_token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  customer_name text NOT NULL,
  customer_phone text,
  party_size integer NOT NULL DEFAULT 2,
  status text NOT NULL DEFAULT 'waiting',
  source text NOT NULL DEFAULT 'staff',
  notes text,
  mesa_id uuid REFERENCES public.mesas(id) ON DELETE SET NULL,
  notified_at timestamptz,
  seated_at timestamptz,
  finished_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.waitlist_entries TO authenticated;
GRANT ALL ON public.waitlist_entries TO service_role;
ALTER TABLE public.waitlist_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "waitlist_select_own_restaurant" ON public.waitlist_entries
  FOR SELECT TO authenticated USING (restaurant_id = public.get_user_restaurant_id());
CREATE POLICY "waitlist_insert_own_restaurant" ON public.waitlist_entries
  FOR INSERT TO authenticated WITH CHECK (restaurant_id = public.get_user_restaurant_id());
CREATE POLICY "waitlist_update_own_restaurant" ON public.waitlist_entries
  FOR UPDATE TO authenticated USING (restaurant_id = public.get_user_restaurant_id())
  WITH CHECK (restaurant_id = public.get_user_restaurant_id());
CREATE POLICY "waitlist_delete_own_restaurant" ON public.waitlist_entries
  FOR DELETE TO authenticated USING (restaurant_id = public.get_user_restaurant_id());

CREATE INDEX waitlist_entries_restaurant_status_idx ON public.waitlist_entries (restaurant_id, status, created_at);

CREATE OR REPLACE FUNCTION public.validate_waitlist_entry()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.customer_name := btrim(NEW.customer_name);
  IF length(NEW.customer_name) < 2 OR length(NEW.customer_name) > 80 THEN
    RAISE EXCEPTION 'Nome inválido';
  END IF;
  IF NEW.party_size < 1 OR NEW.party_size > 50 THEN
    RAISE EXCEPTION 'Quantidade de pessoas inválida';
  END IF;
  IF NEW.status NOT IN ('waiting','notified','seated','canceled','no_show') THEN
    RAISE EXCEPTION 'Status inválido';
  END IF;
  IF NEW.source NOT IN ('staff','public') THEN
    RAISE EXCEPTION 'Origem inválida';
  END IF;
  IF NEW.notes IS NOT NULL AND length(NEW.notes) > 300 THEN
    RAISE EXCEPTION 'Observação muito longa';
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'notified' AND NEW.notified_at IS NULL THEN NEW.notified_at := now(); END IF;
    IF NEW.status = 'seated' THEN NEW.seated_at := coalesce(NEW.seated_at, now()); NEW.finished_at := now(); END IF;
    IF NEW.status IN ('canceled','no_show') THEN NEW.finished_at := now(); END IF;
    IF NEW.status IN ('waiting','notified') THEN NEW.finished_at := NULL; NEW.seated_at := NULL; END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;

CREATE TRIGGER waitlist_entries_validate BEFORE INSERT OR UPDATE ON public.waitlist_entries
  FOR EACH ROW EXECUTE FUNCTION public.validate_waitlist_entry();

CREATE OR REPLACE FUNCTION public.join_public_waitlist(_slug text, _name text, _phone text, _party_size integer)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _restaurant_id uuid;
  _token uuid;
  _clean_phone text := nullif(regexp_replace(coalesce(_phone,''), '\D', '', 'g'), '');
BEGIN
  PERFORM public._enforce_public_rate_limit('waitlist_join', 5, 600);
  SELECT id INTO _restaurant_id FROM public.restaurants WHERE slug = _slug AND active = true;
  IF _restaurant_id IS NULL THEN RAISE EXCEPTION 'Restaurante não encontrado'; END IF;
  IF _clean_phone IS NOT NULL AND (length(_clean_phone) < 10 OR length(_clean_phone) > 13) THEN
    RAISE EXCEPTION 'Telefone inválido';
  END IF;
  IF _clean_phone IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.waitlist_entries
    WHERE restaurant_id = _restaurant_id AND customer_phone = _clean_phone
      AND status IN ('waiting','notified') AND created_at > now() - interval '12 hours'
  ) THEN
    SELECT public_token INTO _token FROM public.waitlist_entries
    WHERE restaurant_id = _restaurant_id AND customer_phone = _clean_phone
      AND status IN ('waiting','notified') ORDER BY created_at DESC LIMIT 1;
    RETURN _token;
  END IF;
  INSERT INTO public.waitlist_entries (restaurant_id, customer_name, customer_phone, party_size, source)
  VALUES (_restaurant_id, _name, _clean_phone, _party_size, 'public')
  RETURNING public_token INTO _token;
  RETURN _token;
END $$;

CREATE OR REPLACE FUNCTION public.get_public_waitlist_status(_token uuid)
RETURNS TABLE (out_restaurant_name text, out_customer_name text, out_party_size integer, out_status text, out_queue_position integer, out_created_at timestamptz, out_notified_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT r.name, w.customer_name, w.party_size, w.status,
    CASE WHEN w.status = 'waiting' THEN (
      SELECT count(*)::int FROM public.waitlist_entries o
      WHERE o.restaurant_id = w.restaurant_id AND o.status = 'waiting' AND o.created_at <= w.created_at
    ) ELSE 0 END,
    w.created_at, w.notified_at
  FROM public.waitlist_entries w JOIN public.restaurants r ON r.id = w.restaurant_id
  WHERE w.public_token = _token;
END $$;

CREATE OR REPLACE FUNCTION public.cancel_public_waitlist(_token uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.waitlist_entries SET status = 'canceled'
  WHERE public_token = _token AND status IN ('waiting','notified');
END $$;

REVOKE ALL ON FUNCTION public.join_public_waitlist(text,text,text,integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_public_waitlist_status(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_public_waitlist(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_public_waitlist(text,text,text,integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_waitlist_status(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_public_waitlist(uuid) TO anon, authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.waitlist_entries;