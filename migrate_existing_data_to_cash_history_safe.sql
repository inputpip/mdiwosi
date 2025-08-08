-- =====================================================
-- MIGRASI DATA EXISTING KE CASH_HISTORY - SAFE VERSION
-- =====================================================
-- Script ini untuk memigrate data yang sudah ada sebelum 
-- implementasi sistem laporan keuangan yang baru
-- 
-- PENTING: TEST DI LOKAL DULU SEBELUM RUN DI PRODUCTION!
-- =====================================================

-- Step 1: Buat backup tabel cash_history yang sudah ada (jika ada)
DO $$ 
BEGIN
    -- Cek apakah tabel cash_history_backup sudah ada
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'cash_history_backup') THEN
        DROP TABLE cash_history_backup;
    END IF;
    
    -- Backup cash_history yang sudah ada
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'cash_history') THEN
        CREATE TABLE cash_history_backup AS SELECT * FROM cash_history;
        RAISE NOTICE 'Backup cash_history created with % records', (SELECT COUNT(*) FROM cash_history_backup);
    END IF;
END $$;

-- Step 2: Pastikan tabel cash_history ada dan struktur benar
CREATE TABLE IF NOT EXISTS cash_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    account_name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN (
        'orderan',
        'kas_masuk_manual', 
        'kas_keluar_manual',
        'panjar_pengambilan',
        'panjar_pelunasan',
        'pengeluaran',
        'pembayaran_po',
        'pemutihan_piutang',
        'transfer_masuk',
        'transfer_keluar'
    )),
    amount DECIMAL(15,2) NOT NULL,
    description TEXT NOT NULL,
    reference_id UUID,
    reference_name TEXT,
    user_id UUID,
    user_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Fungsi helper untuk mendapatkan nama user
CREATE OR REPLACE FUNCTION get_user_name_safe(user_uuid UUID)
RETURNS TEXT AS $$
BEGIN
    RETURN COALESCE(
        (SELECT name FROM profiles WHERE id = user_uuid LIMIT 1),
        (SELECT email FROM auth.users WHERE id = user_uuid LIMIT 1),
        'Unknown User'
    );
EXCEPTION WHEN OTHERS THEN
    RETURN 'System';
END;
$$ LANGUAGE plpgsql;

-- Step 4: Fungsi helper untuk mendapatkan nama account
CREATE OR REPLACE FUNCTION get_account_name_safe(account_uuid UUID)
RETURNS TEXT AS $$
BEGIN
    RETURN COALESCE(
        (SELECT name FROM accounts WHERE id = account_uuid LIMIT 1),
        'Unknown Account'
    );
EXCEPTION WHEN OTHERS THEN
    RETURN 'Unknown Account';
END;
$$ LANGUAGE plpgsql;

-- Step 5: PREVIEW - Lihat data yang akan dimigrate (JANGAN DIHAPUS - UNTUK TEST)
-- Uncomment baris ini untuk preview sebelum migrate actual
/*
SELECT 'PREVIEW MIGRATION DATA' as info;

-- Preview Transactions yang akan jadi cash_history
SELECT 
    'transactions -> cash_history' as source,
    t.id as reference_id,
    t.account_id,
    get_account_name_safe(t.account_id) as account_name,
    'orderan' as type,
    t.total_amount as amount,
    CONCAT('Transaksi dari ', COALESCE(c.name, 'Customer'), ' - ', COALESCE(t.items_summary, 'Transaction')) as description,
    t.created_by as user_id,
    get_user_name_safe(t.created_by) as user_name,
    t.created_at,
    COUNT(*) OVER() as total_records
FROM transactions t
LEFT JOIN customers c ON t.customer_id = c.id
WHERE t.account_id IS NOT NULL
  AND t.total_amount IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM cash_history ch 
    WHERE ch.reference_id = t.id 
    AND ch.type = 'orderan'
  )
ORDER BY t.created_at DESC
LIMIT 10;

-- Preview Manual Cash In/Out (jika ada tabel)
SELECT 
    'manual_cash -> cash_history' as source,
    mc.id as reference_id,
    mc.account_id,
    get_account_name_safe(mc.account_id) as account_name,
    CASE 
        WHEN mc.amount > 0 THEN 'kas_masuk_manual'
        ELSE 'kas_keluar_manual'
    END as type,
    mc.amount,
    COALESCE(mc.description, 'Manual cash transaction') as description,
    mc.created_by as user_id,
    get_user_name_safe(mc.created_by) as user_name,
    mc.created_at,
    COUNT(*) OVER() as total_records
FROM manual_cash mc
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'manual_cash')
  AND NOT EXISTS (
    SELECT 1 FROM cash_history ch 
    WHERE ch.reference_id = mc.id 
    AND ch.type IN ('kas_masuk_manual', 'kas_keluar_manual')
  )
ORDER BY mc.created_at DESC
LIMIT 5;

-- Summary counts
SELECT 
    'MIGRATION SUMMARY' as info,
    (SELECT COUNT(*) FROM transactions WHERE account_id IS NOT NULL AND total_amount IS NOT NULL 
     AND NOT EXISTS (SELECT 1 FROM cash_history ch WHERE ch.reference_id = transactions.id AND ch.type = 'orderan')
    ) as transactions_to_migrate,
    (SELECT COUNT(*) FROM cash_history) as current_cash_history_records;
*/

