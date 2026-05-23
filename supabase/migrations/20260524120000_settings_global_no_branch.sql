-- Settings: single global row (id = SETTINGS_ID), not per branch.

DROP INDEX IF EXISTS public.settings_branch_id_unique;

ALTER TABLE public.settings DROP COLUMN IF EXISTS branch_id;

DROP POLICY IF EXISTS "settings_select_branch" ON public.settings;
DROP POLICY IF EXISTS "settings_select_authenticated" ON public.settings;
DROP POLICY IF EXISTS "settings_anon_select" ON public.settings;
DROP POLICY IF EXISTS "settings_update_branch" ON public.settings;
DROP POLICY IF EXISTS "settings_update_admin_manager" ON public.settings;
DROP POLICY IF EXISTS "settings_insert_branch" ON public.settings;
DROP POLICY IF EXISTS "settings_insert_admin" ON public.settings;

CREATE POLICY "settings_select_authenticated"
  ON public.settings FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "settings_anon_select"
  ON public.settings FOR SELECT TO anon
  USING (true);

CREATE POLICY "settings_update_admin_manager"
  ON public.settings FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.deleted_at IS NULL
        AND p.role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.deleted_at IS NULL
        AND p.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "settings_insert_admin"
  ON public.settings FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.deleted_at IS NULL
        AND p.role = 'admin'
    )
  );
