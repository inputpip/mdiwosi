-- =====================================================
-- SQL AMAN: Hapus Test Data & Migrate Data Real
-- (Hanya migrate dari tabel yang ada)
-- =====================================================

-- STEP 1: CEK TABEL YANG ADA
-- =====================================================
SELECT 'CHECKING AVAILABLE TABLES' as status;

SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('transactions', 'expenses', 'account_transfers', 'accounts', 'cash_history')
ORDER BY table_name;

-- STEP 2: HAPUS SEMUA TEST DATA
-- =====================================================
DELETE FROM cash_history 
WHERE description ILIKE '%test%' 
   OR description ILIKE '%banner promosi%'
   OR description ILIKE '%setoran awal%'
   OR description ILIKE '%pembelian supplies%'
   OR user_name = 'Test User'
   OR user_name = 'Mutashim Zakiy'; -- Hapus data test user

-- Tampilkan sisa data setelah pembersihan
SELECT 'SETELAH PEMBERSIHAN' as status, COUNT(*) as total_records FROM cash_history;

-- =====================================================
-- STEP 3: MIGRATE HANYA DARI TRANSACTIONS (PENJUALAN)
-- =====================================================

-- A. Migrate dari TRANSACTIONS (Penjualan Real)
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
    t.payment_account_id,
    (SELECT id FROM accounts WHERE name ILIKE '%kas%' OR name ILIKE '%tunai%' LIMIT 1),
    (SELECT id FROM accounts WHERE type = 'Aset' LIMIT 1)
  ) as account_id,
  COALESCE(
    (SELECT name FROM accounts WHERE id = t.payment_account_id),
    (SELECT name FROM accounts WHERE name ILIKE '%kas%' OR name ILIKE '%tunai%' LIMIT 1),
    'Kas Umum'
  ) as account_name,
  'orderan' as type,
  t.paid_amount as amount,
  CONCAT('Penjualan - ', t.customer_name, ' (', DATE(t.created_at), ')') as description,
  t.id as reference_id,
  CONCAT('TXN-', SUBSTRING(t.id::text, 1, 8)) as reference_name,
  t.cashier_id as user_id,
  t.cashier_name as user_name,
  t.created_at
FROM transactions t
WHERE t.paid_amount > 0
  AND t.paid_amount IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM cash_history ch 
    WHERE ch.reference_id = t.id::text AND ch.type = 'orderan'
  );

-- B. Migrate dari EXPENSES (Pengeluaran/Biaya) - JIKA ADA
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
    (SELECT id FROM accounts WHERE type = 'Aset' LIMIT 1)
  ) as account_id,
  COALESCE(
    (SELECT name FROM accounts WHERE name ILIKE '%kas%' OR name ILIKE '%tunai%' LIMIT 1),
    'Kas Umum'
  ) as account_name,
  'pengeluaran' as type,
  -e.amount as amount, -- Negative untuk pengeluaran
  CONCAT('[', COALESCE(e.category, 'Lainnya'), '] ', e.description) as description,
  e.id as reference_id,
  CONCAT('EXP-', SUBSTRING(e.id::text, 1, 8)) as reference_name,
  e.user_id,
  COALESCE(e.user_name, 'System') as user_name,
  e.created_at
FROM expenses e
WHERE e.amount > 0
  AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expenses' AND table_schema = 'public')
  AND NOT EXISTS (
    SELECT 1 FROM cash_history ch 
    WHERE ch.reference_id = e.id::text AND ch.type = 'pengeluaran'
  );

-- =====================================================
-- STEP 4: LAPORAN HASIL MIGRATION
-- =====================================================

-- Tampilkan ringkasan migration
SELECT 
  'HASIL MIGRATION' as status,
  (SELECT COUNT(*) FROM cash_history WHERE type = 'orderan') as total_penjualan,
  (SELECT COUNT(*) FROM cash_history WHERE type = 'pengeluaran') as total_pengeluaran,
  (SELECT COUNT(*) FROM cash_history WHERE type LIKE '%manual%') as total_kas_manual,
  (SELECT COUNT(*) FROM cash_history) as total_semua_record;

-- Tampilkan total kas masuk dan keluar
SELECT 
  'RINGKASAN KAS' as jenis,
  SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as total_kas_masuk,
  SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as total_kas_keluar,
  SUM(amount) as saldo_bersih
FROM cash_history;

-- Tampilkan 15 transaksi terbaru untuk verifikasi
SELECT 
  account_name,
  type,
  amount,
  description,
  user_name,
  DATE(created_at) as tanggal
FROM cash_history 
ORDER BY created_at DESC 
LIMIT 15;

-- Tampilkan ringkasan per bulan
SELECT 
  DATE_TRUNC('month', created_at) as bulan,
  COUNT(*) as jumlah_transaksi,
  SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as kas_masuk,
  SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as kas_keluar,
  SUM(amount) as net_cash
FROM cash_history 
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY bulan DESC
LIMIT 12;

-- =====================================================
-- SELESAI!
-- =====================================================
SELECT 'SAFE MIGRATION COMPLETED!' as final_status;