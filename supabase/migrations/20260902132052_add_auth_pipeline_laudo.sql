/*
# Add authentication, pipeline status, and validation report (laudo) support

1. Changes to `projects`
- Add `user_id uuid` — links each project to its creator (Representante).
- Add `pipeline_status text DEFAULT 'Solicitação Recebida'` — Kanban column.
- Add `technical_report text` — chef's strategic report for the Laudo.
- Add `visual_evidence_urls text[]` — photo URLs (before/after).
- Add `sensory_checklist jsonb` — chef sensory checklist data.
- Add `shelf_life_days integer` — shelf-life days highlighted in the Laudo.
- Add `profitability_pct numeric` — profitability percentage.
- Add index on `user_id`.

2. New Table `profiles`
- `id`, `user_id` (unique, FK auth.users), `email`, `name`, `role` (Representante/Admin), `created_at`.

3. Security — RLS updates
- `profiles`: users read own + admin reads all; users insert/update own.
- `projects`: authenticated-only, owner-scoped. Admin sees all via is_admin().
- Child tables: scope through parent project ownership.

4. Helper function `is_admin()` and trigger `handle_new_user()`.
*/

-- Create profiles table FIRST (before is_admin references it)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  name text,
  role text NOT NULL DEFAULT 'Representante',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Helper: is_admin (now profiles exists)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'Admin'
  );
$$;

-- Add columns to projects
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS pipeline_status text DEFAULT 'Solicitação Recebida',
  ADD COLUMN IF NOT EXISTS technical_report text,
  ADD COLUMN IF NOT EXISTS visual_evidence_urls text[],
  ADD COLUMN IF NOT EXISTS sensory_checklist jsonb,
  ADD COLUMN IF NOT EXISTS shelf_life_days integer,
  ADD COLUMN IF NOT EXISTS profitability_pct numeric;

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_pipeline ON projects(pipeline_status);

-- Profiles policies
DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR is_admin());

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ===== Projects RLS =====
DROP POLICY IF EXISTS "anon_select_projects" ON projects;
DROP POLICY IF EXISTS "anon_insert_projects" ON projects;
DROP POLICY IF EXISTS "anon_update_projects" ON projects;
DROP POLICY IF EXISTS "anon_delete_projects" ON projects;

DROP POLICY IF EXISTS "select_own_projects" ON projects;
CREATE POLICY "select_own_projects" ON projects FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR is_admin());

DROP POLICY IF EXISTS "insert_own_projects" ON projects;
CREATE POLICY "insert_own_projects" ON projects FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id OR is_admin());

DROP POLICY IF EXISTS "update_own_projects" ON projects;
CREATE POLICY "update_own_projects" ON projects FOR UPDATE
  TO authenticated USING (auth.uid() = user_id OR is_admin()) WITH CHECK (auth.uid() = user_id OR is_admin());

DROP POLICY IF EXISTS "delete_own_projects" ON projects;
CREATE POLICY "delete_own_projects" ON projects FOR DELETE
  TO authenticated USING (auth.uid() = user_id OR is_admin());

-- ===== Child tables RLS =====

-- project_responsibles
DROP POLICY IF EXISTS "anon_select_responsibles" ON project_responsibles;
DROP POLICY IF EXISTS "anon_insert_responsibles" ON project_responsibles;
DROP POLICY IF EXISTS "anon_update_responsibles" ON project_responsibles;
DROP POLICY IF EXISTS "anon_delete_responsibles" ON project_responsibles;

DROP POLICY IF EXISTS "select_own_responsibles" ON project_responsibles;
CREATE POLICY "select_own_responsibles" ON project_responsibles FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = project_responsibles.project_id
    AND (projects.user_id = auth.uid() OR is_admin()))
  );
DROP POLICY IF EXISTS "insert_own_responsibles" ON project_responsibles;
CREATE POLICY "insert_own_responsibles" ON project_responsibles FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = project_responsibles.project_id
    AND (projects.user_id = auth.uid() OR is_admin()))
  );
DROP POLICY IF EXISTS "update_own_responsibles" ON project_responsibles;
CREATE POLICY "update_own_responsibles" ON project_responsibles FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = project_responsibles.project_id
    AND (projects.user_id = auth.uid() OR is_admin()))
  );
