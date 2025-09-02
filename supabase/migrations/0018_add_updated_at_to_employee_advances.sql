-- Add updated_at column to employee_advances table if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'employee_advances' 
                 AND column_name = 'updated_at') THEN
    ALTER TABLE public.employee_advances 
    ADD COLUMN updated_at TIMESTAMPTZ;
  END IF;
END $$;

-- Create index for better query performance on updated_at
CREATE INDEX IF NOT EXISTS idx_employee_advances_updated_at ON public.employee_advances(updated_at);