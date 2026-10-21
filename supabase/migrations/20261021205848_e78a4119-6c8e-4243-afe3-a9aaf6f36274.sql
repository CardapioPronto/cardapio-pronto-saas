CREATE OR REPLACE FUNCTION public.preserve_confirmed_payment_date() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF OLD.paid_at IS NOT NULL AND NEW.paid_at IS DISTINCT FROM OLD.paid_at THEN NEW.paid_at := OLD.paid_at; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.preserve_confirmed_payment_date() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER preserve_order_payment_date BEFORE UPDATE OF paid_at ON public.orders FOR EACH ROW EXECUTE FUNCTION public.preserve_confirmed_payment_date();
CREATE TRIGGER preserve_payment_payment_date BEFORE UPDATE OF paid_at ON public.order_payments FOR EACH ROW EXECUTE FUNCTION public.preserve_confirmed_payment_date();
CREATE TRIGGER preserve_delivery_payment_date BEFORE UPDATE OF paid_at ON public.delivery_orders FOR EACH ROW EXECUTE FUNCTION public.preserve_confirmed_payment_date();