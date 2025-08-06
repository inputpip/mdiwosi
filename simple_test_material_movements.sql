-- Simple script to add test material movements
-- Run this in Supabase SQL Editor to test the material tracking system

-- First, let's check what we have
SELECT 'Current Materials' as info, id, name, type, stock FROM materials LIMIT 5;

-- Check current user profiles
SELECT 'Available Users' as info, id, full_name, role FROM user_profiles LIMIT 3;

-- Check recent transactions
SELECT 'Recent Transactions' as info, id, customer_name, status, created_at FROM transactions ORDER BY created_at DESC LIMIT 3;

-- Add some test material movements
-- Replace the UUIDs below with actual IDs from your database

/*
-- TEMPLATE - Replace UUIDs with actual ones from above queries:

-- Example for a material purchase (IN movement)
INSERT INTO material_stock_movements (
    material_id,
    material_name,
    type,
    reason,
    quantity,
    previous_stock,
    new_stock,
    notes,
    reference_type,
    user_id,
    user_name
) VALUES (
    'YOUR-MATERIAL-UUID-HERE',  -- Replace with actual material ID
    'Kertas A4',  -- Replace with actual material name
    'IN',
    'PURCHASE',
    50,  -- Quantity purchased
    100, -- Previous stock
    150, -- New stock (100 + 50)
    'Test purchase for material tracking demo',
    'purchase_order',
    'YOUR-USER-UUID-HERE',  -- Replace with actual user ID
    'Test User'  -- Replace with actual user name
);

-- Example for a material usage in production (OUT movement)
INSERT INTO material_stock_movements (
    material_id,
    material_name,
    type,
    reason,
    quantity,
    previous_stock,
    new_stock,
    notes,
    reference_id,
    reference_type,
    user_id,
    user_name
) VALUES (
    'YOUR-MATERIAL-UUID-HERE',  -- Same material as above
    'Kertas A4',
    'OUT',
    'PRODUCTION_CONSUMPTION',
    20,  -- Quantity used
    150, -- Previous stock
    130, -- New stock (150 - 20)
    'Used in Banner production',
    'YOUR-TRANSACTION-UUID-HERE',  -- Replace with actual transaction ID
    'transaction',
    'YOUR-USER-UUID-HERE',
    'Test User'
);

-- Example for a stock adjustment (ADJUSTMENT movement)
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
) VALUES (
    'YOUR-MATERIAL-UUID-HERE',
    'Kertas A4',
    'ADJUSTMENT',
    'ADJUSTMENT',
    5,   -- Adjustment quantity
    130, -- Previous stock
    135, -- New stock (130 + 5)
    'Physical count adjustment - found extra stock',
    'YOUR-USER-UUID-HERE',
    'Test User'
);

*/

-- After adding test data, check the results
SELECT 
    'Test Material Movements' as info,
    material_name,
    type,
    reason,
    quantity,
    reference_id,
    created_at
FROM material_stock_movements 
ORDER BY created_at DESC 
LIMIT 10;