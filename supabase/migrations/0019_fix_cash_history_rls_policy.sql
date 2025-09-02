-- Fix RLS policy for cash_history to allow access for all authenticated users
-- This resolves the issue where non-owner/admin users cannot see cash history data

-- Drop the restrictive policy
DROP POLICY IF EXISTS "Owners and admins can manage cash history" ON cash_history;

-- Create a more inclusive policy for authenticated users
-- This allows all authenticated users to view and manage cash history
CREATE POLICY "Authenticated users can manage cash history" 
ON cash_history FOR ALL 
USING (auth.role() = 'authenticated');

-- Alternative policy if you want role-based restrictions but more inclusive:
-- CREATE POLICY "Staff can manage cash history" 
-- ON cash_history FOR ALL 
-- USING (
--   EXISTS (
--     SELECT 1 FROM profiles 
--     WHERE profiles.id = auth.uid() 
--     AND profiles.role IN ('owner', 'admin', 'cashier', 'staff')
--   )
-- );

-- Add comment for future reference
COMMENT ON POLICY "Authenticated users can manage cash history" ON cash_history IS 
'Allows all authenticated users to access cash history data. Changed from owner/admin-only to fix missing data issue.';