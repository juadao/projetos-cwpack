/*
# CwPack Packaging Validation Project Management System

Creates the complete database schema for managing packaging validation test projects
at CwPack. The system tracks the full lifecycle: client registration -> logistics
checklist -> test execution (D+3, D+5, D+7, D+10 evaluations) -> results -> commercial closing.

## 1. New Tables

### `projects`
The central table for each validation project. Stores client data, infrastructure
checklist, commercial terms, qualification strategy, approvals, and scheduling.
- `id` (uuid, PK)
- `code` (text, unique, auto-generated CWP-YYYY/MM-NNN)
- `cnpj` (text, client CNPJ)
- `client_name` (text, razão social)
- `city` (text)
- `state` (text, UF)
- `address` (text, full address)
- `segment` (text, Supermercado/Açougue/FLV/Padaria/etc.)
- `interests` (text[], multi-select of FLV/Açougue/Pudim/etc.)
- `initial_project` (text, selected from interests)
- `guardian_name` (text, guardião no cliente)
- `guardian_role` (text, cargo do guardião)
- `guardian_phone` (text, WhatsApp)
- `has_sealer` (text, Sim/Não/Não Sabe)
- `has_cold_room` (text)
- `has_refrigeration` (text)
- `has_220v_biphasic` (text)
- `has_220v_three_phase` (text)
- `has_counter` (text, bancada/espaço preparação)
- `has_sanitary` (text, condições sanitárias)
- `sales_chance` (text, Alto/Médio/Baixo)
- `ticket_size` (text, >R$10k / R$5k-R$10k / <R$5k)
- `monthly_potential` (numeric, potencial consumo mensal R$)
- `is_existing_client` (boolean)
- `pain_summary` (text, resumo das dores)
- `knowledge_level` (text, Nenhum/Básico/Intermediário/Avançado)
- `what_to_present` (text)
- `what_client_has` (text)
- `justification` (text)
- `recommended_mix` (text, mix de embalagens)
- `chef_id` (uuid, chef responsável)
- `approval_status` (text, Sim/Não/Pendente)
- `alignment_meeting_at` (timestamptz, reunião de alinhamento)
- `alignment_meeting_link` (text, link da reunião)
- `project_presented` (boolean)
- `project_doc_name` (text, nome do documento/proposta)
- `methodology_presented` (boolean)
- `client_aware_obligations` (boolean)
- `start_date` (date, data prevista início)
- `status` (text, Em Andamento/Concluído/Pausado/Aprovado/Reprovado/Em Negociação/Encerrado)
- `rep_at_final` (boolean, representante presente na validação final)
- `results_meeting_at` (timestamptz, reunião de apresentação de resultados)
- `final_status` (text, status final do negócio)
- `monthly_volume_closed` (numeric, volume mensal fechado R$/mês)
- `monthly_qty_closed` (integer, qtd embalagens/mês)
- `result_observations` (text, observações/motivo do resultado)
- `operational_cost` (numeric, custo operacional)
- `drive_link` (text, link do drive do projeto)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### `project_responsibles`
People responsible at the client (Section B dynamic table).
- `id` (uuid, PK)
- `project_id` (uuid, FK -> projects)
- `name` (text)
- `role` (text, cargo/função)
- `phone` (text, WhatsApp/telefone)
- `created_at` (timestamptz)

### `test_staff`
Other employees involved in the test (Section 3.1 staff table).
- `id` (uuid, PK)
- `project_id` (uuid, FK -> projects)
- `name` (text)
- `role` (text, cargo/função)
- `phone` (text, celular/WhatsApp)
- `test_category` (text, FLV/Açougue/etc.)
- `technical_responsible` (text, Chef Manu/Chef Jonathan/Julia/etc.)
- `drive_link` (text, link do drive com mídias)
- `created_at` (timestamptz)

### `test_products`
Products being tested in a project (Section 3.2 test table).
- `id` (uuid, PK)
- `project_id` (uuid, FK -> projects)
- `did_test` (boolean, fez? sim/não)
- `product_name` (text, produto em teste)
- `category` (text, FLV/Fruta/Legume/Suco/Mix)
- `seal` (text, tipo de selo/tecnologia)
- `units` (integer, quantidade de unidades)
- `d3` (text, Bom/Parcial/Ruim/Não Se Aplica)
- `d5` (text)
- `d7` (text)
- `d10` (text)
- `final_result` (text, Aprovado/Reprovado/Inválido/Parcial)
- `observation` (text)
- `photo_url` (text, URL da foto/evidência)
- `created_at` (timestamptz)

### `logistics_items`
Items/materials needed for a project (Section 4 checklist).
- `id` (uuid, PK)
- `project_id` (uuid, FK -> projects)
- `item_name` (text, item/material/ação)
- `action` (text, ação logística)
- `responsible` (text, responsável)
- `due_date` (date, data limite)
- `status` (text, Ok/Em Andamento/Atrasado/Não Se Aplica)
- `evidence_url` (text, fotos/evidências/link)
- `observation` (text)
- `created_at` (timestamptz)

## 2. Security
- Enable RLS on all tables.
- This is a single-tenant internal tool (no sign-in screen required for MVP),
  so policies allow anon + authenticated CRUD on all tables.
- All policies use `USING (true)` / `WITH CHECK (true)` because the data is
  intentionally shared across the internal team.

## 3. Important Notes
1. The `code` column on `projects` has a unique constraint and is generated
   by the application as `CWP-YYYY/MM-NNN`.
2. All child tables cascade-delete when a project is deleted.
3. `updated_at` on projects is maintained by the application.
*/

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE,
  cnpj text,
  client_name text,
  city text,
  state text,
  address text,
  segment text,
  interests text[],
  initial_project text,
  guardian_name text,
  guardian_role text,
  guardian_phone text,
  has_sealer text DEFAULT 'Não Sabe',
  has_cold_room text DEFAULT 'Não Sabe',
  has_refrigeration text DEFAULT 'Não Sabe',
  has_220v_biphasic text DEFAULT 'Não Sabe',
  has_220v_three_phase text DEFAULT 'Não Sabe',
  has_counter text DEFAULT 'Não Sabe',
  has_sanitary text DEFAULT 'Não Sabe',
  sales_chance text,
  ticket_size text,
  monthly_potential numeric DEFAULT 0,
  is_existing_client boolean DEFAULT false,
  pain_summary text,
  knowledge_level text,
  what_to_present text,
  what_client_has text,
  justification text,
  recommended_mix text,
  chef_id uuid,
  approval_status text DEFAULT 'Pendente',
  alignment_meeting_at timestamptz,
  alignment_meeting_link text,
  project_presented boolean DEFAULT false,
  project_doc_name text,
  methodology_presented boolean DEFAULT false,
  client_aware_obligations boolean DEFAULT false,
  start_date date,
  status text DEFAULT 'Em Andamento',
  rep_at_final boolean DEFAULT false,
  results_meeting_at timestamptz,
  final_status text DEFAULT 'Em Andamento',
  monthly_volume_closed numeric DEFAULT 0,
  monthly_qty_closed integer DEFAULT 0,
  result_observations text,
  operational_cost numeric DEFAULT 0,
  drive_link text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_projects" ON projects;
