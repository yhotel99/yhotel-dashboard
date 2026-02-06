-- Migration: Update social media links from individual columns to JSONB
-- This migration adds a flexible social_media_links JSONB column and migrates existing data

-- Step 1: Add the new social_media_links column
ALTER TABLE settings 
ADD COLUMN IF NOT EXISTS social_media_links JSONB DEFAULT '{}'::jsonb;

-- Step 2: Migrate existing data from individual columns to JSONB
-- Build JSONB object only with non-null values
UPDATE settings
SET social_media_links = (
  SELECT jsonb_object_agg(platform, url)
  FROM (
    SELECT 'Facebook' as platform, facebook_url as url WHERE facebook_url IS NOT NULL
    UNION ALL
    SELECT 'Instagram' as platform, instagram_url as url WHERE instagram_url IS NOT NULL
    UNION ALL
    SELECT 'Twitter' as platform, twitter_url as url WHERE twitter_url IS NOT NULL
    UNION ALL
    SELECT 'YouTube' as platform, youtube_url as url WHERE youtube_url IS NOT NULL
  ) AS social_links
  WHERE url IS NOT NULL
)
WHERE facebook_url IS NOT NULL 
   OR instagram_url IS NOT NULL 
   OR twitter_url IS NOT NULL 
   OR youtube_url IS NOT NULL;

-- Step 3: Drop the old individual columns
ALTER TABLE settings 
DROP COLUMN IF EXISTS facebook_url,
DROP COLUMN IF EXISTS instagram_url,
DROP COLUMN IF EXISTS twitter_url,
DROP COLUMN IF EXISTS youtube_url;

