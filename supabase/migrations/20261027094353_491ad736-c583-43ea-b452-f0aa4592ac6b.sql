DO $$
DECLARE definition text;
BEGIN
  SELECT pg_get_functiondef('public.close_cash_register_session(uuid,numeric,numeric,numeric,numeric,numeric,numeric,text,text,text)'::regprocedure) INTO definition;
  IF position('''payment_method'',pm' in definition) = 0 THEN
    IF position('''paid_at'',paid_at,''class'',klass' in definition) = 0 THEN
      RAISE EXCEPTION 'Formato do fechamento não reconhecido; nenhuma alteração aplicada';
    END IF;
    definition := replace(definition, '''paid_at'',paid_at,''class'',klass', '''paid_at'',paid_at,''payment_method'',pm,''class'',klass');
    EXECUTE definition;
  END IF;
END $$;