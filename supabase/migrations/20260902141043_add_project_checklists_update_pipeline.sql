/*
# Add project_checklists table and update pipeline statuses

1. New table: project_checklists
   - id, project_id (FK), item_name, action, completed (boolean), created_at
   - RLS: scoped through parent project ownership (same as other child tables)

2. Update existing projects: migrate pipeline_status 'Teste Finalizado' -> 'Em Proposta Comercial'
   (We remove 'Teste Finalizado' from the workflow; 'Venda Fechada' is the new final stage)

3. Backfill default checklist items for all existing projects that have no checklist rows yet.
*/

-- Create project_checklists table
CREATE TABLE IF NOT EXISTS project_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  item_name text NOT NULL,
  action text,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE project_checklists ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_project_checklists_project_id ON project_checklists(project_id);

-- RLS policies for project_checklists (scoped through parent project ownership)
DROP POLICY IF EXISTS "select_own_checklists" ON project_checklists;
CREATE POLICY "select_own_checklists" ON project_checklists FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = project_checklists.project_id
    AND (projects.user_id = auth.uid() OR is_admin()))
  );

DROP POLICY IF EXISTS "insert_own_checklists" ON project_checklists;
CREATE POLICY "insert_own_checklists" ON project_checklists FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = project_checklists.project_id
    AND (projects.user_id = auth.uid() OR is_admin()))
  );

DROP POLICY IF EXISTS "update_own_checklists" ON project_checklists;
CREATE POLICY "update_own_checklists" ON project_checklists FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = project_checklists.project_id
    AND (projects.user_id = auth.uid() OR is_admin()))
  );

DROP POLICY IF EXISTS "delete_own_checklists" ON project_checklists;
CREATE POLICY "delete_own_checklists" ON project_checklists FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = project_checklists.project_id
    AND (projects.user_id = auth.uid() OR is_admin()))
  );

-- Migrate 'Teste Finalizado' projects to 'Em Proposta Comercial'
UPDATE projects SET pipeline_status = 'Em Proposta Comercial' WHERE pipeline_status = 'Teste Finalizado';

-- Backfill default checklist items for existing projects with no checklist rows
-- Default items matching the business requirement
DO $$
DECLARE
  p record;
  default_items text[][] := ARRAY[
    ['Embalagens', 'Separar e Pegar no CD'],
    ['Selos', 'Separar e Pegar no CD'],
    ['Seladora', 'Checar e Separar no CD'],
    ['Gabaritos', 'Checar e Separar no CD'],
    ['Cilindro de Gás', 'Checar e Separar no CD'],
    ['Materiais (Facas, Tábuas, etc)', 'Separar e Pegar no CD'],
    ['Carnes / Proteínas (Insumos do Teste)', 'Comprar em Fornecedor'],
    ['Frutas / FLV (Insumos do Teste)', 'Comprar em Hortifruti'],
    ['Material Didático - Apresentação Q5 e Q7', 'Enviar para Equipe'],
    ['Material Didático - Fluxo FLV', 'Enviar para Equipe'],
    ['Criação do Grupo p/ Acompanhamento', 'WhatsApp'],
    ['Reserva de Hotel', 'Reserva de Hotel']
  ];
  i int;
BEGIN
  FOR p IN SELECT id FROM projects WHERE id NOT IN (SELECT DISTINCT project_id FROM project_checklists) LOOP
    FOR i IN 1..array_length(default_items, 1) LOOP
      INSERT INTO project_checklists (project_id, item_name, action, completed)
      VALUES (p.id, default_items[i][1], default_items[i][2], false);
    END LOOP;
  END LOOP;
END $$;
