-- Comprehensive fix for all database issues
-- Run this in Supabase SQL Editor

-- ================================================
-- 1. CREATE MISSING stock_movements TABLE
-- ================================================

CREATE TABLE IF NOT EXISTS public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL,
  product_name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('IN', 'OUT', 'ADJUSTMENT')),
  reason TEXT NOT NULL CHECK (reason IN ('PURCHASE', 'PRODUCTION', 'SALES', 'ADJUSTMENT', 'RETURN')),
  quantity NUMERIC NOT NULL,
  previous_stock NUMERIC NOT NULL,
  new_stock NUMERIC NOT NULL,
  notes TEXT,
  reference_id TEXT,
  reference_type TEXT,
  user_id UUID,
  user_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Foreign key constraints
  CONSTRAINT fk_stock_movement_product 
    FOREIGN KEY (product_id) 
    REFERENCES public.products(id) 
    ON DELETE CASCADE,
    
  -- Ensure positive quantity
  CONSTRAINT positive_quantity CHECK (quantity > 0)
);

-- Enable Row Level Security
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY IF NOT EXISTS "Authenticated users can view stock movements" 
ON public.stock_movements FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Authenticated users can create stock movements" 
ON public.stock_movements FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON public.stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON public.stock_movements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_reference ON public.stock_movements(reference_id, reference_type);

-- ================================================
-- 2. ENSURE material_stock_movements TABLE EXISTS
-- ================================================

-- This should already exist from previous migrations, but let's ensure it
CREATE TABLE IF NOT EXISTS public.material_stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID NOT NULL,
  material_name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('IN', 'OUT', 'ADJUSTMENT')),
  reason TEXT NOT NULL CHECK (reason IN ('PURCHASE', 'PRODUCTION_CONSUMPTION', 'PRODUCTION_ACQUISITION', 'ADJUSTMENT', 'RETURN')),
  quantity NUMERIC NOT NULL,
  previous_stock NUMERIC NOT NULL,
  new_stock NUMERIC NOT NULL,
  notes TEXT,
  reference_id TEXT,
  reference_type TEXT,
  user_id UUID NOT NULL,
  user_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Foreign key constraints
  CONSTRAINT fk_material_stock_movement_material 
    FOREIGN KEY (material_id) 
    REFERENCES public.materials(id) 
    ON DELETE CASCADE,
    
  -- Ensure positive quantity
  CONSTRAINT positive_quantity_material CHECK (quantity > 0)
);

-- ================================================
-- 3. FIX ATTENDANCE TABLE ISSUES
-- ================================================

-- Check if attendance table exists and fix common issues
DO $$
BEGIN
    -- Ensure attendance table has proper structure
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'attendance') THEN
        -- Add missing columns if they don't exist
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'attendance' AND column_name = 'user_id') THEN
            ALTER TABLE attendance ADD COLUMN user_id UUID;
        END IF;
        
        -- Ensure proper foreign key relationship
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'attendance_user_id_fkey'
            AND table_name = 'attendance'
        ) THEN
            ALTER TABLE attendance 
            ADD CONSTRAINT attendance_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE;
        END IF;
        
        -- Enable RLS if not already enabled
        ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
        
        -- Update RLS policies
        DROP POLICY IF EXISTS "Users can view attendance" ON attendance;
        CREATE POLICY "Users can view attendance" ON attendance
            FOR SELECT TO authenticated
            USING (
                user_id = auth.uid() OR 
                EXISTS (
                    SELECT 1 FROM user_profiles 
                    WHERE id = auth.uid() 
                    AND role IN ('admin', 'owner', 'supervisor')
                )
            );
            
        DROP POLICY IF EXISTS "Users can insert attendance" ON attendance;
        CREATE POLICY "Users can insert attendance" ON attendance
            FOR INSERT TO authenticated
            WITH CHECK (user_id = auth.uid());
            
        RAISE NOTICE 'Attendance table fixed successfully';
    ELSE
        RAISE NOTICE 'Attendance table does not exist - this is OK if not using attendance feature';
    END IF;

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error fixing attendance table: %', SQLERRM;
END $$;

-- ================================================
-- 4. ADD SAMPLE DATA FOR TESTING
-- ================================================

-- Add sample stock movements for existing products
INSERT INTO public.stock_movements (
    product_id,
    product_name,
    type,
    reason,
    quantity,
    previous_stock,
    new_stock,
    notes,
    reference_type,
    user_id,
    user_name
)
SELECT DISTINCT ON (p.id)
    p.id,
    p.name,
    'ADJUSTMENT',
    'ADJUSTMENT',
    COALESCE(p.current_stock, 10),
    0,
    COALESCE(p.current_stock, 10),
    'Initial stock entry - system migration',
    'system_migration',
    COALESCE(
        (SELECT id FROM user_profiles WHERE role IN ('admin', 'owner') ORDER BY created_at LIMIT 1),
        gen_random_uuid()
    ),
    COALESCE(
        (SELECT full_name FROM user_profiles WHERE role IN ('admin', 'owner') ORDER BY created_at LIMIT 1),
        'System Admin'
    )
FROM products p
WHERE NOT EXISTS (
    SELECT 1 FROM stock_movements sm 
    WHERE sm.product_id = p.id
)
LIMIT 10;

-- Add sample material movements for existing materials
INSERT INTO public.material_stock_movements (
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
)
SELECT DISTINCT ON (m.id)
    m.id,
    m.name,
    'IN',
    'PURCHASE',
    COALESCE(m.stock, 10),
    0,
    COALESCE(m.stock, 10),
    'Initial stock entry - system migration',
    'system_migration',
    COALESCE(
        (SELECT id FROM user_profiles WHERE role IN ('admin', 'owner') ORDER BY created_at LIMIT 1),
        gen_random_uuid()
    ),
    COALESCE(
        (SELECT full_name FROM user_profiles WHERE role IN ('admin', 'owner') ORDER BY created_at LIMIT 1),
        'System Admin'
    )
FROM materials m
WHERE NOT EXISTS (
    SELECT 1 FROM material_stock_movements msm 
    WHERE msm.material_id = m.id
)
LIMIT 10;

-- ================================================
-- 5. VERIFICATION QUERIES
-- ================================================

-- Show summary of what was created/fixed
SELECT 'Database Fix Summary' as status;

SELECT 
    'stock_movements table' as table_name,
    CASE WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'stock_movements') 
         THEN 'EXISTS' 
         ELSE 'MISSING' 
    END as status,
    COALESCE((SELECT COUNT(*) FROM stock_movements), 0) as row_count;

SELECT 
    'material_stock_movements table' as table_name,
    CASE WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'material_stock_movements') 
         THEN 'EXISTS' 
         ELSE 'MISSING' 
    END as status,
    COALESCE((SELECT COUNT(*) FROM material_stock_movements), 0) as row_count;

SELECT 
    'attendance table' as table_name,
    CASE WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'attendance') 
         THEN 'EXISTS' 
         ELSE 'MISSING' 
    END as status,
    COALESCE((SELECT COUNT(*) FROM attendance), 0) as row_count;

-- Show sample data
SELECT 'Sample Stock Movements' as info;
SELECT product_name, type, quantity, created_at FROM stock_movements ORDER BY created_at DESC LIMIT 5;

SELECT 'Sample Material Movements' as info;  
SELECT material_name, type, quantity, created_at FROM material_stock_movements ORDER BY created_at DESC LIMIT 5;