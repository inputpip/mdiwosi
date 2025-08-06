-- Remove sample/test purchase data that was created by migration scripts
-- These entries are confusing users as they appear as purchases that weren't actually made

-- Remove sample material movements with "Sample purchase" in notes
DELETE FROM material_stock_movements 
WHERE reason = 'PURCHASE' 
  AND (
    notes ILIKE '%sample%' 
    OR notes ILIKE '%test%'
    OR user_name IN ('Admin', 'System Admin', 'System')
    OR reference_type = 'purchase' -- Old format, should be 'purchase_order'
  );

-- Remove sample product movements with "Sample purchase" in notes
DELETE FROM stock_movements 
WHERE reason = 'PURCHASE' 
  AND (
    notes ILIKE '%sample%' 
    OR notes ILIKE '%test%'
    OR user_name IN ('Admin', 'System Admin', 'System')
    OR reference_type = 'purchase' -- Old format, should be 'purchase_order'
  );

-- Verify the cleanup by showing remaining purchase movements
SELECT 
  'material_stock_movements' as table_name,
  material_name as item_name,
  reason,
  notes,
  user_name,
  reference_type,
  created_at
FROM material_stock_movements 
WHERE reason = 'PURCHASE'
UNION ALL
SELECT 
  'stock_movements' as table_name,
  product_name as item_name,
  reason,
  notes,
  user_name,
  reference_type,
  created_at
FROM stock_movements 
WHERE reason = 'PURCHASE'
ORDER BY created_at DESC;