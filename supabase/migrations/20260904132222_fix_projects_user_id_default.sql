
-- Set default on user_id to auth.uid() so inserts from authenticated clients
-- automatically get the current user's ID even if not explicitly provided.
ALTER TABLE public.projects
  ALTER COLUMN user_id SET DEFAULT auth.uid();
