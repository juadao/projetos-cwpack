/*
# Store technical chef names safely

1. Changes
- Add `chef_name` to `projects` as text for the selected chef's display name.
- Keep the existing `chef_id` UUID column unchanged for future links to a real chef directory.

2. Compatibility
- Existing projects remain unchanged.
- New and edited projects store the selected chef name in `chef_name` instead of sending text to the UUID field.

3. Security
- The existing RLS policies on `projects` continue to protect this column using the same shared internal-tool rules.

4. Important Notes
- No existing columns are removed, renamed, or type-changed.
- The migration is idempotent and safe to apply again.
*/

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS chef_name text;
