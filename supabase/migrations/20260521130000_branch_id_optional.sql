-- branch_id optional: drop NOT NULL / staff CHECK from early multi-branch deploys;
-- keep signup trigger compatible (role from metadata, branch_id optional).

ALTER TABLE public.rooms ALTER COLUMN branch_id DROP NOT NULL;
ALTER TABLE public.bookings ALTER COLUMN branch_id DROP NOT NULL;
ALTER TABLE public.customers ALTER COLUMN branch_id DROP NOT NULL;
ALTER TABLE public.payments ALTER COLUMN branch_id DROP NOT NULL;
ALTER TABLE public.qr_display_state ALTER COLUMN branch_id DROP NOT NULL;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_staff_requires_branch;

DROP INDEX IF EXISTS customers_branch_email_unique;
CREATE UNIQUE INDEX IF NOT EXISTS customers_branch_email_unique
  ON public.customers (branch_id, lower(email))
  WHERE deleted_at IS NULL AND email IS NOT NULL AND trim(email) <> '' AND branch_id IS NOT NULL;

DROP INDEX IF EXISTS rooms_branch_room_number_unique;
CREATE UNIQUE INDEX IF NOT EXISTS rooms_branch_room_number_unique
  ON public.rooms (branch_id, room_number)
  WHERE deleted_at IS NULL AND room_number IS NOT NULL AND trim(room_number) <> '' AND branch_id IS NOT NULL;

DROP INDEX IF EXISTS qr_display_state_branch_id_unique;
CREATE UNIQUE INDEX IF NOT EXISTS qr_display_state_branch_id_unique
  ON public.qr_display_state (branch_id)
  WHERE branch_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.user_role := COALESCE(
    NULLIF(trim(new.raw_user_meta_data->>'role'), '')::public.user_role,
    'staff'::public.user_role
  );
  v_branch_id uuid := NULLIF(trim(new.raw_user_meta_data->>'branch_id'), '')::uuid;
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone, role, branch_id)
  VALUES (
    new.id,
    COALESCE(NULLIF(trim(new.raw_user_meta_data->>'full_name'), ''), new.email),
    new.email,
    NULLIF(trim(new.raw_user_meta_data->>'phone'), ''),
    v_role,
    v_branch_id
  );

  RETURN new;
END;
$$;
