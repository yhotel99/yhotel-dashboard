-- Multi-branch: helper functions + branch-scoped RLS

SET search_path = public;

-- ============================================================================
-- Helper functions (SECURITY DEFINER for stable auth context)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.current_profile_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.role
  FROM public.profiles p
  WHERE p.id = auth.uid() AND p.deleted_at IS NULL
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_profile_branch_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.branch_id
  FROM public.profiles p
  WHERE p.id = auth.uid() AND p.deleted_at IS NULL
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_branch_admin_or_manager()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.deleted_at IS NULL
      AND p.role IN ('admin', 'manager')
  );
$$;

CREATE OR REPLACE FUNCTION public.can_access_branch(p_branch_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_branch_id IS NULL THEN false
    WHEN public.is_branch_admin_or_manager() THEN true
    ELSE EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.deleted_at IS NULL
        AND p.branch_id = p_branch_id
    )
  END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_branch_id_by_code(p_branch_code text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.id
  FROM public.branches b
  WHERE b.deleted_at IS NULL
    AND b.is_active = true
    AND lower(b.code) = lower(trim(p_branch_code))
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.resolve_booking_branch_id(
  p_branch_code text DEFAULT NULL,
  p_room_id uuid DEFAULT NULL,
  p_customer_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_branch_id uuid;
BEGIN
  IF public.is_branch_admin_or_manager() THEN
    IF p_branch_code IS NOT NULL AND trim(p_branch_code) <> '' THEN
      v_branch_id := public.resolve_branch_id_by_code(p_branch_code);
      IF v_branch_id IS NULL THEN
        RAISE EXCEPTION 'INVALID_BRANCH_CODE';
      END IF;
      RETURN v_branch_id;
    END IF;
    IF p_room_id IS NOT NULL THEN
      SELECT r.branch_id INTO v_branch_id FROM public.rooms r WHERE r.id = p_room_id;
      IF v_branch_id IS NOT NULL THEN RETURN v_branch_id; END IF;
    END IF;
    IF p_customer_id IS NOT NULL THEN
      SELECT c.branch_id INTO v_branch_id FROM public.customers c WHERE c.id = p_customer_id;
      IF v_branch_id IS NOT NULL THEN RETURN v_branch_id; END IF;
    END IF;
    RETURN 'a0000000-0000-4000-8000-000000000001'::uuid;
  END IF;

  IF p_branch_code IS NOT NULL AND trim(p_branch_code) <> '' THEN
    v_branch_id := public.resolve_branch_id_by_code(p_branch_code);
    IF v_branch_id IS NULL OR v_branch_id <> public.current_profile_branch_id() THEN
      RAISE EXCEPTION 'BRANCH_ACCESS_DENIED';
    END IF;
    RETURN v_branch_id;
  END IF;

  v_branch_id := public.current_profile_branch_id();
  IF v_branch_id IS NULL THEN
    RAISE EXCEPTION 'STAFF_REQUIRES_BRANCH';
  END IF;
  RETURN v_branch_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.current_profile_role() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_profile_branch_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_branch_admin_or_manager() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_access_branch(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.resolve_branch_id_by_code(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.resolve_booking_branch_id(text, uuid, uuid) TO anon, authenticated, service_role;

-- ============================================================================
-- Branches RLS
-- ============================================================================

DROP POLICY IF EXISTS "Allow authenticated to read branches" ON public.branches;
DROP POLICY IF EXISTS "Allow admin to manage branches" ON public.branches;

CREATE POLICY "Allow authenticated to read branches"
  ON public.branches FOR SELECT TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "Allow anon to read active branches"
  ON public.branches FOR SELECT TO anon
  USING (deleted_at IS NULL AND is_active = true);

CREATE POLICY "Allow admin to insert branches"
  ON public.branches FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.deleted_at IS NULL AND p.role = 'admin'
    )
  );

CREATE POLICY "Allow admin to update branches"
  ON public.branches FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.deleted_at IS NULL AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.deleted_at IS NULL AND p.role = 'admin'
    )
  );

CREATE POLICY "Allow admin to delete branches"
  ON public.branches FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.deleted_at IS NULL AND p.role = 'admin'
    )
  );

