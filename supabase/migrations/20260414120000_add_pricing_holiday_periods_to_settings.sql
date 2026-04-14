-- Optional holiday/Tết surcharge windows (JSON array) for pricing on top of weekday rates
ALTER TABLE settings
ADD COLUMN IF NOT EXISTS pricing_holiday_periods JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN settings.pricing_holiday_periods IS
  'Array of {id,label,start_date,end_date,surcharge_percent}; each night uses max(weekday %, matching period %). Dates YYYY-MM-DD inclusive.';
