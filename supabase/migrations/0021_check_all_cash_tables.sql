-- Check all tables that might contain cash history data
-- This will help identify where the missing July data might be

DO $$
DECLARE
  table_record RECORD;
  table_count INTEGER;
BEGIN
  RAISE NOTICE '=== CHECKING ALL POTENTIAL CASH HISTORY TABLES ===';
  
  -- Check all tables with 'cash' in the name
  FOR table_record IN (
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name ILIKE '%cash%'
    ORDER BY table_name
  )
  LOOP
    BEGIN
      -- Try to get record count
      EXECUTE format('SELECT COUNT(*) FROM public.%I', table_record.table_name) INTO table_count;
      RAISE NOTICE 'Table: % - Records: %', table_record.table_name, table_count;
      
      -- If table has data, show column structure
      IF table_count > 0 THEN
        RAISE NOTICE '  Columns in %:', table_record.table_name;
        FOR table_record IN (
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = table_record.table_name
          ORDER BY ordinal_position
        )
        LOOP
          RAISE NOTICE '    - %: %', table_record.column_name, table_record.data_type;
        END LOOP;
      END IF;
      
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'Error checking table %: %', table_record.table_name, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '=== CHECKING TABLES WITH BACKUP/OLD NAMING ===';
  
  -- Check for backup/old tables
  FOR table_record IN (
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND (table_name ILIKE '%backup%' OR table_name ILIKE '%old%' OR table_name ILIKE '%temp%')
    ORDER BY table_name
  )
  LOOP
    BEGIN
      EXECUTE format('SELECT COUNT(*) FROM public.%I', table_record.table_name) INTO table_count;
      RAISE NOTICE 'Backup/Old Table: % - Records: %', table_record.table_name, table_count;
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'Error checking backup table %: %', table_record.table_name, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '=== CASH_HISTORY DATE RANGE CHECK ===';
  
  -- Check date ranges in main cash_history table
  BEGIN
    FOR table_record IN (
      SELECT 
        DATE_TRUNC('month', created_at) as month,
        COUNT(*) as count
      FROM public.cash_history 
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month
    )
    LOOP
      RAISE NOTICE 'Month: % - Records: %', table_record.month, table_record.count;
    END LOOP;
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'Error checking date ranges: %', SQLERRM;
  END;
  
END $$;