/*
# Fix username-based user creation and login

1. Profile creation
- Update `handle_new_user()` so newly created authentication users always receive a username.
- Prefer the username supplied in authentication metadata and fall back to the email prefix.
- Preserve the existing profile creation behavior and default role.

2. Username login lookup
- Add `lookup_auth_email(username)` as a narrowly scoped helper for the login screen.
- It returns only the internal authentication email for an exact username match.
- It is callable without a session because the login screen runs before authentication.

3. Security
- Both functions use a fixed `public` search path.
- The login helper exposes no profile, role, or personal details.
- Existing row-level security policies remain unchanged.
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requested_username text;
  fallback_username text;
BEGIN
  requested_username := lower(regexp_replace(
    COALESCE(NEW.raw_user_meta_data->>'username', ''),
    '\s+', '', 'g'
  ));
  fallback_username := lower(split_part(COALESCE(NEW.email, ''), '@', 1));

  INSERT INTO public.profiles (user_id, email, username, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NULLIF(requested_username, ''), NULLIF(fallback_username, ''), 'user_' || left(NEW.id::text, 8)),
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    'Representante'
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.lookup_auth_email(lookup_username text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email
  FROM public.profiles
  WHERE username = lower(trim(lookup_username))
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.lookup_auth_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_auth_email(text) TO anon, authenticated;
