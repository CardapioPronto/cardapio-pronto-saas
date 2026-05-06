CREATE TABLE IF NOT EXISTS public.email_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'resend',
  api_key text NOT NULL,
  from_name text NOT NULL DEFAULT 'Pubfy',
  from_email text NOT NULL,
  reply_to text,
  is_enabled boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id),
  CONSTRAINT email_settings_provider_check CHECK (provider = 'resend'),
  CONSTRAINT email_settings_from_email_check CHECK (from_email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'),
  CONSTRAINT email_settings_reply_to_check CHECK (reply_to IS NULL OR reply_to ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'),
  CONSTRAINT email_settings_scope_unique UNIQUE NULLS NOT DISTINCT (restaurant_id, provider)
);

ALTER TABLE public.email_settings ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_email_settings_restaurant
  ON public.email_settings(restaurant_id);

CREATE TRIGGER update_email_settings_updated_at
BEFORE UPDATE ON public.email_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.email_settings (
  restaurant_id,
  provider,
  api_key,
  from_name,
  from_email,
  reply_to,
  is_enabled
)
SELECT
  NULL,
  'resend',
  'configure-via-admin',
  'Pubfy',
  'contato@mail.pubfy.com.br',
  'contato@pubfy.com.br',
  false
WHERE NOT EXISTS (
  SELECT 1
  FROM public.email_settings
  WHERE restaurant_id IS NULL
    AND provider = 'resend'
);
