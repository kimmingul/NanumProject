-- 013_user_preferences.sql
-- Add user preferences JSONB column to profiles table
-- Run in Supabase SQL Editor

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}' NOT NULL;
COMMENT ON COLUMN profiles.preferences IS 'User preferences (theme, density, dateFormat, timezone, weekStart, defaultView, sidebarDefault)';
