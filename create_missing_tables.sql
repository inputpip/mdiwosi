-- Script untuk membuat tabel yang hilang/diperlukan
-- Jalankan di Supabase SQL Editor

-- 1. Create stock_movements table for product stock tracking
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    type TEXT CHECK (type IN ('IN', 'OUT', 'ADJUSTMENT')) NOT NULL,
    reason TEXT CHECK (reason IN ('PURCHASE', 'PRODUCTION', 'SALES', 'ADJUSTMENT', 'RETURN')) NOT NULL,
    quantity DECIMAL(10,3) NOT NULL,
    previous_stock DECIMAL(10,3) NOT NULL,
    new_stock DECIMAL(10,3) NOT NULL,
    notes TEXT,
    reference_id TEXT,
    reference_type TEXT,
    user_id UUID,
    user_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON stock_movements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_reference ON stock_movements(reference_id, reference_type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type_reason ON stock_movements(type, reason);

-- Enable RLS
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

-- Create policies for stock_movements
CREATE POLICY "Allow authenticated users to read stock movements" ON stock_movements
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated users to insert stock movements" ON stock_movements
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update stock movements" ON stock_movements
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow owners and admins to delete stock movements" ON stock_movements
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles up
            WHERE up.id = auth.uid()
            AND up.role IN ('owner', 'admin')
        )
    );

-- 2. Fix attendance table issues (if needed)
-- Check if attendance table exists and has correct structure
DO $$
BEGIN
    -- Add missing foreign key constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'attendance_user_id_fkey'
        AND table_name = 'attendance'
    ) THEN
        ALTER TABLE attendance 
        ADD CONSTRAINT attendance_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE;
    END IF;
    
    -- Ensure RLS is enabled
    ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
    
    -- Update policies if needed
    DROP POLICY IF EXISTS "Users can view own attendance" ON attendance;
    CREATE POLICY "Users can view own attendance" ON attendance
        FOR SELECT
        TO authenticated
        USING (user_id = auth.uid() OR EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() 
            AND role IN ('admin', 'owner', 'supervisor')
        ));

EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Attendance table might not exist or other error: %', SQLERRM;
END $$;

-- 3. Add some sample stock movements for testing
INSERT INTO stock_movements (
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
SELECT 
    p.id,
    p.name,
    'ADJUSTMENT',
    'ADJUSTMENT',
    COALESCE(p.current_stock, 0),
    0,
    COALESCE(p.current_stock, 0),
    'Initial stock entry for existing products',
    'system',
    (SELECT id FROM user_profiles WHERE role IN ('admin', 'owner') LIMIT 1),
    'System'
FROM products p
WHERE NOT EXISTS (
    SELECT 1 FROM stock_movements sm 
    WHERE sm.product_id = p.id
)
AND COALESCE(p.current_stock, 0) > 0
LIMIT 10;

-- Show results
SELECT 'Tables Created/Updated' as status;
SELECT 'Sample Stock Movements' as info, COUNT(*) as count FROM stock_movements;
SELECT 'Sample Data' as info, product_name, type, quantity FROM stock_movements LIMIT 5;