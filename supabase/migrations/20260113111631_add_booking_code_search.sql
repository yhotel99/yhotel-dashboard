create or replace function public.search_bookings_json(
  p_search text default null,
  p_page integer default 1,
  p_limit integer default 10,
  p_customer_id uuid default null
)
returns setof jsonb
language sql
stable
as $$
  select 
    to_jsonb(b) ||
    jsonb_build_object(
      'customers', jsonb_build_object(
        'full_name', c.full_name,
        'phone', c.phone
      ),
      'rooms', jsonb_build_object(
        'name', r.name
      )
    ) as data
  from bookings b
  left join customers c on c.id = b.customer_id and c.deleted_at is null
  left join rooms r on r.id = b.room_id and r.deleted_at is null
  where b.deleted_at is null
    and (p_customer_id is null or b.customer_id = p_customer_id)
    and (
      p_search is null
      or trim(p_search) = ''
      or b.booking_code ilike '%' || trim(p_search) || '%' -- ✅ THÊM DÒNG NÀY
      or c.full_name ilike '%' || trim(p_search) || '%'
      or r.name ilike '%' || trim(p_search) || '%'
      or b.notes ilike '%' || trim(p_search) || '%'
    )
  order by b.created_at desc
  offset (p_page - 1) * p_limit
  limit p_limit;
$$;


create or replace function public.count_bookings_json(
  p_search text default null,
  p_customer_id uuid default null
)
returns bigint
language sql
stable
as $$
  select count(*)
  from bookings b
  left join customers c on c.id = b.customer_id and c.deleted_at is null
  left join rooms r on r.id = b.room_id and r.deleted_at is null
  where b.deleted_at is null
    and (p_customer_id is null or b.customer_id = p_customer_id)
    and (
      p_search is null
      or trim(p_search) = ''
      or b.booking_code ilike '%' || trim(p_search) || '%' -- ✅ THÊM
      or c.full_name ilike '%' || trim(p_search) || '%'
      or r.name ilike '%' || trim(p_search) || '%'
      or b.notes ilike '%' || trim(p_search) || '%'
    );
$$;