-- ============================================================================
-- Replace permissive public RLS on operational tables
-- ============================================================================

-- BOOKINGS
DROP POLICY IF EXISTS "Allow public to read bookings" ON public.bookings;
DROP POLICY IF EXISTS "Allow public to insert bookings" ON public.bookings;
DROP POLICY IF EXISTS "Allow public to update bookings" ON public.bookings;
DROP POLICY IF EXISTS "Allow public to delete bookings" ON public.bookings;
DROP POLICY IF EXISTS "Allow authenticated users to read bookings" ON public.bookings;
DROP POLICY IF EXISTS "Allow authenticated users to insert bookings" ON public.bookings;
DROP POLICY IF EXISTS "Allow authenticated users to update bookings" ON public.bookings;
DROP POLICY IF EXISTS "Allow authenticated users to delete bookings" ON public.bookings;

CREATE POLICY "bookings_select_branch"
  ON public.bookings FOR SELECT TO authenticated
  USING (public.can_access_branch(branch_id));

CREATE POLICY "bookings_insert_branch"
  ON public.bookings FOR INSERT TO authenticated
  WITH CHECK (public.can_access_branch(branch_id));

CREATE POLICY "bookings_update_branch"
  ON public.bookings FOR UPDATE TO authenticated
  USING (public.can_access_branch(branch_id))
  WITH CHECK (public.can_access_branch(branch_id));

CREATE POLICY "bookings_delete_branch"
  ON public.bookings FOR DELETE TO authenticated
  USING (public.can_access_branch(branch_id));

-- BOOKING_ROOMS
DROP POLICY IF EXISTS "Allow public to read booking_rooms" ON public.booking_rooms;
DROP POLICY IF EXISTS "Allow public to insert booking_rooms" ON public.booking_rooms;
DROP POLICY IF EXISTS "Allow public to update booking_rooms" ON public.booking_rooms;
DROP POLICY IF EXISTS "Allow public to delete booking_rooms" ON public.booking_rooms;
DROP POLICY IF EXISTS "Allow authenticated users to read booking_rooms" ON public.booking_rooms;
DROP POLICY IF EXISTS "Allow authenticated users to insert booking_rooms" ON public.booking_rooms;
DROP POLICY IF EXISTS "Allow authenticated users to update booking_rooms" ON public.booking_rooms;
DROP POLICY IF EXISTS "Allow authenticated users to delete booking_rooms" ON public.booking_rooms;

CREATE POLICY "booking_rooms_select_branch"
  ON public.booking_rooms FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id AND public.can_access_branch(b.branch_id)
    )
  );

CREATE POLICY "booking_rooms_insert_branch"
  ON public.booking_rooms FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id AND public.can_access_branch(b.branch_id)
    )
  );

CREATE POLICY "booking_rooms_update_branch"
  ON public.booking_rooms FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id AND public.can_access_branch(b.branch_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id AND public.can_access_branch(b.branch_id)
    )
  );

CREATE POLICY "booking_rooms_delete_branch"
  ON public.booking_rooms FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id AND public.can_access_branch(b.branch_id)
    )
  );

-- CUSTOMERS
DROP POLICY IF EXISTS "Allow public to read customers" ON public.customers;
DROP POLICY IF EXISTS "Allow public to insert customers" ON public.customers;
DROP POLICY IF EXISTS "Allow public to update customers" ON public.customers;
DROP POLICY IF EXISTS "Allow public to delete customers" ON public.customers;
DROP POLICY IF EXISTS "Allow authenticated users to read customers" ON public.customers;
DROP POLICY IF EXISTS "Allow authenticated users to insert customers" ON public.customers;
DROP POLICY IF EXISTS "Allow authenticated users to update customers" ON public.customers;
DROP POLICY IF EXISTS "Allow authenticated users to delete customers" ON public.customers;

CREATE POLICY "customers_select_branch"
  ON public.customers FOR SELECT TO authenticated
  USING (public.can_access_branch(branch_id));

CREATE POLICY "customers_insert_branch"
  ON public.customers FOR INSERT TO authenticated
  WITH CHECK (public.can_access_branch(branch_id));

