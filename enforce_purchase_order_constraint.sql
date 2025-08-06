-- Add constraint to ensure PURCHASE movements can only be created with proper purchase order reference
-- This prevents manual insertion of fake purchase data

-- First, check current data to see what reference types exist for PURCHASE movements
SELECT 
  reason,
  reference_type,
  COUNT(*) as count,
  STRING_AGG(DISTINCT notes, '; ') as sample_notes
FROM material_stock_movements 
WHERE reason = 'PURCHASE'
GROUP BY reason, reference_type
ORDER BY count DESC;

-- Add constraint to ensure PURCHASE movements must have purchase_order reference
ALTER TABLE material_stock_movements 
ADD CONSTRAINT chk_purchase_requires_po_reference 
CHECK (
  reason != 'PURCHASE' OR 
  (reason = 'PURCHASE' AND reference_type = 'purchase_order' AND reference_id IS NOT NULL)
);

-- Also add similar constraint for stock_movements if needed
SELECT 
  reason,
  reference_type,
  COUNT(*) as count,
  STRING_AGG(DISTINCT notes, '; ') as sample_notes
FROM stock_movements 
WHERE reason = 'PURCHASE'
GROUP BY reason, reference_type
ORDER BY count DESC;

-- Add constraint for stock_movements as well
ALTER TABLE stock_movements 
ADD CONSTRAINT chk_stock_purchase_requires_po_reference 
CHECK (
  reason != 'PURCHASE' OR 
  (reason = 'PURCHASE' AND reference_type = 'purchase_order' AND reference_id IS NOT NULL)
);

-- Test the constraint by trying to insert invalid data (this should fail)
-- INSERT INTO material_stock_movements (
--   material_id, material_name, type, reason, quantity, previous_stock, new_stock, notes, user_name
-- ) VALUES (
--   gen_random_uuid(), 'Test Material', 'IN', 'PURCHASE', 10, 0, 10, 'This should fail', 'Test User'
-- );