DROP POLICY IF EXISTS "delete_own_responsibles" ON project_responsibles;
CREATE POLICY "delete_own_responsibles" ON project_responsibles FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = project_responsibles.project_id
    AND (projects.user_id = auth.uid() OR is_admin()))
  );

-- test_staff
DROP POLICY IF EXISTS "anon_select_test_staff" ON test_staff;
DROP POLICY IF EXISTS "anon_insert_test_staff" ON test_staff;
DROP POLICY IF EXISTS "anon_update_test_staff" ON test_staff;
DROP POLICY IF EXISTS "anon_delete_test_staff" ON test_staff;

DROP POLICY IF EXISTS "select_own_test_staff" ON test_staff;
CREATE POLICY "select_own_test_staff" ON test_staff FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = test_staff.project_id
    AND (projects.user_id = auth.uid() OR is_admin()))
  );
DROP POLICY IF EXISTS "insert_own_test_staff" ON test_staff;
CREATE POLICY "insert_own_test_staff" ON test_staff FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = test_staff.project_id
    AND (projects.user_id = auth.uid() OR is_admin()))
  );
DROP POLICY IF EXISTS "update_own_test_staff" ON test_staff;
CREATE POLICY "update_own_test_staff" ON test_staff FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = test_staff.project_id
    AND (projects.user_id = auth.uid() OR is_admin()))
  );
DROP POLICY IF EXISTS "delete_own_test_staff" ON test_staff;
CREATE POLICY "delete_own_test_staff" ON test_staff FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = test_staff.project_id
    AND (projects.user_id = auth.uid() OR is_admin()))
  );

-- test_products
DROP POLICY IF EXISTS "anon_select_test_products" ON test_products;
DROP POLICY IF EXISTS "anon_insert_test_products" ON test_products;
DROP POLICY IF EXISTS "anon_update_test_products" ON test_products;
DROP POLICY IF EXISTS "anon_delete_test_products" ON test_products;

DROP POLICY IF EXISTS "select_own_test_products" ON test_products;
CREATE POLICY "select_own_test_products" ON test_products FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = test_products.project_id
    AND (projects.user_id = auth.uid() OR is_admin()))
  );
DROP POLICY IF EXISTS "insert_own_test_products" ON test_products;
CREATE POLICY "insert_own_test_products" ON test_products FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = test_products.project_id
    AND (projects.user_id = auth.uid() OR is_admin()))
  );
DROP POLICY IF EXISTS "update_own_test_products" ON test_products;
CREATE POLICY "update_own_test_products" ON test_products FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = test_products.project_id
    AND (projects.user_id = auth.uid() OR is_admin()))
  );
DROP POLICY IF EXISTS "delete_own_test_products" ON test_products;
CREATE POLICY "delete_own_test_products" ON test_products FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = test_products.project_id
    AND (projects.user_id = auth.uid() OR is_admin()))
  );

-- logistics_items
DROP POLICY IF EXISTS "anon_select_logistics" ON logistics_items;
DROP POLICY IF EXISTS "anon_insert_logistics" ON logistics_items;
DROP POLICY IF EXISTS "anon_update_logistics" ON logistics_items;
DROP POLICY IF EXISTS "anon_delete_logistics" ON logistics_items;

DROP POLICY IF EXISTS "select_own_logistics" ON logistics_items;
CREATE POLICY "select_own_logistics" ON logistics_items FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = logistics_items.project_id
    AND (projects.user_id = auth.uid() OR is_admin()))
  );
DROP POLICY IF EXISTS "insert_own_logistics" ON logistics_items;
CREATE POLICY "insert_own_logistics" ON logistics_items FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = logistics_items.project_id
    AND (projects.user_id = auth.uid() OR is_admin()))
  );
DROP POLICY IF EXISTS "update_own_logistics" ON logistics_items;
CREATE POLICY "update_own_logistics" ON logistics_items FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = logistics_items.project_id
    AND (projects.user_id = auth.uid() OR is_admin()))
  );
DROP POLICY IF EXISTS "delete_own_logistics" ON logistics_items;
CREATE POLICY "delete_own_logistics" ON logistics_items FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = logistics_items.project_id
    AND (projects.user_id = auth.uid() OR is_admin()))
  );

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email))
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