CREATE POLICY "customers_update_branch"
  ON public.customers FOR UPDATE TO authenticated
  USING (public.can_access_branch(branch_id))
  WITH CHECK (public.can_access_branch(branch_id));

CREATE POLICY "customers_delete_branch"
  ON public.customers FOR DELETE TO authenticated
  USING (public.can_access_branch(branch_id));

-- ROOMS
DROP POLICY IF EXISTS "Allow public to read rooms" ON public.rooms;
DROP POLICY IF EXISTS "Allow public to insert rooms" ON public.rooms;
DROP POLICY IF EXISTS "Allow public to update rooms" ON public.rooms;
DROP POLICY IF EXISTS "Allow public to delete rooms" ON public.rooms;
DROP POLICY IF EXISTS "Allow authenticated users to read rooms" ON public.rooms;
DROP POLICY IF EXISTS "Allow authenticated users to insert rooms" ON public.rooms;
DROP POLICY IF EXISTS "Allow authenticated users to update rooms" ON public.rooms;
DROP POLICY IF EXISTS "Allow authenticated users to delete rooms" ON public.rooms;

CREATE POLICY "rooms_select_branch"
  ON public.rooms FOR SELECT TO authenticated
  USING (public.can_access_branch(branch_id));

CREATE POLICY "rooms_insert_branch"
  ON public.rooms FOR INSERT TO authenticated
  WITH CHECK (public.can_access_branch(branch_id));

CREATE POLICY "rooms_update_branch"
  ON public.rooms FOR UPDATE TO authenticated
  USING (public.can_access_branch(branch_id))
  WITH CHECK (public.can_access_branch(branch_id));

CREATE POLICY "rooms_delete_branch"
  ON public.rooms FOR DELETE TO authenticated
  USING (public.can_access_branch(branch_id));

-- Anon: read rooms for public booking (branch via RPC; limited direct read)
CREATE POLICY "rooms_anon_select_active"
  ON public.rooms FOR SELECT TO anon
  USING (deleted_at IS NULL);

-- PAYMENTS
DROP POLICY IF EXISTS "Allow public to read payments" ON public.payments;
DROP POLICY IF EXISTS "Allow public to insert payments" ON public.payments;
DROP POLICY IF EXISTS "Allow public to update payments" ON public.payments;
DROP POLICY IF EXISTS "Allow public to delete payments" ON public.payments;
DROP POLICY IF EXISTS "Allow authenticated users to read payments" ON public.payments;
DROP POLICY IF EXISTS "Allow authenticated users to insert payments" ON public.payments;
DROP POLICY IF EXISTS "Allow authenticated users to update payments" ON public.payments;
DROP POLICY IF EXISTS "Allow authenticated users to delete payments" ON public.payments;

CREATE POLICY "payments_select_branch"
  ON public.payments FOR SELECT TO authenticated
  USING (public.can_access_branch(branch_id));

CREATE POLICY "payments_insert_branch"
  ON public.payments FOR INSERT TO authenticated
  WITH CHECK (public.can_access_branch(branch_id));

CREATE POLICY "payments_update_branch"
  ON public.payments FOR UPDATE TO authenticated
  USING (public.can_access_branch(branch_id))
  WITH CHECK (public.can_access_branch(branch_id));

CREATE POLICY "payments_delete_branch"
  ON public.payments FOR DELETE TO authenticated
  USING (public.can_access_branch(branch_id));

-- REFUND_REQUESTS (via booking)
DROP POLICY IF EXISTS "Allow public to read refund_requests" ON public.refund_requests;
DROP POLICY IF EXISTS "Allow public to insert refund_requests" ON public.refund_requests;
DROP POLICY IF EXISTS "Allow public to update refund_requests" ON public.refund_requests;
DROP POLICY IF EXISTS "Allow public to delete refund_requests" ON public.refund_requests;
DROP POLICY IF EXISTS "Allow authenticated users to read refund_requests" ON public.refund_requests;
DROP POLICY IF EXISTS "Allow authenticated users to insert refund_requests" ON public.refund_requests;
DROP POLICY IF EXISTS "Allow authenticated users to update refund_requests" ON public.refund_requests;
DROP POLICY IF EXISTS "Allow authenticated users to delete refund_requests" ON public.refund_requests;

