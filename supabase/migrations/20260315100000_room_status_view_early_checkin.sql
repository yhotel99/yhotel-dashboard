-- ============================================================================
-- Migration: room_status_view — hỗ trợ check-in sớm (early check-in)
-- Description: Ưu tiên booking checked_in theo status, không phụ thuộc giờ
--              check_in dự kiến. Occupied dùng actual_check_out IS NULL (PMS).
-- ============================================================================

DROP VIEW IF EXISTS public.room_status_view;

CREATE VIEW public.room_status_view AS
WITH room_active_booking AS (
    SELECT
        r1.id AS r_id,
        b.id,
        b.customer_id,
        br.check_in,
        br.check_out,
        b.number_of_nights,
        b.total_guests,
        b.status,
        b.notes,
        b.total_amount,
        b.final_amount,
        b.advance_payment,
        b.actual_check_in,
        b.actual_check_out,
        b.created_at,
        b.updated_at,
        b.deleted_at,
        row_number() OVER (
            PARTITION BY r1.id
            ORDER BY
                CASE
                    -- Đang ở (kể cả check-in sớm): không yêu cầu now() >= check_in
                    WHEN b.status = 'checked_in'
                        AND now() < (br.check_out - interval '2 hours')
                    THEN 0
                    WHEN b.status = 'checked_in'
                        AND now() >= (br.check_out - interval '2 hours')
                        AND now() < br.check_out
                    THEN 1
                    WHEN b.status = 'checked_in'
                        AND now() >= br.check_out
                    THEN 2
                    WHEN b.status IN ('confirmed','awaiting_payment','pending')
                        AND now() >= (br.check_in - interval '2 hours')
                        AND now() < br.check_in
                    THEN 3
                    ELSE 99
                END,
                br.check_in
        ) AS rn
    FROM public.rooms r1
    LEFT JOIN public.booking_rooms br
        ON br.room_id = r1.id
    LEFT JOIN public.bookings b
        ON b.id = br.booking_id
        AND b.deleted_at IS NULL
        AND b.status IN ('pending','awaiting_payment','confirmed','checked_in')
        AND (
            br.check_out > now()
            OR b.status = 'checked_in'
            OR br.check_in <= now() + interval '2 hours'
        )
)
SELECT
    r.id,
    r.name,
    r.description,
    r.room_type,
    r.category_code,
    r.price_per_night,
    r.max_guests,
    r.amenities,
    r.status,
    r.room_number,
    r.floor_number,
    r.deleted_at,
    r.created_at,
    r.updated_at,
    r.status AS technical_status,
    rab.check_in,
    rab.check_out,
    rab.status AS booking_status,
    rab.id AS booking_id,
    CASE
        WHEN rab.id IS NULL
        THEN 'vacant'
        -- Occupied: đã check-in và chưa check-out thực tế (kể cả check-in sớm)
        WHEN rab.status = 'checked_in'
            AND rab.actual_check_out IS NULL
            AND now() < (rab.check_out - interval '2 hours')
        THEN 'occupied'
        WHEN rab.status = 'checked_in'
            AND rab.actual_check_out IS NULL
            AND now() >= (rab.check_out - interval '2 hours')
            AND now() < rab.check_out
        THEN 'upcoming_checkout'
        WHEN rab.status = 'checked_in'
            AND rab.actual_check_out IS NULL
            AND now() >= rab.check_out
        THEN 'overdue_checkout'
        WHEN rab.status IN ('pending','awaiting_payment','confirmed')
            AND now() >= (rab.check_in - interval '2 hours')
            AND now() < rab.check_in
        THEN 'upcoming_checkin'
        ELSE 'vacant'
    END AS current_status
FROM public.rooms r
LEFT JOIN room_active_booking rab
    ON r.id = rab.r_id
    AND rab.rn = 1
WHERE r.deleted_at IS NULL
ORDER BY
    COALESCE(r.floor_number, 0) ASC,
    r.room_number ASC NULLS LAST,
    r.name ASC;

COMMENT ON VIEW public.room_status_view IS
    'View trạng thái phòng. Hỗ trợ check-in sớm: ưu tiên theo status, occupied khi actual_check_out IS NULL.';
