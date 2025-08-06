-- Check and fix product schema to ensure current_stock column exists
-- Run this script in your Supabase SQL Editor or psql

-- First, let's check if the current_stock column exists
DO $$
DECLARE
    column_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'products' 
        AND column_name = 'current_stock'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        RAISE NOTICE 'current_stock column does not exist. Adding it now...';
        
        -- Add the missing columns from migration 0009
        ALTER TABLE public.products 
        ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'Stock' CHECK (type IN ('Stock', 'Beli')),
        ADD COLUMN IF NOT EXISTS current_stock NUMERIC DEFAULT 0,
        ADD COLUMN IF NOT EXISTS min_stock NUMERIC DEFAULT 0;
        
        -- Add comments
        COMMENT ON COLUMN public.products.type IS 'Jenis barang: Stock (produksi menurunkan stock), Beli (produksi menambah stock)';
        COMMENT ON COLUMN public.products.current_stock IS 'Stock saat ini';
        COMMENT ON COLUMN public.products.min_stock IS 'Stock minimum untuk alert';
        
        -- Update existing products to have default values
        UPDATE public.products 
        SET 
            type = 'Stock',
            current_stock = 0,
            min_stock = 0
        WHERE type IS NULL OR current_stock IS NULL OR min_stock IS NULL;
        
        RAISE NOTICE 'current_stock column has been added successfully!';
    ELSE
        RAISE NOTICE 'current_stock column already exists.';
    END IF;
END $$;

-- Verify the schema
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'products' 
AND column_name IN ('current_stock', 'min_stock', 'type')
ORDER BY column_name;