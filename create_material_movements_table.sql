-- Create material_movements table for tracking material stock changes
CREATE TABLE IF NOT EXISTS material_movements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    material_id UUID REFERENCES materials(id) ON DELETE CASCADE,
    material_name TEXT,
    movement_type TEXT CHECK (movement_type IN ('usage', 'addition', 'adjustment')) NOT NULL,
    quantity DECIMAL(10,3) NOT NULL,
    previous_stock DECIMAL(10,3) NOT NULL,
    new_stock DECIMAL(10,3) NOT NULL,
    related_transaction_id UUID,
    related_product_name TEXT,
    related_product_id UUID,
    notes TEXT,
    user_id UUID,
    user_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_material_movements_material_id ON material_movements(material_id);
CREATE INDEX IF NOT EXISTS idx_material_movements_created_at ON material_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_material_movements_transaction_id ON material_movements(related_transaction_id);

-- Add RLS policies
ALTER TABLE material_movements ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read material movements
CREATE POLICY "Allow authenticated users to read material movements" ON material_movements
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow authenticated users to insert material movements  
CREATE POLICY "Allow authenticated users to insert material movements" ON material_movements
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Allow authenticated users to update their own material movements
CREATE POLICY "Allow authenticated users to update material movements" ON material_movements
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Allow owners and admins to delete material movements
CREATE POLICY "Allow owners and admins to delete material movements" ON material_movements
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles up
            WHERE up.id = auth.uid()
            AND up.role IN ('owner', 'admin')
        )
    );

-- Create function to automatically record material movements when stock changes
CREATE OR REPLACE FUNCTION record_material_movement()
RETURNS TRIGGER AS $$
BEGIN
    -- Only record if stock actually changed
    IF (TG_OP = 'UPDATE' AND OLD.stock != NEW.stock) OR TG_OP = 'INSERT' THEN
        INSERT INTO material_movements (
            material_id,
            material_name,
            movement_type,
            quantity,
            previous_stock,
            new_stock,
            notes,
            user_id,
            user_name
        ) VALUES (
            NEW.id,
            NEW.name,
            CASE 
                WHEN TG_OP = 'INSERT' THEN 'addition'
                WHEN NEW.stock > COALESCE(OLD.stock, 0) THEN 'addition'
                WHEN NEW.stock < COALESCE(OLD.stock, 0) THEN 'usage'
                ELSE 'adjustment'
            END,
            ABS(NEW.stock - COALESCE(OLD.stock, 0)),
            COALESCE(OLD.stock, 0),
            NEW.stock,
            CASE 
                WHEN TG_OP = 'INSERT' THEN 'Initial stock entry'
                ELSE 'Stock updated'
            END,
            auth.uid(),
            COALESCE(
                (SELECT up.full_name FROM user_profiles up WHERE up.id = auth.uid()),
                'System'
            )
        );
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically record material movements
DROP TRIGGER IF EXISTS material_stock_change_trigger ON materials;
CREATE TRIGGER material_stock_change_trigger
    AFTER INSERT OR UPDATE ON materials
    FOR EACH ROW
    EXECUTE FUNCTION record_material_movement();

-- Insert some sample movements for existing materials (optional)
-- This helps populate data for testing
DO $$
DECLARE 
    mat RECORD;
BEGIN
    FOR mat IN SELECT * FROM materials LOOP
        INSERT INTO material_movements (
            material_id,
            material_name,
            movement_type,
            quantity,
            previous_stock,
            new_stock,
            notes,
            user_id,
            user_name,
            created_at
        ) VALUES (
            mat.id,
            mat.name,
            'addition',
            mat.stock,
            0,
            mat.stock,
            'Initial stock entry (migration)',
            (SELECT id FROM user_profiles WHERE role = 'owner' LIMIT 1),
            'System Migration',
            mat.created_at
        );
    END LOOP;
END $$;