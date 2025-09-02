-- Consolidate ALL cash history data from any backup/old tables back to main table
-- This will ensure all July data (and any other missing data) is restored

DO $$
DECLARE
  table_record RECORD;
  total_restored INTEGER := 0;
  batch_restored INTEGER;
BEGIN
  RAISE NOTICE '=== CONSOLIDATING ALL CASH HISTORY DATA ===';
  
  -- List of possible backup table names to check
  FOR table_record IN (
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name != 'cash_history'  -- Exclude main table
    AND (
      table_name ILIKE '%cash%history%' 
      OR table_name ILIKE '%cash%backup%'
      OR table_name ILIKE '%cash%old%'
      OR table_name ILIKE '%cash%temp%'
      OR table_name ILIKE 'backup%cash%'
      OR table_name ILIKE 'old%cash%'
    )
    ORDER BY table_name
  )
  LOOP
    BEGIN
      RAISE NOTICE 'Processing table: %', table_record.table_name;
      
      -- Dynamic insert to handle different column structures
      EXECUTE format('
        INSERT INTO public.cash_history (
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
          COALESCE(src.account_id, ''''),
          COALESCE(src.account_name, ''Unknown''),
          COALESCE(src.transaction_type, ''expense''),
          COALESCE(src.amount, 0),
          COALESCE(src.description, ''Restored from backup''),
          src.reference_number,
          src.reference_id,
          src.reference_name,
          src.source_type,
          src.type,
          src.user_id,
          src.user_name,
          src.created_by,
          src.created_by_name,
          COALESCE(src.created_at, NOW()),
          src.updated_at
        FROM public.%I src
        WHERE NOT EXISTS (
          SELECT 1 FROM public.cash_history main
          WHERE main.account_id = src.account_id 
          AND main.amount = src.amount 
          AND main.description = src.description
          AND main.created_at = src.created_at
        )', table_record.table_name);
      
      GET DIAGNOSTICS batch_restored = ROW_COUNT;
      total_restored := total_restored + batch_restored;
      
      RAISE NOTICE 'Restored % records from %', batch_restored, table_record.table_name;
      
    EXCEPTION WHEN others THEN
      -- If exact column matching fails, try a more flexible approach
      BEGIN
        RAISE NOTICE 'Standard restore failed for %, trying flexible approach: %', table_record.table_name, SQLERRM;
        
        -- Check if table has basic required columns
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = ''public'' 
          AND table_name = table_record.table_name 
          AND column_name IN (''amount'', ''created_at'')
        ) THEN
          
          EXECUTE format('
            INSERT INTO public.cash_history (
              account_id,
              account_name,
              transaction_type,
              amount,
              description,
              created_at
            )
            SELECT DISTINCT
              COALESCE(src.account_id, ''unknown-account''),
              COALESCE(src.account_name, ''Unknown Account''),
              CASE 
                WHEN COALESCE(src.transaction_type, '''') = '''' THEN ''expense''
                ELSE src.transaction_type 
              END,
              src.amount,
              COALESCE(src.description, ''Restored from '' || ''%''),
              src.created_at
            FROM public.%I src
            WHERE src.amount IS NOT NULL 
            AND src.created_at IS NOT NULL
            AND NOT EXISTS (
              SELECT 1 FROM public.cash_history main
              WHERE main.amount = src.amount 
              AND main.created_at = src.created_at
            )', table_record.table_name, table_record.table_name);
          
          GET DIAGNOSTICS batch_restored = ROW_COUNT;
          total_restored := total_restored + batch_restored;
          
          RAISE NOTICE 'Flexibly restored % records from %', batch_restored, table_record.table_name;
        END IF;
        
      EXCEPTION WHEN others THEN
        RAISE NOTICE 'Could not restore from %: %', table_record.table_name, SQLERRM;
      END;
    END;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '=== RESTORATION COMPLETE ===';
  RAISE NOTICE 'Total records restored: %', total_restored;
  
  -- Show final count and date distribution
  FOR table_record IN (
    SELECT 
      DATE_TRUNC('month', created_at) as month,
      COUNT(*) as count
    FROM public.cash_history 
    GROUP BY DATE_TRUNC('month', created_at)
    ORDER BY month
  )
  LOOP
    RAISE NOTICE 'Final - Month: % - Records: %', table_record.month, table_record.count;
  END LOOP;
  
END $$;