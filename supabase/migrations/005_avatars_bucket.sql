-- 005_avatars_bucket.sql
-- Avatar Storage bucket + RLS policies
-- Run in Supabase SQL Editor after previous migrations

-- 1) Create public avatars bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 2) Anyone can read (public bucket)
CREATE POLICY "avatars_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- 3) Authenticated users can upload to their tenant folder
CREATE POLICY "avatars_tenant_upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (
      SELECT tenant_id::text FROM public.profiles
      WHERE user_id = auth.uid()
    )
  );

-- 4) Authenticated users can update (upsert) in their tenant folder
CREATE POLICY "avatars_tenant_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (
      SELECT tenant_id::text FROM public.profiles
      WHERE user_id = auth.uid()
    )
  );

-- 5) Authenticated users can delete in their tenant folder
CREATE POLICY "avatars_tenant_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (
      SELECT tenant_id::text FROM public.profiles
      WHERE user_id = auth.uid()
    )
  );
