-- Restore all cash history data from backup table to main table
-- This script will check for backup tables and move data back to main cash_history

-- First, let's check what backup tables might exist
DO $$
BEGIN
  -- Check if cash_history_backup table exists
  IF EXISTS (SELECT FROM information_schema.tables 
             WHERE table_schema = 'public' 
             AND table_name = 'cash_history_backup') THEN
    
    RAISE NOTICE 'Found cash_history_backup table, restoring data...';
    
    -- Insert all backup data back to main table (avoiding duplicates)
    INSERT INTO public.cash_history (
      id,
      account_id,
      account_name,
      transaction_type,
      amount,
      description,
      reference_number,
      reference_id,
      reference_name,
      source_type,
      type,
      user_id,
      user_name,
      created_by,
      created_by_name,
      created_at,
      updated_at
    )
    SELECT DISTINCT
      COALESCE(backup.id, gen_random_uuid()),
      backup.account_id,
      backup.account_name,
      backup.transaction_type,
      backup.amount,
      backup.description,
      backup.reference_number,
      backup.reference_id,
      backup.reference_name,
      backup.source_type,
      backup.type,
      backup.user_id,
      backup.user_name,
      backup.created_by,
      backup.created_by_name,
      backup.created_at,
      backup.updated_at
    FROM public.cash_history_backup backup
    WHERE NOT EXISTS (
      SELECT 1 FROM public.cash_history main
      WHERE (
        (backup.id IS NOT NULL AND main.id = backup.id) 
        OR (
          main.account_id = backup.account_id 
          AND main.amount = backup.amount 
          AND main.description = backup.description
          AND main.created_at = backup.created_at
        )
      )
    );
    
    -- Get count of restored records
    GET DIAGNOSTICS rows_inserted = ROW_COUNT;
    RAISE NOTICE 'Restored % records from cash_history_backup', rows_inserted;
    
  END IF;
  
  -- Check for other possible backup table names
  IF EXISTS (SELECT FROM information_schema.tables 
             WHERE table_schema = 'public' 
             AND table_name LIKE '%cash%backup%') THEN
    
    RAISE NOTICE 'Found other cash backup tables, please check manually';
    
  END IF;
  
  -- Check for tables with _old suffix
  IF EXISTS (SELECT FROM information_schema.tables 
             WHERE table_schema = 'public' 
             AND table_name = 'cash_history_old') THEN
    
    RAISE NOTICE 'Found cash_history_old table, restoring data...';
    
    -- Similar insert logic for _old table
    INSERT INTO public.cash_history (
      id,
      account_id,
      account_name,
      transaction_type,
      amount,
      description,
      reference_number,
      reference_id,
      reference_name,
      source_type,
      type,
      user_id,
      user_name,
      created_by,
      created_by_name,
      created_at,
      updated_at
    )
    SELECT DISTINCT
      COALESCE(old_table.id, gen_random_uuid()),
      old_table.account_id,
      old_table.account_name,
      old_table.transaction_type,
      old_table.amount,
      old_table.description,
      old_table.reference_number,
      old_table.reference_id,
      old_table.reference_name,
      old_table.source_type,
      old_table.type,
      old_table.user_id,
      old_table.user_name,
      old_table.created_by,
      old_table.created_by_name,
      old_table.created_at,
      old_table.updated_at
    FROM public.cash_history_old old_table
    WHERE NOT EXISTS (
      SELECT 1 FROM public.cash_history main
      WHERE (
        (old_table.id IS NOT NULL AND main.id = old_table.id) 
        OR (
          main.account_id = old_table.account_id 
          AND main.amount = old_table.amount 
          AND main.description = old_table.description
          AND main.created_at = old_table.created_at
        )
      )
    );
    
  END IF;
  
  -- Show current record count in main table
  SELECT COUNT(*) INTO rows_inserted FROM public.cash_history;
  RAISE NOTICE 'Total records in cash_history after restore: %', rows_inserted;
  
EXCEPTION WHEN others THEN
  RAISE NOTICE 'Error during restore: %', SQLERRM;
END $$;