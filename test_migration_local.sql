-- =====================================================
-- TESTING MIGRATION SCRIPT - RUN DI LOKAL DULU
-- =====================================================
-- Script ini untuk testing di environment lokal sebelum 
-- deploy ke production
-- =====================================================

-- Step 1: Cek struktur database yang ada
SELECT 'DATABASE STRUCTURE CHECK' as info;

-- Cek tabel-tabel yang ada
SELECT 
    table_name,
    CASE 
        WHEN table_name IN ('transactions', 'accounts', 'customers') THEN '✅ CORE'
        WHEN table_name IN ('cash_history') THEN '✅ NEW'
        WHEN table_name IN ('expenses', 'manual_cash', 'manual_cash_transactions') THEN '⚠️ OPTIONAL'
        ELSE '📝 OTHER'
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public'
AND table_name IN (
    'transactions', 'accounts', 'customers', 'cash_history', 
    'expenses', 'manual_cash', 'manual_cash_transactions', 'profiles'
)
ORDER BY 
    CASE 
        WHEN table_name IN ('transactions', 'accounts', 'customers') THEN 1
        WHEN table_name IN ('cash_history') THEN 2
        ELSE 3
    END;

-- Step 2: Cek data existing (Safe version - detect columns first)
SELECT 'EXISTING DATA COUNT' as info;

-- Check transactions table with dynamic column detection
DO $$
DECLARE
    account_col TEXT := NULL;
    amount_col TEXT := NULL;
    created_col TEXT := NULL;
    sql_query TEXT;
BEGIN
    -- Find account-related column
    SELECT column_name INTO account_col 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'transactions'
      AND (column_name LIKE '%account%' OR column_name = 'payment_method_id')
    LIMIT 1;
    
    -- Find amount column
    SELECT column_name INTO amount_col
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'transactions'  
      AND (column_name LIKE '%total%' OR column_name LIKE '%amount%')
    LIMIT 1;
    
    -- Find created_at column
    SELECT column_name INTO created_col
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'transactions'
      AND (column_name = 'created_at' OR column_name LIKE '%created%' OR column_name = 'timestamp')
    LIMIT 1;

    RAISE NOTICE 'TRANSACTIONS TABLE ANALYSIS:';
    RAISE NOTICE '- Account column found: %', COALESCE(account_col, 'NOT FOUND');
    RAISE NOTICE '- Amount column found: %', COALESCE(amount_col, 'NOT FOUND'); 
    RAISE NOTICE '- Created column found: %', COALESCE(created_col, 'NOT FOUND');
END $$;

-- Safe count for transactions
SELECT 
    'transactions' as table_name,
    COUNT(*) as total_records,
    'Check console for column analysis' as note
FROM transactions
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transactions')

UNION ALL

-- Safe count for accounts
SELECT 
    'accounts' as table_name,
    COUNT(*) as total_records,
    'Table exists' as note
FROM accounts
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'accounts')

UNION ALL

-- Safe count for cash_history 
SELECT 
    'cash_history' as table_name,
    COUNT(*) as total_records,
    'New table' as note
FROM cash_history
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cash_history')

UNION ALL

-- Safe count for customers
SELECT 
    'customers' as table_name,
    COUNT(*) as total_records,
    'Customer data' as note
FROM customers
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers');

-- Step 3: Sample data preview (safe version without assuming columns)
SELECT 'SAMPLE TRANSACTIONS DATA' as info;

-- Get first few transactions to see actual structure  
SELECT *
FROM transactions 
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transactions')
ORDER BY 
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'created_at'
  ) THEN created_at ELSE NULL END DESC
LIMIT 3;

-- Step 4: Cek apakah sudah ada data di cash_history  
SELECT 'EXISTING CASH HISTORY' as info;

SELECT 
    type,
    COUNT(*) as count,
    MIN(amount) as min_amount,
    MAX(amount) as max_amount,
    MIN(created_at) as oldest,
    MAX(created_at) as newest
FROM cash_history
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cash_history')
GROUP BY type
ORDER BY count DESC;

-- Step 5: Identifikasi conflicts (data yang sudah ada di cash_history)
SELECT 'MIGRATION CONFLICTS CHECK' as info;

-- Safe conflict check without assuming column structure
SELECT 
    'transactions_total' as conflict_type,
    COUNT(*) as count
FROM transactions t
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transactions')

UNION ALL

SELECT 
    'cash_history_total' as conflict_type,
    COUNT(*) as count  
FROM cash_history ch
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cash_history')

UNION ALL

SELECT 
    'cash_history_orderan_type' as conflict_type,
    COUNT(*) as count  
FROM cash_history ch
WHERE ch.type = 'orderan'
  AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cash_history');

-- Step 6: Cek user dan profile data
SELECT 'USER DATA CHECK' as info;

SELECT 
    'auth_users' as source,
    COUNT(*) as total
FROM auth.users
WHERE EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'auth')

UNION ALL

SELECT 
    'profiles' as source,
    COUNT(*) as total
FROM profiles
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles');

-- Step 7: Final recommendation (safe version)
SELECT 'MIGRATION READINESS' as info;

SELECT 
    CASE 
        WHEN (
            EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transactions') AND
            EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'accounts') AND
            (SELECT COUNT(*) FROM transactions) > 0
        ) THEN '✅ BASIC TABLES READY - Need to check column structure'
        WHEN NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cash_history') 
        THEN '⚠️ NEED TO CREATE CASH_HISTORY TABLE FIRST'
        WHEN (SELECT COUNT(*) FROM transactions) = 0
        THEN '📝 NO TRANSACTION DATA TO MIGRATE'
        ELSE '❌ MISSING REQUIRED TABLES'
    END as status,
    (SELECT COUNT(*) FROM transactions WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transactions')) as total_transactions,
    (SELECT COUNT(*) FROM cash_history WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cash_history')) as current_cash_history_records;

-- =====================================================
-- TESTING CHECKLIST:
-- =====================================================
-- ✅ 1. Jalankan script ini di lokal
-- ✅ 2. Pastikan semua tabel core ada (transactions, accounts, customers)  
-- ✅ 3. Cek jumlah data yang akan dimigrate
-- ✅ 4. Pastikan tidak ada conflict (data sudah ada di cash_history)
-- ✅ 5. Jika semua OK, lanjut ke migrate_existing_data_to_cash_history_safe.sql
-- =====================================================