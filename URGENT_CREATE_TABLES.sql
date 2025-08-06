-- COPY PASTE SCRIPT INI KE SUPABASE SQL EDITOR DAN KLIK RUN
-- Ini akan membuat tabel yang diperlukan

-- 1. Buat tabel material_stock_movements
CREATE TABLE material_stock_movements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    material_id UUID,
    material_name TEXT,
    type TEXT,
    reason TEXT,
    quantity NUMERIC,
    previous_stock NUMERIC,
    new_stock NUMERIC,
    notes TEXT,
    reference_id TEXT,
    reference_type TEXT,
    user_id UUID,
    user_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Buat tabel stock_movements
CREATE TABLE stock_movements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID,
    product_name TEXT,
    type TEXT,
    reason TEXT,
    quantity NUMERIC,
    previous_stock NUMERIC,
    new_stock NUMERIC,
    notes TEXT,
    reference_id TEXT,
    reference_type TEXT,
    user_id UUID,
    user_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Matikan RLS untuk kedua tabel (supaya bisa diakses)
ALTER TABLE material_stock_movements DISABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements DISABLE ROW LEVEL SECURITY;

-- 4. Tambah data sample
INSERT INTO material_stock_movements (material_id, material_name, type, reason, quantity, previous_stock, new_stock, notes, user_name) VALUES 
(gen_random_uuid(), 'Kertas A4', 'IN', 'PURCHASE', 100, 0, 100, 'Sample purchase', 'Admin'),
(gen_random_uuid(), 'Tinta Hitam', 'OUT', 'PRODUCTION_CONSUMPTION', 10, 50, 40, 'Used in printing', 'User');

INSERT INTO stock_movements (product_id, product_name, type, reason, quantity, previous_stock, new_stock, notes, user_name) VALUES 
(gen_random_uuid(), 'Banner 2x3m', 'IN', 'PRODUCTION', 5, 0, 5, 'Production completed', 'Admin'),
(gen_random_uuid(), 'Sticker A4', 'OUT', 'SALES', 3, 20, 17, 'Sold to customer', 'Cashier');

-- 5. Cek hasil
SELECT 'SUCCESS: Tables created!' as result;
SELECT COUNT(*) as material_movements FROM material_stock_movements;
SELECT COUNT(*) as stock_movements FROM stock_movements;