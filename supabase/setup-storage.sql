-- ── Run this in the Supabase SQL Editor ─────────────────────────────────────
-- Creates the three storage buckets and sets RLS policies for authenticated access

-- 1. Create buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('files',        'files',        true, 52428800, NULL),
  ('brand-assets', 'brand-assets', true, 52428800, NULL),
  ('expenses',     'expenses',     true, 10485760, ARRAY['application/pdf','image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

-- 2. Storage RLS policies — authenticated users can do everything
CREATE POLICY "Authenticated users can upload files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id IN ('files', 'brand-assets', 'expenses'));

CREATE POLICY "Authenticated users can read files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id IN ('files', 'brand-assets', 'expenses'));

CREATE POLICY "Authenticated users can update files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id IN ('files', 'brand-assets', 'expenses'));

CREATE POLICY "Authenticated users can delete files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id IN ('files', 'brand-assets', 'expenses'));

-- 3. Fix brands — rename Airview → AirShot Base
UPDATE public.brands
SET name = 'AirShot Base'
WHERE name = 'Airview';

-- 4. Update one-liners and live URLs to match the correct data
UPDATE public.brands SET
  live_url            = 'https://conciergestyled.netlify.app'
WHERE name = 'Concierge Styled';

UPDATE public.brands SET
  live_url            = 'https://intheabsence.co.za'
WHERE name = 'In the Absence of a Soapbox';
