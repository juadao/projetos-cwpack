/*
# Add admin profile management policies and update pipeline statuses

1. Security — profiles table
   - Add UPDATE policy allowing admins to update any profile (for role changes).
   - Add DELETE policy allowing admins to delete any profile (for user removal).
   - Existing policies remain: users can read own + admin reads all; users update own.

2. Pipeline statuses
   - No DB constraint changes needed (pipeline_status is a free text column).
   - New statuses 'Em Análise' and 'Recusado' are added at the application level.
   - This migration only updates RLS policies on profiles.
*/

-- Admin can update any profile (for role changes)
DROP POLICY IF EXISTS "admin_update_profiles" ON profiles;
CREATE POLICY "admin_update_profiles" ON profiles FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Admin can delete any profile (for user removal)
DROP POLICY IF EXISTS "admin_delete_profiles" ON profiles;
CREATE POLICY "admin_delete_profiles" ON profiles FOR DELETE
  TO authenticated USING (is_admin());
