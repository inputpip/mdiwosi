-- Fix incorrect stock movements for products with type 'Beli'
-- These should be OUT/SALES movements, not IN/PURCHASE

-- First, let's see the current incorrect data
SELECT 
    sm.id,
    sm.product_name,
    p.type as product_type,
    sm.type as movement_type,
    sm.reason,
    sm.quantity,
    sm.reference_id,
    sm.reference_type,
    sm.created_at
FROM stock_movements sm
JOIN products p ON sm.product_id = p.id
WHERE p.type = 'Beli' 
  AND sm.type = 'IN' 
  AND sm.reason = 'PURCHASE'
  AND sm.reference_type = 'transaction'
ORDER BY sm.created_at DESC;

-- Update incorrect stock movements for 'Beli' products from transactions
UPDATE stock_movements 
SET 
    type = 'OUT',
    reason = 'SALES',
    notes = CASE 
        WHEN notes IS NULL THEN 'Fixed: Changed from incorrect IN/PURCHASE to OUT/SALES for Beli product'
        ELSE notes || ' [Fixed: Changed from IN/PURCHASE to OUT/SALES for Beli product]'
    END
WHERE id IN (
    SELECT sm.id
    FROM stock_movements sm
    JOIN products p ON sm.product_id = p.id
    WHERE p.type = 'Beli' 
      AND sm.type = 'IN' 
      AND sm.reason = 'PURCHASE'
      AND sm.reference_type = 'transaction'
);

-- Verify the fix
SELECT 
    sm.id,
    sm.product_name,
    p.type as product_type,
    sm.type as movement_type,
    sm.reason,
    sm.quantity,
    sm.reference_id,
    sm.reference_type,
    sm.notes,
    sm.created_at
FROM stock_movements sm
JOIN products p ON sm.product_id = p.id
WHERE p.type = 'Beli' 
  AND sm.reference_type = 'transaction'
ORDER BY sm.created_at DESC;