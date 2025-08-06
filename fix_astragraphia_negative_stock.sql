-- Fix Astragraphia and other service/contract materials with negative stock
-- These materials should track cumulative usage, not decrease stock

-- First, check current problematic materials
SELECT 
  name,
  type,
  stock,
  unit,
  price_per_unit,
  min_stock
FROM materials 
WHERE type IN ('Beli', 'Jasa') 
  AND stock < 0
ORDER BY name;

-- Fix negative stock for service materials by making them positive
-- Since these are usage counters, negative values don't make sense
UPDATE materials 
SET stock = ABS(stock)  -- Convert negative to positive
WHERE type IN ('Beli', 'Jasa') 
  AND stock < 0;

-- Update material movements for service materials to reflect correct logic
-- All service material movements should be OUT (usage tracking)
UPDATE material_stock_movements 
SET 
  type = 'OUT',
  reason = 'PRODUCTION_CONSUMPTION',
  notes = CASE 
    WHEN notes IS NULL THEN 'Fixed: Service material usage tracking'
    ELSE notes || ' [Fixed: Service material usage tracking]'
  END
WHERE material_id IN (
  SELECT id FROM materials WHERE type IN ('Beli', 'Jasa')
)
AND type = 'IN';  -- Change any IN movements to OUT for service materials

-- Verify the fix
SELECT 
  'After Fix' as status,
  name,
  type,
  stock,
  unit,
  price_per_unit
FROM materials 
WHERE type IN ('Beli', 'Jasa')
ORDER BY name;

-- Show recent movements for service materials
SELECT 
  m.name as material_name,
  m.type as material_type,
  msm.type as movement_type,
  msm.reason,
  msm.quantity,
  msm.new_stock,
  msm.created_at
FROM material_stock_movements msm
JOIN materials m ON msm.material_id = m.id
WHERE m.type IN ('Beli', 'Jasa')
ORDER BY msm.created_at DESC
LIMIT 10;