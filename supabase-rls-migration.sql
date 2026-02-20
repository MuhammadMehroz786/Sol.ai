-- ============================================================
-- Migration: Add user_id to voice_profiles + signals_ranked,
--            RLS policies, avatar storage bucket
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Add user_id to voice_profiles (if not already present)
ALTER TABLE public.voice_profiles
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Add user_id to signals_ranked (needed to scope signals per user)
ALTER TABLE public.signals_ranked
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Enable RLS on signals_ranked
ALTER TABLE public.signals_ranked ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own signals" ON public.signals_ranked;
DROP POLICY IF EXISTS "Users can insert own signals" ON public.signals_ranked;
DROP POLICY IF EXISTS "Users can delete own signals" ON public.signals_ranked;

CREATE POLICY "Users can view own signals"
  ON public.signals_ranked FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own signals"
  ON public.signals_ranked FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own signals"
  ON public.signals_ranked FOR DELETE
  USING (auth.uid() = user_id);

-- 3. Create avatars storage bucket (run only once)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: users can manage their own avatar
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Avatars are publicly readable" ON storage.objects;

CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Avatars are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- 4. Add unique constraint on profiles.user_id (needed for upsert)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_user_id_key' AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- ============================================================
-- RLS for: profiles
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own profile"
  ON public.profiles FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- RLS for: voice_profiles
-- ============================================================
ALTER TABLE public.voice_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own voice profiles" ON public.voice_profiles;
DROP POLICY IF EXISTS "Users can insert own voice profiles" ON public.voice_profiles;
DROP POLICY IF EXISTS "Users can update own voice profiles" ON public.voice_profiles;
DROP POLICY IF EXISTS "Users can delete own voice profiles" ON public.voice_profiles;

CREATE POLICY "Users can view own voice profiles"
  ON public.voice_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own voice profiles"
  ON public.voice_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own voice profiles"
  ON public.voice_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own voice profiles"
  ON public.voice_profiles FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- Function: delete_current_user()
-- Deletes the calling user from auth.users so the email can
-- be re-registered cleanly. SECURITY DEFINER runs as the
-- function owner (postgres) which has access to auth schema.
-- ============================================================
CREATE OR REPLACE FUNCTION public.delete_current_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;

-- Allow any authenticated user to call it
REVOKE ALL ON FUNCTION public.delete_current_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_current_user() TO authenticated;
