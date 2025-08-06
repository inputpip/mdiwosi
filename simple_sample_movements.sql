-- Simple insert sample material movements for testing
-- Run this in Supabase SQL Editor

-- First, let's see what materials we have
-- SELECT id, name FROM materials LIMIT 5;

-- Insert sample movements (replace the material_id with actual IDs from your materials table)
-- You need to replace 'your-material-id-1', 'your-material-id-2' etc with actual UUIDs from your materials table
-- And 'your-user-id' with actual user ID from profiles table

/*
-- Template - replace the UUIDs with actual ones:

INSERT INTO material_stock_movements (
    material_id,
    material_name,
    type,
    reason,
    quantity,
    previous_stock,
    new_stock,
    notes,
    user_id,
    user_name
) VALUES
-- Purchase movement (IN)
('your-material-id-1', 'Kertas A4', 'IN', 'PURCHASE', 100, 50, 150, 'Purchase order #001', 'your-user-id', 'Admin'),

-- Production consumption (OUT)  
('your-material-id-1', 'Kertas A4', 'OUT', 'PRODUCTION_CONSUMPTION', 30, 150, 120, 'Used in production', 'your-user-id', 'Admin'),

-- Stock adjustment
('your-material-id-1', 'Kertas A4', 'ADJUSTMENT', 'ADJUSTMENT', 5, 120, 125, 'Physical count adjustment', 'your-user-id', 'Admin');

*/

-- Quick way to get material and user IDs for the above template:
SELECT 
    'Material IDs for template:' as info,
    id, 
    name 
FROM materials 
LIMIT 5;

SELECT 
    'User IDs for template:' as info,
    id, 
    full_name 
FROM user_profiles 
WHERE role IN ('admin', 'owner') 
LIMIT 3;