-- =====================================================
-- SQL ULTRA AMAN: Cek Struktur DB + Migrate Data Real
-- =====================================================

-- STEP 1: DIAGNOSIS LENGKAP - CEK STRUKTUR DATABASE
-- =====================================================
SELECT '=== CHECKING DATABASE STRUCTURE ===' as info;

-- Cek tabel yang ada
SELECT 'AVAILABLE TABLES:' as info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('transactions', 'expenses', 'accounts', 'cash_history')
ORDER BY table_name;

-- Cek kolom di tabel transactions
SELECT 'TRANSACTIONS TABLE COLUMNS:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'transactions' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Cek kolom di tabel expenses (jika ada)
SELECT 'EXPENSES TABLE COLUMNS:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'expenses' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Cek sample data transactions
SELECT 'SAMPLE TRANSACTIONS DATA:' as info;
SELECT id, customer_name, cashier_name, paid_amount, status, payment_status, created_at 
FROM transactions 
WHERE paid_amount > 0 
ORDER BY created_at DESC 
LIMIT 5;

-- STEP 2: HAPUS TEST DATA
-- =====================================================
DELETE FROM cash_history 
WHERE description ILIKE '%test%' 
   OR description ILIKE '%banner promosi%'
   OR description ILIKE '%setoran awal%'
   OR description ILIKE '%pembelian supplies%'
   OR user_name = 'Test User'
   OR user_name ILIKE '%zakiy%';

SELECT 'SETELAH PEMBERSIHAN:' as info, COUNT(*) as total_records FROM cash_history;

-- STEP 3: MIGRATE TRANSACTIONS (PENJUALAN) - SIMPLE VERSION
-- =====================================================

-- Migrate penjualan dengan kolom yang pasti ada
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
  created_at
)
SELECT 
  COALESCE(
    (SELECT id FROM accounts WHERE name ILIKE '%kas%' OR name ILIKE '%tunai%' LIMIT 1),
    (SELECT id FROM accounts LIMIT 1)
  ) as account_id,
  COALESCE(
    (SELECT name FROM accounts WHERE name ILIKE '%kas%' OR name ILIKE '%tunai%' LIMIT 1),
    'Kas Umum'
  ) as account_name,
  'orderan' as type,
  t.paid_amount as amount,
  CONCAT('Penjualan - ', t.customer_name, ' - ', DATE(t.created_at)) as description,
  t.id as reference_id,
  CONCAT('TXN-', LEFT(t.id::text, 8)) as reference_name,
  NULL as user_id, -- Biarkan NULL dulu
  COALESCE(t.cashier_name, 'System') as user_name,
  t.created_at
FROM transactions t
WHERE t.paid_amount > 0
  AND t.paid_amount IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM cash_history ch 
    WHERE ch.reference_id = t.id::text AND ch.type = 'orderan'
  );

-- STEP 4: MIGRATE EXPENSES (HANYA JIKA TABEL ADA) - SIMPLE VERSION
-- =====================================================

-- Cek dulu apakah tabel expenses ada dan punya data
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expenses' AND table_schema = 'public') THEN
    -- Migrate expenses dengan kolom minimal
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
      created_at
    )
    SELECT 
      COALESCE(
        (SELECT id FROM accounts WHERE name ILIKE '%kas%' OR name ILIKE '%tunai%' LIMIT 1),
        (SELECT id FROM accounts LIMIT 1)
      ) as account_id,
      COALESCE(
        (SELECT name FROM accounts WHERE name ILIKE '%kas%' OR name ILIKE '%tunai%' LIMIT 1),
        'Kas Umum'
      ) as account_name,
      'pengeluaran' as type,
      -e.amount as amount, -- Negative untuk pengeluaran
      CONCAT('[Pengeluaran] ', e.description) as description,
      e.id as reference_id,
      CONCAT('EXP-', LEFT(e.id::text, 8)) as reference_name,
      NULL as user_id,
      'System' as user_name,
      e.created_at
    FROM expenses e
    WHERE e.amount > 0
      AND NOT EXISTS (
        SELECT 1 FROM cash_history ch 
        WHERE ch.reference_id = e.id::text AND ch.type = 'pengeluaran'
      );
  END IF;
END $$;

-- STEP 5: LAPORAN HASIL
-- =====================================================

-- Ringkasan migration
SELECT 
  'HASIL MIGRATION:' as info,
  (SELECT COUNT(*) FROM cash_history WHERE type = 'orderan') as penjualan_records,
  (SELECT COUNT(*) FROM cash_history WHERE type = 'pengeluaran') as pengeluaran_records,
  (SELECT COUNT(*) FROM cash_history) as total_records;

-- Total kas
SELECT 
  'TOTAL KAS:' as info,
  SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as kas_masuk,
  SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as kas_keluar,
  SUM(amount) as saldo_bersih
FROM cash_history;

-- Sample data hasil migration
SELECT 
  'SAMPLE HASIL:' as info,
  account_name,
  type,
  amount,
  description,
  DATE(created_at) as tanggal
FROM cash_history 
WHERE type IN ('orderan', 'pengeluaran')
ORDER BY created_at DESC 
LIMIT 10;

SELECT 'MIGRATION COMPLETED SUCCESSFULLY!' as final_status;