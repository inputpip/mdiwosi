-- Script untuk mengimpor data transaksi yang sudah ada ke dalam material movements
-- Jalankan ini di Supabase SQL Editor untuk mengisi data historical

-- STEP 1: Insert material movements based on existing transactions
-- This will create material movements for all transactions that have status "Proses Produksi" or "Pesanan Selesai"

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
    user_name,
    created_at
)
SELECT DISTINCT
    pm.material_id,
    m.name as material_name,
    CASE 
        WHEN m.type = 'Stock' THEN 'OUT'  -- Stock materials are consumed (OUT)
        WHEN m.type = 'Beli' THEN 'IN'    -- Purchase materials are acquired (IN)
        ELSE 'OUT'  -- Default to OUT
    END as type,
    'PRODUCTION_CONSUMPTION' as reason,
    (ti->>'quantity')::numeric * pm.quantity as quantity,  -- Transaction item quantity * material quantity per product
    m.stock as previous_stock,  -- Current stock as previous (we'll adjust this)
    m.stock as new_stock,       -- Will be updated later
    CONCAT('Historical import from transaction ', t.id, ' - Product: ', (ti->>'productName')) as notes,
    t.id as reference_id,
    'transaction' as reference_type,
    t.cashier_id as user_id,
    t.cashier_name as user_name,
    t.created_at
FROM transactions t
CROSS JOIN LATERAL jsonb_array_elements(t.items) as ti
JOIN products p ON p.id = (ti->>'productId')::uuid
CROSS JOIN LATERAL jsonb_array_elements(
    CASE 
        WHEN jsonb_typeof(p.materials) = 'array' THEN p.materials 
        ELSE '[]'::jsonb 
    END
) as pm_json
JOIN LATERAL (
    SELECT 
        (pm_json->>'materialId')::uuid as material_id,
        (pm_json->>'quantity')::numeric as quantity
    WHERE pm_json->>'materialId' IS NOT NULL
) pm ON true
JOIN materials m ON m.id = pm.material_id
WHERE t.status IN ('Proses Produksi', 'Pesanan Selesai')
AND NOT EXISTS (
    -- Don't duplicate if movement already exists for this transaction
    SELECT 1 FROM material_stock_movements msm 
    WHERE msm.reference_id = t.id 
    AND msm.material_id = pm.material_id
);

-- STEP 2: Update material stocks based on the movements we just created
-- This will adjust current stock to reflect the historical usage

WITH material_usage AS (
    SELECT 
        material_id,
        SUM(CASE WHEN type = 'OUT' THEN quantity ELSE -quantity END) as total_used
    FROM material_stock_movements
    WHERE reference_type = 'transaction'
    GROUP BY material_id
)
UPDATE materials 
SET stock = GREATEST(0, stock + total_used)  -- Ensure stock doesn't go below 0
FROM material_usage mu
WHERE materials.id = mu.material_id;

-- STEP 3: Update the new_stock and previous_stock in movements to be more accurate
UPDATE material_stock_movements
SET 
    previous_stock = m.stock + CASE WHEN msm.type = 'OUT' THEN msm.quantity ELSE -msm.quantity END,
    new_stock = m.stock
FROM materials m
WHERE material_stock_movements.material_id = m.id
AND reference_type = 'transaction';

-- STEP 4: Add some sample material movements for materials that don't have any historical data
-- This creates initial stock entries for materials without transaction history

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
    user_name,
    created_at
)
SELECT 
    m.id,
    m.name,
    'IN',
    'PURCHASE',
    m.stock,
    0,
    m.stock,
    'Initial stock entry (historical import)',
    (SELECT id FROM user_profiles WHERE role IN ('admin', 'owner') LIMIT 1),
    'System Import',
    m.created_at
FROM materials m
WHERE NOT EXISTS (
    SELECT 1 FROM material_stock_movements msm 
    WHERE msm.material_id = m.id
)
AND m.stock > 0;

-- Display summary of what was imported
SELECT 
    'Material Movements Created' as summary,
    COUNT(*) as count
FROM material_stock_movements
WHERE created_at >= NOW() - INTERVAL '1 minute'

UNION ALL

SELECT 
    'Unique Materials Affected' as summary,
    COUNT(DISTINCT material_id) as count
FROM material_stock_movements
WHERE created_at >= NOW() - INTERVAL '1 minute'

UNION ALL

SELECT 
    'Unique Transactions Processed' as summary,
    COUNT(DISTINCT reference_id) as count
FROM material_stock_movements
WHERE reference_type = 'transaction'
AND created_at >= NOW() - INTERVAL '1 minute';

-- Show some sample data
SELECT 
    'Sample Material Movements' as info,
    msm.created_at,
    msm.material_name,
    msm.type,
    msm.reason,
    msm.quantity,
    msm.reference_id
FROM material_stock_movements msm
WHERE msm.created_at >= NOW() - INTERVAL '1 minute'
ORDER BY msm.created_at DESC
LIMIT 10;