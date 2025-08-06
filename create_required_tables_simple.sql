-- Simple script to create required tables
-- Paste and run this in Supabase SQL Editor

-- =============================================
-- CREATE material_stock_movements TABLE
-- =============================================

CREATE TABLE material_stock_movements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    material_id UUID NOT NULL,
    material_name TEXT NOT NULL,
    type TEXT NOT NULL,
    reason TEXT NOT NULL,
    quantity NUMERIC NOT NULL,
    previous_stock NUMERIC NOT NULL,
    new_stock NUMERIC NOT NULL,
    notes TEXT,
    reference_id TEXT,
    reference_type TEXT,
    user_id UUID NOT NULL,
    user_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add constraints
ALTER TABLE material_stock_movements 
ADD CONSTRAINT chk_material_type 
CHECK (type IN ('IN', 'OUT', 'ADJUSTMENT'));

ALTER TABLE material_stock_movements 
ADD CONSTRAINT chk_material_reason 
CHECK (reason IN ('PURCHASE', 'PRODUCTION_CONSUMPTION', 'PRODUCTION_ACQUISITION', 'ADJUSTMENT', 'RETURN'));

-- Create indexes
CREATE INDEX idx_material_movements_material_id ON material_stock_movements(material_id);
CREATE INDEX idx_material_movements_created_at ON material_stock_movements(created_at);

-- Enable RLS
ALTER TABLE material_stock_movements ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can read material movements" ON material_stock_movements
    FOR SELECT USING (true);

CREATE POLICY "Anyone can insert material movements" ON material_stock_movements
    FOR INSERT WITH CHECK (true);

-- =============================================
-- CREATE stock_movements TABLE
-- =============================================

CREATE TABLE stock_movements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID NOT NULL,
    product_name TEXT NOT NULL,
    type TEXT NOT NULL,
    reason TEXT NOT NULL,
    quantity NUMERIC NOT NULL,
    previous_stock NUMERIC NOT NULL,
    new_stock NUMERIC NOT NULL,
    notes TEXT,
    reference_id TEXT,
    reference_type TEXT,
    user_id UUID,
    user_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add constraints
ALTER TABLE stock_movements 
ADD CONSTRAINT chk_stock_type 
CHECK (type IN ('IN', 'OUT', 'ADJUSTMENT'));

ALTER TABLE stock_movements 
ADD CONSTRAINT chk_stock_reason 
CHECK (reason IN ('PURCHASE', 'PRODUCTION', 'SALES', 'ADJUSTMENT', 'RETURN'));

-- Create indexes
CREATE INDEX idx_stock_movements_product_id ON stock_movements(product_id);
CREATE INDEX idx_stock_movements_created_at ON stock_movements(created_at);

-- Enable RLS
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can read stock movements" ON stock_movements
    FOR SELECT USING (true);

CREATE POLICY "Anyone can insert stock movements" ON stock_movements
    FOR INSERT WITH CHECK (true);

-- =============================================
-- ADD SAMPLE DATA
-- =============================================

-- Sample material movements
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
) VALUES 
(gen_random_uuid(), 'Kertas A4', 'IN', 'PURCHASE', 100, 0, 100, 'Sample purchase', 'purchase', gen_random_uuid(), 'System Admin'),
(gen_random_uuid(), 'Tinta Printer', 'IN', 'PURCHASE', 50, 0, 50, 'Sample purchase', 'purchase', gen_random_uuid(), 'System Admin'),
(gen_random_uuid(), 'Kertas A4', 'OUT', 'PRODUCTION_CONSUMPTION', 20, 100, 80, 'Used in Banner production', 'transaction', gen_random_uuid(), 'Production User');

-- Sample product movements
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
) VALUES 
(gen_random_uuid(), 'Banner 2x3m', 'IN', 'PRODUCTION', 5, 0, 5, 'Production completed', 'production', gen_random_uuid(), 'Production User'),
(gen_random_uuid(), 'Sticker A4', 'OUT', 'SALES', 10, 50, 40, 'Sold to customer', 'transaction', gen_random_uuid(), 'Cashier'),
(gen_random_uuid(), 'Banner 2x3m', 'OUT', 'SALES', 2, 5, 3, 'Sold to customer', 'transaction', gen_random_uuid(), 'Cashier');

-- =============================================
-- VERIFY CREATION
-- =============================================

SELECT 'Tables Created Successfully!' as status;

SELECT 'material_stock_movements' as table_name, COUNT(*) as sample_records 
FROM material_stock_movements;

SELECT 'stock_movements' as table_name, COUNT(*) as sample_records 
FROM stock_movements;

-- Show sample data
SELECT 'Sample Material Movements:' as info;
SELECT material_name, type, quantity, created_at 
FROM material_stock_movements 
ORDER BY created_at DESC 
LIMIT 5;

SELECT 'Sample Stock Movements:' as info;
SELECT product_name, type, quantity, created_at 
FROM stock_movements 
ORDER BY created_at DESC 
LIMIT 5;