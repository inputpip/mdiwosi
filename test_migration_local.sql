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

-- Step 2: Cek data existing
SELECT 'EXISTING DATA COUNT' as info;

SELECT 
    'transactions' as table_name,
    COUNT(*) as total_records,
    COUNT(*) FILTER (WHERE account_id IS NOT NULL AND total_amount IS NOT NULL) as valid_for_migration,
    MIN(created_at) as oldest,
    MAX(created_at) as newest
FROM transactions
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transactions')

UNION ALL

SELECT 
    'accounts' as table_name,
    COUNT(*) as total_records,
    COUNT(*) FILTER (WHERE name IS NOT NULL) as valid_for_migration,
    MIN(created_at) as oldest,
    MAX(created_at) as newest  
FROM accounts
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'accounts')

UNION ALL

SELECT 
    'cash_history' as table_name,
    COUNT(*) as total_records,
    COUNT(*) as valid_for_migration,
    MIN(created_at) as oldest,
    MAX(created_at) as newest
FROM cash_history
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cash_history')

UNION ALL

SELECT 
    'expenses' as table_name,
    COUNT(*) as total_records,
    COUNT(*) FILTER (WHERE account_id IS NOT NULL AND amount IS NOT NULL) as valid_for_migration,
    MIN(created_at) as oldest,
    MAX(created_at) as newest
FROM expenses  
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expenses');

-- Step 3: Sample data preview (untuk cek kualitas data)
SELECT 'SAMPLE TRANSACTIONS DATA' as info;

SELECT 
    t.id,
    t.account_id,
    a.name as account_name,
    t.total_amount,
    c.name as customer_name,
    t.items_summary,
    t.created_at
FROM transactions t
LEFT JOIN accounts a ON t.account_id = a.id  
LEFT JOIN customers c ON t.customer_id = c.id
WHERE t.account_id IS NOT NULL 
  AND t.total_amount IS NOT NULL
ORDER BY t.created_at DESC
LIMIT 5;

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

SELECT 
    'transactions_already_migrated' as conflict_type,
    COUNT(*) as count
FROM transactions t
WHERE EXISTS (
    SELECT 1 FROM cash_history ch 
    WHERE ch.reference_id = t.id 
    AND ch.type = 'orderan'
)
AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cash_history')

UNION ALL

SELECT 
    'transactions_ready_to_migrate' as conflict_type,
    COUNT(*) as count  
FROM transactions t
WHERE t.account_id IS NOT NULL 
  AND t.total_amount IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM cash_history ch 
    WHERE ch.reference_id = t.id 
    AND ch.type = 'orderan'
  )
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

-- Step 7: Final recommendation
SELECT 'MIGRATION READINESS' as info;

SELECT 
    CASE 
        WHEN (
            EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transactions') AND
            EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'accounts') AND
            (SELECT COUNT(*) FROM transactions WHERE account_id IS NOT NULL AND total_amount IS NOT NULL) > 0
        ) THEN '✅ READY FOR MIGRATION'
        WHEN NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cash_history') 
        THEN '⚠️ NEED TO CREATE CASH_HISTORY TABLE FIRST'
        WHEN (SELECT COUNT(*) FROM transactions WHERE account_id IS NOT NULL AND total_amount IS NOT NULL) = 0
        THEN '📝 NO TRANSACTION DATA TO MIGRATE'
        ELSE '❌ MISSING REQUIRED TABLES'
    END as status,
    (SELECT COUNT(*) FROM transactions WHERE account_id IS NOT NULL AND total_amount IS NOT NULL) as transactions_to_migrate,
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