-- ============================================================
-- StaatWright V3 Migration — Section 1.4 + 1.5 + 3.1 + 2.5
-- Run this in the Supabase SQL Editor
-- ============================================================

-- Section 1.4: Add missing schema columns

ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS reminder_templates jsonb DEFAULT '{}';

ALTER TABLE public.documents
  DROP CONSTRAINT IF EXISTS documents_status_check;

ALTER TABLE public.documents
  ADD CONSTRAINT documents_status_check
  CHECK (status IN ('draft','sent','paid','overdue','cancelled','partially_paid','accepted','declined','expired','issued'));

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'ZAR',
  ADD COLUMN IF NOT EXISTS exchange_rate numeric,
  ADD COLUMN IF NOT EXISTS zar_equivalent numeric,
  ADD COLUMN IF NOT EXISTS vat_rate numeric,
  ADD COLUMN IF NOT EXISTS payment_terms text,
  ADD COLUMN IF NOT EXISTS linked_document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL;

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS partner_id uuid REFERENCES public.partners(id) ON DELETE SET NULL;

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS partner_id uuid REFERENCES public.partners(id) ON DELETE SET NULL;

UPDATE public.documents SET partner_id = client_id WHERE partner_id IS NULL AND client_id IS NOT NULL;
UPDATE public.expenses SET partner_id = client_id WHERE partner_id IS NULL AND client_id IS NOT NULL;

-- Section 1.5: Convert notes to append-only JSONB log

ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS notes_log jsonb DEFAULT '[]';

UPDATE public.partners
SET notes_log = jsonb_build_array(
  jsonb_build_object(
    'text', notes,
    'created_at', created_at::text,
    'initials', 'SW'
  )
)
WHERE notes IS NOT NULL AND notes != '' AND (notes_log IS NULL OR notes_log = '[]'::jsonb);

-- Section 2.5: Add spec column to partners

ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS spec jsonb DEFAULT '{}';

-- Section 3.1 + 3.3: Brand table extensions

ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS hero_image_path text,
  ADD COLUMN IF NOT EXISTS card_bg_color text,
  ADD COLUMN IF NOT EXISTS heading_font text,
  ADD COLUMN IF NOT EXISTS body_font text,
  ADD COLUMN IF NOT EXISTS public_slug text UNIQUE,
  ADD COLUMN IF NOT EXISTS public_extended_description text,
  ADD COLUMN IF NOT EXISTS public_show_case_study boolean DEFAULT false;