CREATE POLICY "refund_requests_select_branch"
  ON public.refund_requests FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id AND public.can_access_branch(b.branch_id)
    )
  );

CREATE POLICY "refund_requests_insert_branch"
  ON public.refund_requests FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id AND public.can_access_branch(b.branch_id)
    )
  );

CREATE POLICY "refund_requests_update_branch"
  ON public.refund_requests FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id AND public.can_access_branch(b.branch_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id AND public.can_access_branch(b.branch_id)
    )
  );

CREATE POLICY "refund_requests_delete_branch"
  ON public.refund_requests FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id AND public.can_access_branch(b.branch_id)
    )
  );

-- VOUCHERS
DROP POLICY IF EXISTS "Allow public to read vouchers" ON public.vouchers;
DROP POLICY IF EXISTS "Allow authenticated users to insert vouchers" ON public.vouchers;
DROP POLICY IF EXISTS "Allow authenticated users to update vouchers" ON public.vouchers;
DROP POLICY IF EXISTS "Allow authenticated users to delete vouchers" ON public.vouchers;

CREATE POLICY "vouchers_select_branch"
  ON public.vouchers FOR SELECT TO authenticated
  USING (branch_id IS NULL OR public.can_access_branch(branch_id));

CREATE POLICY "vouchers_anon_select"
  ON public.vouchers FOR SELECT TO anon
  USING (deleted_at IS NULL AND is_active = true);

CREATE POLICY "vouchers_insert_branch"
  ON public.vouchers FOR INSERT TO authenticated
  WITH CHECK (branch_id IS NULL OR public.can_access_branch(branch_id));

CREATE POLICY "vouchers_update_branch"
  ON public.vouchers FOR UPDATE TO authenticated
  USING (branch_id IS NULL OR public.can_access_branch(branch_id))
  WITH CHECK (branch_id IS NULL OR public.can_access_branch(branch_id));

CREATE POLICY "vouchers_delete_branch"
  ON public.vouchers FOR DELETE TO authenticated
  USING (branch_id IS NULL OR public.can_access_branch(branch_id));

-- SETTINGS
DROP POLICY IF EXISTS "Authenticated users can view settings" ON public.settings;
DROP POLICY IF EXISTS "Admin and manager can update settings" ON public.settings;
DROP POLICY IF EXISTS "Allow public read settings" ON public.settings;
DROP POLICY IF EXISTS "Allow authenticated write settings" ON public.settings;

-- Settings: global singleton (not branch-scoped); see 20260524120000_settings_global_no_branch.sql
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
      WHERE p.id = auth.uid() AND p.deleted_at IS NULL AND p.role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.deleted_at IS NULL AND p.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "settings_insert_admin"
  ON public.settings FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.deleted_at IS NULL AND p.role = 'admin'
    )
  );

-- QR_DISPLAY_STATE
DROP POLICY IF EXISTS "Allow authenticated users to read qr_display_state" ON public.qr_display_state;
DROP POLICY IF EXISTS "Allow authenticated users to manage qr_display_state" ON public.qr_display_state;

CREATE POLICY "qr_display_select_branch"
  ON public.qr_display_state FOR SELECT TO authenticated, anon
  USING (true);

CREATE POLICY "qr_display_manage_branch"
  ON public.qr_display_state FOR ALL TO authenticated
  USING (public.can_access_branch(branch_id))
  WITH CHECK (public.can_access_branch(branch_id));

-- AUDIT_LOGS
DROP POLICY IF EXISTS "Allow authenticated users to read audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Allow authenticated users to insert audit_logs" ON public.audit_logs;

CREATE POLICY "audit_logs_select_branch"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (
    branch_id IS NULL
    OR public.can_access_branch(branch_id)
    OR public.is_branch_admin_or_manager()
  );

CREATE POLICY "audit_logs_insert_branch"
  ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (
    branch_id IS NULL
    OR public.can_access_branch(branch_id)
    OR public.is_branch_admin_or_manager()
  );