CREATE POLICY "anon_select_projects" ON projects FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_projects" ON projects;
CREATE POLICY "anon_insert_projects" ON projects FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_projects" ON projects;
CREATE POLICY "anon_update_projects" ON projects FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_projects" ON projects;
CREATE POLICY "anon_delete_projects" ON projects FOR DELETE
  TO anon, authenticated USING (true);

-- Project responsibles table
CREATE TABLE IF NOT EXISTS project_responsibles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name text,
  role text,
  phone text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE project_responsibles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_responsibles" ON project_responsibles;
CREATE POLICY "anon_select_responsibles" ON project_responsibles FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_responsibles" ON project_responsibles;
CREATE POLICY "anon_insert_responsibles" ON project_responsibles FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_responsibles" ON project_responsibles;
CREATE POLICY "anon_update_responsibles" ON project_responsibles FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_responsibles" ON project_responsibles;
CREATE POLICY "anon_delete_responsibles" ON project_responsibles FOR DELETE
  TO anon, authenticated USING (true);

-- Test staff table
CREATE TABLE IF NOT EXISTS test_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name text,
  role text,
  phone text,
  test_category text,
  technical_responsible text,
  drive_link text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE test_staff ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_test_staff" ON test_staff;
CREATE POLICY "anon_select_test_staff" ON test_staff FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_test_staff" ON test_staff;
CREATE POLICY "anon_insert_test_staff" ON test_staff FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_test_staff" ON test_staff;
CREATE POLICY "anon_update_test_staff" ON test_staff FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_test_staff" ON test_staff;
CREATE POLICY "anon_delete_test_staff" ON test_staff FOR DELETE
  TO anon, authenticated USING (true);

-- Test products table
CREATE TABLE IF NOT EXISTS test_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  did_test boolean DEFAULT false,
  product_name text,
  category text,
  seal text DEFAULT 'ATC',
  units integer DEFAULT 1,
  d3 text,
  d5 text,
  d7 text,
  d10 text,
  final_result text,
  observation text,
  photo_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE test_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_test_products" ON test_products;
CREATE POLICY "anon_select_test_products" ON test_products FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_test_products" ON test_products;
CREATE POLICY "anon_insert_test_products" ON test_products FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_test_products" ON test_products;
CREATE POLICY "anon_update_test_products" ON test_products FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_test_products" ON test_products;
CREATE POLICY "anon_delete_test_products" ON test_products FOR DELETE
  TO anon, authenticated USING (true);

-- Logistics items table
CREATE TABLE IF NOT EXISTS logistics_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  item_name text,
  action text,
  responsible text,
  due_date date,
  status text DEFAULT 'Atrasado / Pendente',
  evidence_url text,
  observation text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE logistics_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_logistics" ON logistics_items;
CREATE POLICY "anon_select_logistics" ON logistics_items FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_logistics" ON logistics_items;
CREATE POLICY "anon_insert_logistics" ON logistics_items FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_logistics" ON logistics_items;
CREATE POLICY "anon_update_logistics" ON logistics_items FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_logistics" ON logistics_items;
CREATE POLICY "anon_delete_logistics" ON logistics_items FOR DELETE
  TO anon, authenticated USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_segment ON projects(segment);
CREATE INDEX IF NOT EXISTS idx_responsibles_project_id ON project_responsibles(project_id);
CREATE INDEX IF NOT EXISTS idx_test_staff_project_id ON test_staff(project_id);
CREATE INDEX IF NOT EXISTS idx_test_products_project_id ON test_products(project_id);
CREATE INDEX IF NOT EXISTS idx_logistics_project_id ON logistics_items(project_id);
