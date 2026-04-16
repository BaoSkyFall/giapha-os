-- ==========================================
-- ADDITIONAL DATA REQUESTS MODERATION FLOW
-- Run this in Supabase SQL Editor
-- ==========================================

DO $$
BEGIN
  CREATE TYPE public.additional_data_request_status_enum AS ENUM (
    'pending',
    'approved',
    'rejected'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.additional_data_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  person_id UUID REFERENCES public.persons(id) ON DELETE CASCADE NOT NULL,
  submitted_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status public.additional_data_request_status_enum NOT NULL DEFAULT 'pending',
  request_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  before_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  decision_note TEXT,
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.additional_data_requests
  ADD COLUMN IF NOT EXISTS person_id UUID REFERENCES public.persons(id) ON DELETE CASCADE;
ALTER TABLE public.additional_data_requests
  ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.additional_data_requests
  ADD COLUMN IF NOT EXISTS status public.additional_data_request_status_enum DEFAULT 'pending';
ALTER TABLE public.additional_data_requests
  ADD COLUMN IF NOT EXISTS request_payload JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.additional_data_requests
  ADD COLUMN IF NOT EXISTS before_snapshot JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.additional_data_requests
  ADD COLUMN IF NOT EXISTS decision_note TEXT;
ALTER TABLE public.additional_data_requests
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.additional_data_requests
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE public.additional_data_requests
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.additional_data_requests
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_additional_data_requests_status
  ON public.additional_data_requests(status);
CREATE INDEX IF NOT EXISTS idx_additional_data_requests_person_id
  ON public.additional_data_requests(person_id);
CREATE INDEX IF NOT EXISTS idx_additional_data_requests_submitted_by
  ON public.additional_data_requests(submitted_by);
CREATE INDEX IF NOT EXISTS idx_additional_data_requests_created_at
  ON public.additional_data_requests(created_at DESC);

ALTER TABLE public.additional_data_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can submit additional data requests"
  ON public.additional_data_requests;
CREATE POLICY "Users can submit additional data requests"
  ON public.additional_data_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = submitted_by);

DROP POLICY IF EXISTS "Users can read own additional data requests"
  ON public.additional_data_requests;
CREATE POLICY "Users can read own additional data requests"
  ON public.additional_data_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = submitted_by);

DROP POLICY IF EXISTS "Admins can read all additional data requests"
  ON public.additional_data_requests;
CREATE POLICY "Admins can read all additional data requests"
  ON public.additional_data_requests
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update additional data requests"
  ON public.additional_data_requests;
CREATE POLICY "Admins can update additional data requests"
  ON public.additional_data_requests
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP TRIGGER IF EXISTS tr_additional_data_requests_updated_at
  ON public.additional_data_requests;
CREATE TRIGGER tr_additional_data_requests_updated_at
  BEFORE UPDATE ON public.additional_data_requests
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