-- Step 6: ACTUAL MIGRATION - Migrate Transactions to Cash History
-- Uncomment untuk run actual migration
/*
INSERT INTO cash_history (
    account_id,
    account_name, 
    type,
    amount,
    description,
    reference_id,
    reference_name,
    user_id,
    user_name,
    created_at,
    updated_at
)
SELECT 
    t.account_id,
    get_account_name_safe(t.account_id),
    'orderan',
    t.total_amount,
    CONCAT('Transaksi dari ', COALESCE(c.name, 'Customer'), ' - ', COALESCE(t.items_summary, 'Transaction')),
    t.id,
    COALESCE(c.name, 'Unknown Customer'),
    t.created_by,
    get_user_name_safe(t.created_by),
    t.created_at,
    t.updated_at
FROM transactions t
LEFT JOIN customers c ON t.customer_id = c.id
WHERE t.account_id IS NOT NULL
  AND t.total_amount IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM cash_history ch 
    WHERE ch.reference_id = t.id 
    AND ch.type = 'orderan'
  );

-- Log hasil migration
DO $$
DECLARE
    migrated_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO migrated_count 
    FROM cash_history 
    WHERE type = 'orderan' 
    AND created_at >= (CURRENT_TIMESTAMP - INTERVAL '1 minute');
    
    RAISE NOTICE 'Migrated % transaction records to cash_history', migrated_count;
END $$;
*/

-- Step 7: OPTIONAL - Migrate Expenses jika ada tabel expenses
-- Uncomment jika ingin migrate expenses juga
/*
INSERT INTO cash_history (
    account_id,
    account_name,
    type, 
    amount,
    description,
    reference_id,
    reference_name,
    user_id,
    user_name,
    created_at,
    updated_at
)
SELECT 
    e.account_id,
    get_account_name_safe(e.account_id),
    'pengeluaran',
    -ABS(e.amount), -- Negatif untuk pengeluaran
    COALESCE(e.description, e.category, 'Pengeluaran'),
    e.id,
    e.category,
    e.created_by,
    get_user_name_safe(e.created_by),
    e.created_at,
    e.updated_at
FROM expenses e
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expenses')
  AND e.account_id IS NOT NULL
  AND e.amount IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM cash_history ch 
    WHERE ch.reference_id = e.id 
    AND ch.type = 'pengeluaran'
  );
*/

-- Step 8: OPTIONAL - Migrate Manual Cash Transactions jika ada
-- Uncomment jika ada tabel manual cash transactions
/*
INSERT INTO cash_history (
    account_id,
    account_name,
    type,
    amount, 
    description,
    reference_id,
    reference_name,
    user_id,
    user_name,
    created_at,
    updated_at
)
SELECT 
    mc.account_id,
    get_account_name_safe(mc.account_id),
    CASE 
        WHEN mc.amount > 0 THEN 'kas_masuk_manual'
        ELSE 'kas_keluar_manual'
    END,
    mc.amount,
    COALESCE(mc.description, 'Manual cash transaction'),
    mc.id,
    mc.note,
    mc.created_by,
    get_user_name_safe(mc.created_by),
    mc.created_at,
    mc.updated_at
FROM manual_cash_transactions mc
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'manual_cash_transactions')
  AND mc.account_id IS NOT NULL
  AND mc.amount IS NOT NULL  
  AND NOT EXISTS (
    SELECT 1 FROM cash_history ch 
    WHERE ch.reference_id = mc.id 
    AND ch.type IN ('kas_masuk_manual', 'kas_keluar_manual')
  );
*/

-- Step 9: Cleanup functions setelah migration
-- DROP FUNCTION IF EXISTS get_user_name_safe(UUID);
-- DROP FUNCTION IF EXISTS get_account_name_safe(UUID);

-- Step 10: Verifikasi hasil migration
-- Uncomment untuk cek hasil
/*
SELECT 
    'MIGRATION RESULTS' as info,
    type,
    COUNT(*) as count,
    MIN(created_at) as oldest_record,
    MAX(created_at) as newest_record
FROM cash_history
GROUP BY type
ORDER BY count DESC;

-- Cek beberapa sample data
SELECT 
    'SAMPLE MIGRATED DATA' as info,
    account_name,
    type,
    amount,
    description,
    user_name,
    created_at
FROM cash_history
ORDER BY created_at DESC
LIMIT 10;
*/

-- =====================================================
-- INSTRUCTIONS FOR USE:
-- =====================================================
-- 1. TEST DI LOKAL DULU:
--    - Uncomment section "PREVIEW" dulu untuk lihat data
--    - Pastikan data preview sesuai ekspektasi
--    
-- 2. RUN MIGRATION:  
--    - Uncomment section "ACTUAL MIGRATION" untuk migrate
--    - Uncomment "OPTIONAL" sections sesuai kebutuhan
--    - Uncomment "VERIFIKASI" untuk cek hasil
--
-- 3. BACKUP:
--    - Script otomatis buat backup di cash_history_backup
--    - Jika ada masalah: DROP cash_history; ALTER TABLE cash_history_backup RENAME TO cash_history;
--
-- 4. CLEANUP:
--    - Uncomment cleanup functions setelah yakin migration OK
--    - DROP TABLE cash_history_backup; (setelah yakin)
-- =====================================================