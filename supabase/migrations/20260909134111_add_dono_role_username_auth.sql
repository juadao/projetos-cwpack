/*
# Add "Dono" role and username-based auth

## Changes
1. Add `username` column to profiles (unique, NOT NULL after backfill)
2. Add `is_dono()` SECURITY DEFINER function
3. Update `is_admin()` to also return true for Dono (Dono has all Admin powers + more)
4. Update RLS policies on projects to allow Dono full access
5. Update RLS policies on profiles to allow Dono to manage all profiles
6. Add unique constraint on username
*/

-- Add username column
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text;

-- Backfill username from email for existing users
UPDATE public.profiles
SET username = split_part(email, '@', 1)
WHERE username IS NULL AND email IS NOT NULL;

-- For any remaining NULL usernames, set a default
UPDATE public.profiles
SET username = 'user_' || left(user_id::text, 8)
WHERE username IS NULL;

-- Now make it NOT NULL
ALTER TABLE public.profiles ALTER COLUMN username SET NOT NULL;

-- Add unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique ON public.profiles (username);

-- Update is_admin to return true for both Admin AND Dono
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role IN ('Admin', 'Dono')
  );
$$;

-- Add is_dono function
CREATE OR REPLACE FUNCTION public.is_dono()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'Dono'
  );
$$;

-- Update profiles policies: Dono can also manage all profiles
DROP POLICY IF EXISTS "select_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "insert_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "update_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "admin_update_profiles" ON public.profiles;
DROP POLICY IF EXISTS "admin_delete_profiles" ON public.profiles;

CREATE POLICY "select_own_profile" ON public.profiles FOR SELECT
  TO authenticated USING ((auth.uid() = user_id) OR is_admin());
CREATE POLICY "insert_own_profile" ON public.profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_profile" ON public.profiles FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admin_update_profiles" ON public.profiles FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "admin_delete_profiles" ON public.profiles FOR DELETE
  TO authenticated USING (is_admin());

-- Projects: Dono already covered by is_admin() which now includes Dono
-- No changes needed for projects policies since they use is_admin()
