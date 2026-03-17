-- Add weekday-based pricing configuration (does NOT change room base prices)
ALTER TABLE public.settings
ADD COLUMN IF NOT EXISTS pricing_weekday_rates JSONB
  DEFAULT '[0,0,0,0,0,15,20]'::jsonb;

