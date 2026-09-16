-- List checkout_sessions for dashboard staff recovery + view:checkout-sessions permission

SET search_path = public;

CREATE INDEX IF NOT EXISTS idx_checkout_sessions_created_at
  ON public.checkout_sessions (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_checkout_sessions_status_created_at
  ON public.checkout_sessions (status, created_at DESC);

INSERT INTO public.permissions (name, description)
VALUES (
  'view:checkout-sessions',
  'View online checkout sessions and create bookings from expired sessions'
)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_id)
SELECT 'admin'::user_role, id
FROM public.permissions
WHERE name = 'view:checkout-sessions'
ON CONFLICT (role, permission_id) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_id)
SELECT 'manager'::user_role, id
FROM public.permissions
WHERE name = 'view:checkout-sessions'
ON CONFLICT (role, permission_id) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_id)
SELECT 'staff'::user_role, id
FROM public.permissions
WHERE name = 'view:checkout-sessions'
ON CONFLICT (role, permission_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.list_checkout_sessions(
  p_search text DEFAULT NULL,
  p_page integer DEFAULT 1,
  p_limit integer DEFAULT 10,
  p_status text DEFAULT NULL,
  p_branch_id uuid DEFAULT NULL,
  p_id uuid DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  payment_code text,
  customer_id uuid,
  branch_code text,
  branch_id uuid,
  check_in timestamptz,
  check_out timestamptz,
  number_of_nights integer,
  total_guests integer,
  notes text,
  total_amount numeric,
  final_amount numeric,
  payment_method text,
  status text,
  expires_at timestamptz,
  booking_id uuid,
  failure_reason text,
  guest_name text,
  guest_email text,
  guest_phone text,
  created_at timestamptz,
  updated_at timestamptz,
  rooms jsonb,
  payment_log_status text,
  payment_log_id uuid,
  total_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH scoped AS (
    SELECT
      cs.id,
      COALESCE(
        (
          SELECT b.id
          FROM public.branches b
          WHERE b.deleted_at IS NULL
            AND cs.branch_code IS NOT NULL
            AND btrim(cs.branch_code) <> ''
            AND lower(b.code) = lower(btrim(cs.branch_code))
          LIMIT 1
        ),
        (
          SELECT r.branch_id
          FROM public.checkout_session_rooms csr
          JOIN public.rooms r ON r.id = csr.room_id
          WHERE csr.session_id = cs.id
          ORDER BY csr.created_at
          LIMIT 1
        )
      ) AS resolved_branch_id
    FROM public.checkout_sessions cs
    WHERE (p_id IS NULL OR cs.id = p_id)
      AND (
        p_status IS NULL
        OR btrim(p_status) = ''
        OR (
          btrim(p_status) = 'needs_action'
          AND cs.status IN ('pending', 'expired')
          AND cs.booking_id IS NULL
        )
        OR (
          btrim(p_status) <> 'needs_action'
          AND cs.status = btrim(p_status)
        )
      )
      AND (
        p_search IS NULL
        OR btrim(p_search) = ''
        OR cs.payment_code ILIKE '%' || btrim(p_search) || '%'
        OR COALESCE(cs.guest_name, '') ILIKE '%' || btrim(p_search) || '%'
        OR COALESCE(cs.guest_phone, '') ILIKE '%' || btrim(p_search) || '%'
        OR COALESCE(cs.guest_email, '') ILIKE '%' || btrim(p_search) || '%'
        OR EXISTS (
          SELECT 1
          FROM public.checkout_session_rooms csr_s
          JOIN public.rooms r_s ON r_s.id = csr_s.room_id
          WHERE csr_s.session_id = cs.id
            AND (
              COALESCE(r_s.room_number, '') ILIKE '%' || btrim(p_search) || '%'
              OR COALESCE(r_s.name, '') ILIKE '%' || btrim(p_search) || '%'
              OR COALESCE(r_s.category_code, '') ILIKE '%' || btrim(p_search) || '%'
              OR r_s.room_type::text ILIKE '%' || btrim(p_search) || '%'
            )
        )
      )
  ),
  matching AS (
    SELECT s.id
    FROM scoped s
    WHERE
      (
        public.is_branch_admin_or_manager()
        AND (p_branch_id IS NULL OR s.resolved_branch_id = p_branch_id)
      )
      OR (
        NOT public.is_branch_admin_or_manager()
        AND s.resolved_branch_id = public.current_profile_branch_id()
      )
  ),
  total_cte AS (
    SELECT count(*)::bigint AS n
    FROM matching
  ),
  page_ids AS (
    SELECT cs.id, cs.created_at
    FROM public.checkout_sessions cs
    INNER JOIN matching m ON m.id = cs.id
    ORDER BY cs.created_at DESC, cs.id DESC
    OFFSET GREATEST(0, (GREATEST(COALESCE(p_page, 1), 1) - 1) * GREATEST(COALESCE(p_limit, 10), 1))
    LIMIT GREATEST(COALESCE(p_limit, 10), 1)
  )
  SELECT
    cs.id,
    cs.payment_code,
    cs.customer_id,
    cs.branch_code,
    s.resolved_branch_id AS branch_id,
    cs.check_in,
    cs.check_out,
    cs.number_of_nights,
    cs.total_guests,
    cs.notes,
    cs.total_amount,
    cs.final_amount,
    cs.payment_method,
    cs.status,
    cs.expires_at,
    cs.booking_id,
    cs.failure_reason,
    COALESCE(NULLIF(btrim(cs.guest_name), ''), c.full_name) AS guest_name,
    COALESCE(NULLIF(btrim(cs.guest_email), ''), c.email) AS guest_email,
    COALESCE(NULLIF(btrim(cs.guest_phone), ''), c.phone) AS guest_phone,
    cs.created_at,
    cs.updated_at,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', r.id,
            'name', r.name,
            'room_number', r.room_number,
            'room_type', r.room_type,
            'category_code', r.category_code,
            'check_in', csr.check_in,
            'check_out', csr.check_out,
            'number_of_nights', csr.number_of_nights,
            'amount', csr.amount
          )
          ORDER BY csr.created_at, r.name
        )
        FROM public.checkout_session_rooms csr
        JOIN public.rooms r ON r.id = csr.room_id
        WHERE csr.session_id = cs.id
      ),
      '[]'::jsonb
    ) AS rooms,
    pl.status AS payment_log_status,
    pl.id AS payment_log_id,
    (SELECT n FROM total_cte) AS total_count
  FROM page_ids pg
  JOIN public.checkout_sessions cs ON cs.id = pg.id
  JOIN scoped s ON s.id = cs.id
  LEFT JOIN public.customers c ON c.id = cs.customer_id AND c.deleted_at IS NULL
  LEFT JOIN LATERAL (
    SELECT lp.id, lp.status
    FROM public.payment_logs lp
    WHERE lp.booking_code IS NOT NULL
      AND upper(lp.booking_code) = upper(cs.payment_code)
    ORDER BY lp.processed_at DESC NULLS LAST, lp.created_at DESC
    LIMIT 1
  ) pl ON true
  ORDER BY pg.created_at DESC, pg.id DESC;
$$;

GRANT EXECUTE ON FUNCTION public.list_checkout_sessions(text, integer, integer, text, uuid, uuid)
  TO authenticated, service_role;
