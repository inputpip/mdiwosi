-- Insert sample material movements for testing
-- Note: Replace material IDs and user IDs with actual ones from your database

DO $$
DECLARE 
    material_rec RECORD;
    user_id UUID;
    user_name_val TEXT;
BEGIN
    -- Get a sample user for the movements
    SELECT id, full_name INTO user_id, user_name_val 
    FROM user_profiles 
    WHERE role IN ('admin', 'owner', 'supervisor') 
    LIMIT 1;
    
    -- If no user found, use a default
    IF user_id IS NULL THEN
        user_id := gen_random_uuid();
        user_name_val := 'System Admin';
    END IF;

    -- Loop through each material and create sample movements
    FOR material_rec IN SELECT * FROM materials LIMIT 5 LOOP
        -- Initial stock entry (IN movement)
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
        ) VALUES (
            material_rec.id,
            material_rec.name,
            'IN',
            'PURCHASE',
            material_rec.stock * 0.8, -- 80% of current stock as purchase
            0,
            material_rec.stock * 0.8,
            'Initial purchase - sample data',
            user_id,
            user_name_val,
            NOW() - INTERVAL '30 days'
        );
        
        -- Production consumption (OUT movement)
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
        ) VALUES (
            material_rec.id,
            material_rec.name,
            'OUT',
            'PRODUCTION_CONSUMPTION',
            material_rec.stock * 0.3, -- Use 30% for production
            material_rec.stock * 0.8,
            material_rec.stock * 0.5,
            'Used in production - sample data',
            gen_random_uuid()::text,
            'transaction',
            user_id,
            user_name_val,
            NOW() - INTERVAL '15 days'
        );
        
        -- Stock adjustment (ADJUSTMENT movement)
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
        ) VALUES (
            material_rec.id,
            material_rec.name,
            'ADJUSTMENT',
            'ADJUSTMENT',
            material_rec.stock * 0.5, -- Adjust to current stock
            material_rec.stock * 0.5,
            material_rec.stock,
            'Stock adjustment to match physical count - sample data',
            user_id,
            user_name_val,
            NOW() - INTERVAL '7 days'
        );
        
        -- Recent purchase (IN movement)
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
        ) VALUES (
            material_rec.id,
            material_rec.name,
            'IN',
            'PURCHASE',
            material_rec.min_stock * 2, -- Purchase for restocking
            material_rec.stock,
            material_rec.stock + (material_rec.min_stock * 2),
            'Restock purchase - sample data',
            user_id,
            user_name_val,
            NOW() - INTERVAL '2 days'
        );
        
    END LOOP;
    
    RAISE NOTICE 'Sample material movements created successfully';
END $$;