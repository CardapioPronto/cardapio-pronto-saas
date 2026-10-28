CREATE OR REPLACE FUNCTION public.can_remove_unlinked_cash_receipt(p_path text)
RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_restaurant uuid := public.get_user_restaurant_id(); v_session uuid;
BEGIN
 IF auth.uid() IS NULL OR v_restaurant IS NULL
 OR split_part(p_path,'/',1) <> v_restaurant::text
 OR split_part(p_path,'/',3) <> auth.uid()::text
 OR NOT public.user_has_restaurant_permission(v_restaurant,'cash_manage') THEN RETURN false; END IF;
 SELECT s.id INTO v_session FROM public.cash_register_sessions s
 WHERE s.id::text=split_part(p_path,'/',2) AND s.restaurant_id=v_restaurant FOR UPDATE;
 IF v_session IS NULL THEN RETURN false; END IF;
 RETURN NOT EXISTS (SELECT 1 FROM public.cash_movements m WHERE m.receipt_path=p_path);
END $$;
REVOKE ALL ON FUNCTION public.can_remove_unlinked_cash_receipt(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_remove_unlinked_cash_receipt(text) TO authenticated;
CREATE POLICY "Remove own unlinked cash receipts" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id='cash-receipts' AND public.can_remove_unlinked_cash_receipt(name));