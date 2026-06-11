
-- 1) Restringir policies ALL "USING (true)" ao papel service_role
DROP POLICY IF EXISTS "Service role can manage cart abandonment sessions" ON public.cart_abandonment_sessions;
CREATE POLICY "Service role can manage cart abandonment sessions"
  ON public.cart_abandonment_sessions FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can manage order payments" ON public.order_payments;
CREATE POLICY "Service role can manage order payments"
  ON public.order_payments FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can manage webhook events" ON public.pagarme_webhook_events;
CREATE POLICY "Service role can manage webhook events"
  ON public.pagarme_webhook_events FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can manage public menu analytics events" ON public.public_menu_analytics_events;
CREATE POLICY "Service role can manage public menu analytics events"
  ON public.public_menu_analytics_events FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can manage restaurant payment settings" ON public.restaurant_payment_settings;
CREATE POLICY "Service role can manage restaurant payment settings"
  ON public.restaurant_payment_settings FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can manage recipient accounts" ON public.restaurant_recipient_accounts;
CREATE POLICY "Service role can manage recipient accounts"
  ON public.restaurant_recipient_accounts FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can manage subscriptions" ON public.subscriptions;
CREATE POLICY "Service role can manage subscriptions"
  ON public.subscriptions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 2) Definir search_path imutável em 5 functions
ALTER FUNCTION public.audit_changed_fields(jsonb, jsonb, text[]) SET search_path = public;
ALTER FUNCTION public.generate_affiliate_referral_code(uuid, text) SET search_path = public;
ALTER FUNCTION public.normalize_customer_phone(text) SET search_path = public;
ALTER FUNCTION public.normalize_referral_code(text) SET search_path = public;
ALTER FUNCTION public.update_pagarme_config_updated_at() SET search_path = public;
