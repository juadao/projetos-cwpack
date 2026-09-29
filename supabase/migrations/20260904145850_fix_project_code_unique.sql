/*
# Fix project code generation to avoid duplicate key violations

## Problem
The app generated project codes using `CWP-YYYY/MM-NNN` where NNN was
`count(projects) + 1`. If any project was deleted, the count shrank
and the next generated code collided with an existing one, triggering
`duplicate key value violates unique constraint "projects_code_key"`.

## Solution
1. Create a dedicated sequence `project_code_seq` that only increments
   (never decrements on delete), guaranteeing unique sequential numbers.
2. Add a SECURITY DEFINER function `generate_project_code()` that reads
   the current year/month + nextval from the sequence, producing a code
   like `CWP-2026/09-001`.
3. Set this function as the DEFAULT on `projects.code` so the database
   generates the code atomically on insert — no race conditions, no
   duplicates, no reliance on client-side counting.

## Security
- The function is SECURITY DEFINER, owned by postgres, and only called
  as a column DEFAULT. It does not expose any data.
- No RLS changes needed.
*/

CREATE SEQUENCE IF NOT EXISTS project_code_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_project_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  seq_val bigint;
  code text;
BEGIN
  seq_val := nextval('project_code_seq');
  code := 'CWP-' || to_char(now(), 'YYYY/MM') || '-' || lpad(seq_val::text, 3, '0');
  RETURN code;
END;
$$;

ALTER TABLE public.projects
  ALTER COLUMN code SET DEFAULT public.generate_project_code();
