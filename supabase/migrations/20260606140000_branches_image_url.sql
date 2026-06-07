-- Add cover image URL for branches (public branch picker + dashboard management)

ALTER TABLE public.branches
  ADD COLUMN IF NOT EXISTS image_url text;

COMMENT ON COLUMN public.branches.image_url IS 'Public cover image URL for branch picker on booking site';
