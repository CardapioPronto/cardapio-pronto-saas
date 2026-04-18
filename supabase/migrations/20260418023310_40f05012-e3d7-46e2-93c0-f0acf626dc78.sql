
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'user_type' AND e.enumlabel = 'manager'
  ) THEN
    ALTER TYPE public.user_type ADD VALUE 'manager';
  END IF;
END$$;
