-- M8: Persist restaurant onboarding progress for guided implementation.

CREATE TABLE IF NOT EXISTS public.restaurant_onboarding_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  step_id text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  completed_at timestamptz,
  completed_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  skipped_at timestamptz,
  skipped_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT restaurant_onboarding_progress_status_check
    CHECK (status IN ('pending', 'done', 'skipped')),
  CONSTRAINT restaurant_onboarding_progress_step_id_check
    CHECK (length(trim(step_id)) BETWEEN 2 AND 80),
  CONSTRAINT restaurant_onboarding_progress_unique_step
    UNIQUE (restaurant_id, step_id)
);

CREATE INDEX IF NOT EXISTS restaurant_onboarding_progress_restaurant_idx
  ON public.restaurant_onboarding_progress (restaurant_id);

CREATE INDEX IF NOT EXISTS restaurant_onboarding_progress_status_idx
  ON public.restaurant_onboarding_progress (status);

ALTER TABLE public.restaurant_onboarding_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_onboarding_progress FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Restaurant staff can view onboarding progress"
  ON public.restaurant_onboarding_progress;
CREATE POLICY "Restaurant staff can view onboarding progress"
ON public.restaurant_onboarding_progress
FOR SELECT
TO authenticated
USING (
  restaurant_id = public.get_user_restaurant_id()
  OR public.is_super_admin(auth.uid())
);

DROP POLICY IF EXISTS "Restaurant managers can manage onboarding progress"
  ON public.restaurant_onboarding_progress;
CREATE POLICY "Restaurant managers can manage onboarding progress"
ON public.restaurant_onboarding_progress
FOR ALL
TO authenticated
USING (
  public.user_has_restaurant_permission(restaurant_id, 'settings_view'::public.permission_type)
  OR public.is_super_admin(auth.uid())
)
WITH CHECK (
  public.user_has_restaurant_permission(restaurant_id, 'settings_view'::public.permission_type)
  OR public.is_super_admin(auth.uid())
);

DROP TRIGGER IF EXISTS update_restaurant_onboarding_progress_updated_at
  ON public.restaurant_onboarding_progress;
CREATE TRIGGER update_restaurant_onboarding_progress_updated_at
BEFORE UPDATE ON public.restaurant_onboarding_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.restaurant_onboarding_progress TO authenticated;

COMMENT ON TABLE public.restaurant_onboarding_progress IS
  'Persistent onboarding checklist state per restaurant, used by implantation and customer success.';
