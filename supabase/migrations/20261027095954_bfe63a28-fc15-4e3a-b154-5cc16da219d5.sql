ALTER TABLE public.cash_movements ADD COLUMN receipt_path text;
CREATE POLICY "Upload own cash receipt" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
 bucket_id='cash-receipts' AND (storage.foldername(name))[1]=public.get_user_restaurant_id()::text
 AND (storage.foldername(name))[3]=auth.uid()::text
 AND public.user_has_restaurant_permission(public.get_user_restaurant_id(),'cash_manage')
 AND lower(storage.extension(name)) IN ('jpg','jpeg','png','webp')
 AND EXISTS (SELECT 1 FROM public.cash_register_sessions s WHERE s.id::text=(storage.foldername(name))[2] AND s.restaurant_id=public.get_user_restaurant_id() AND s.status='open')
);
CREATE POLICY "View tenant cash receipts" ON storage.objects FOR SELECT TO authenticated USING (
 bucket_id='cash-receipts' AND (storage.foldername(name))[1]=public.get_user_restaurant_id()::text
 AND (public.user_has_restaurant_permission(public.get_user_restaurant_id(),'cash_manage') OR public.user_has_restaurant_permission(public.get_user_restaurant_id(),'reports_view'))
 AND ((storage.foldername(name))[3]=auth.uid()::text OR EXISTS (SELECT 1 FROM public.cash_movements m WHERE m.restaurant_id=public.get_user_restaurant_id() AND m.receipt_path=name))
);
CREATE FUNCTION public.validate_cash_receipt() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE s public.cash_register_sessions;
BEGIN
 SELECT * INTO s FROM public.cash_register_sessions WHERE id=NEW.session_id FOR UPDATE;
 IF NOT FOUND OR s.status<>'open' OR s.restaurant_id<>NEW.restaurant_id THEN RAISE EXCEPTION 'Caixa fechado ou indisponível'; END IF;
 IF NEW.receipt_path IS NOT NULL THEN
  IF NEW.receipt_path NOT LIKE NEW.restaurant_id::text || '/' || NEW.session_id::text || '/' || auth.uid()::text || '/%'
    OR NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id='cash-receipts' AND name=NEW.receipt_path) THEN
   RAISE EXCEPTION 'Comprovante inválido ou indisponível';
  END IF;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.validate_cash_receipt() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER validate_cash_receipt BEFORE INSERT ON public.cash_movements FOR EACH ROW EXECUTE FUNCTION public.validate_cash_receipt();