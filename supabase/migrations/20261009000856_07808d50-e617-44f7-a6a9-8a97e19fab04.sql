ALTER TABLE public.cash_register_sessions
  ADD COLUMN IF NOT EXISTS ai_review jsonb,
  ADD COLUMN IF NOT EXISTS ai_reviewed_at timestamptz;