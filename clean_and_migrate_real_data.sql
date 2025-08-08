-- =====================================================
-- SQL LENGKAP: Hapus Test Data & Migrate Data Real
-- =====================================================

-- STEP 1: HAPUS SEMUA TEST DATA
-- =====================================================
DELETE FROM cash_history 
WHERE description LIKE '%Test%' 
   OR description LIKE '%test%'
   OR description LIKE '%banner promosi%'
   OR description LIKE '%setoran awal%'
   OR description LIKE '%pembelian supplies%';

-- Hapus semua data test (aman)
DELETE FROM cash_history WHERE user_name = 'Test User';
DELETE FROM cash_history WHERE description LIKE '%Test%';

-- Tampilkan sisa data setelah pembersihan
SELECT 'SETELAH PEMBERSIHAN' as status, COUNT(*) as total_records FROM cash_history;

-- =====================================================
-- STEP 2: MIGRATE DATA REAL DARI DATABASE
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
  AND (t.status ILIKE '%selesai%' OR t.status ILIKE '%lunas%' OR t.payment_status = 'Lunas')
  AND NOT EXISTS (
    SELECT 1 FROM cash_history ch 
    WHERE ch.reference_id = t.id::text AND ch.type = 'orderan'
  );

-- B. Migrate dari ACCOUNT_TRANSFERS (Transfer Antar Akun)
-- Transfer KELUAR (dari akun sumber)
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
  at.from_account_id,
  (SELECT name FROM accounts WHERE id = at.from_account_id),
  'transfer_keluar' as type,
  -at.amount as amount,
  CONCAT('Transfer ke ', (SELECT name FROM accounts WHERE id = at.to_account_id), ' - ', at.description) as description,
  at.id as reference_id,
  CONCAT('TRF-OUT-', SUBSTRING(at.id::text, 1, 8)) as reference_name,
  at.user_id,
  at.user_name,
  at.created_at
FROM account_transfers at
WHERE at.amount > 0
  AND NOT EXISTS (
    SELECT 1 FROM cash_history ch 
    WHERE ch.reference_id = at.id::text AND ch.type = 'transfer_keluar'
  );

-- Transfer MASUK (ke akun tujuan)
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
  at.to_account_id,
  (SELECT name FROM accounts WHERE id = at.to_account_id),
  'transfer_masuk' as type,
  at.amount as amount,
  CONCAT('Transfer dari ', (SELECT name FROM accounts WHERE id = at.from_account_id), ' - ', at.description) as description,
  at.id as reference_id,
  CONCAT('TRF-IN-', SUBSTRING(at.id::text, 1, 8)) as reference_name,
  at.user_id,
  at.user_name,
  at.created_at
FROM account_transfers at
WHERE at.amount > 0
  AND NOT EXISTS (
    SELECT 1 FROM cash_history ch 
    WHERE ch.reference_id = at.id::text AND ch.type = 'transfer_masuk'
  );

-- C. Migrate dari EXPENSES (Pengeluaran/Biaya)
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
  AND NOT EXISTS (
    SELECT 1 FROM cash_history ch 
    WHERE ch.reference_id = e.id::text AND ch.type = 'pengeluaran'
  );

-- =====================================================
-- STEP 3: LAPORAN HASIL MIGRATION
-- =====================================================

-- Tampilkan ringkasan migration
SELECT 
  'HASIL MIGRATION' as status,
  (SELECT COUNT(*) FROM cash_history WHERE type = 'orderan') as total_penjualan,
  (SELECT COUNT(*) FROM cash_history WHERE type = 'transfer_masuk') as total_transfer_masuk,
  (SELECT COUNT(*) FROM cash_history WHERE type = 'transfer_keluar') as total_transfer_keluar,
  (SELECT COUNT(*) FROM cash_history WHERE type = 'pengeluaran') as total_pengeluaran,
  (SELECT COUNT(*) FROM cash_history) as total_semua_record;

-- Tampilkan total kas masuk dan keluar
SELECT 
  'RINGKASAN KAS' as jenis,
  SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as total_kas_masuk,
  SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as total_kas_keluar,
  SUM(amount) as saldo_bersih
FROM cash_history;

-- Tampilkan 10 transaksi terbaru
SELECT 
  'SAMPLE DATA TERBARU' as info,
  account_name,
  type,
  amount,
  description,
  created_at
FROM cash_history 
ORDER BY created_at DESC 
LIMIT 10;

-- Tampilkan ringkasan per akun
SELECT 
  account_name,
  COUNT(*) as jumlah_transaksi,
  SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as total_masuk,
  SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as total_keluar,
  SUM(amount) as saldo_bersih
FROM cash_history 
GROUP BY account_name
ORDER BY saldo_bersih DESC;

-- =====================================================
-- SELESAI!
-- =====================================================
SELECT 'MIGRATION COMPLETED SUCCESSFULLY!' as final_status;