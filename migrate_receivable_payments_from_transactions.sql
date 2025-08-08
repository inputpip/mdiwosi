-- =====================================================
-- SQL untuk Migrate Pembayaran Piutang Historis
-- (Berdasarkan data transactions, bukan payment_history)
-- =====================================================

-- STEP 1: CEK DATA PEMBAYARAN PIUTANG YANG ADA
-- =====================================================
SELECT 'CHECKING RECEIVABLE PAYMENTS FROM TRANSACTIONS' as status;

-- Cek transaksi yang sudah dibayar sebagian (ada piutang yang dibayar)
SELECT 
  'TRANSACTIONS WITH PAYMENTS' as info,
  COUNT(*) as total_transactions,
  COUNT(CASE WHEN paid_amount > 0 AND paid_amount < total THEN 1 END) as partial_payments,
  COUNT(CASE WHEN paid_amount = total AND payment_status = 'Lunas' THEN 1 END) as full_payments,
  COUNT(CASE WHEN paid_amount = 0 THEN 1 END) as unpaid_transactions
FROM transactions;

-- Sample transaksi dengan pembayaran
SELECT 
  id,
  customer_name,
  total,
  paid_amount,
  payment_status,
  payment_account_id,
  cashier_name,
  created_at
FROM transactions 
WHERE paid_amount > 0
ORDER BY created_at DESC 
LIMIT 10;

-- Cek transaksi yang punya payment_account_id (ada info akun tujuan)
SELECT 
  'TRANSACTIONS WITH PAYMENT ACCOUNT' as info,
  COUNT(*) as transactions_with_payment_account,
  COUNT(CASE WHEN payment_account_id IS NOT NULL AND paid_amount > 0 THEN 1 END) as payments_with_account_info
FROM transactions;

-- STEP 2: MIGRATE PEMBAYARAN DARI TRANSACTIONS
-- =====================================================

-- Migrate pembayaran awal (initial payment)
-- Untuk transaksi yang langsung dibayar sebagian saat order
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
    (SELECT id FROM accounts LIMIT 1)
  ) as account_id,
  COALESCE(
    (SELECT name FROM accounts WHERE id = t.payment_account_id),
    (SELECT name FROM accounts WHERE name ILIKE '%kas%' OR name ILIKE '%tunai%' LIMIT 1),
    'Kas Umum'
  ) as account_name,
  CASE 
    WHEN t.paid_amount >= t.total THEN 'orderan'
    ELSE 'panjar_pelunasan'
  END as type,
  t.paid_amount as amount,
  CASE 
    WHEN t.paid_amount >= t.total THEN CONCAT('Penjualan lunas - ', t.customer_name)
    ELSE CONCAT('Pembayaran piutang (DP) - ', t.customer_name, ' (Order: ', LEFT(t.id::text, 8), ')')
  END as description,
  t.id as reference_id,
  CASE 
    WHEN t.paid_amount >= t.total THEN CONCAT('TXN-', LEFT(t.id::text, 8))
    ELSE CONCAT('PIUTANG-', LEFT(t.id::text, 8))
  END as reference_name,
  t.cashier_id as user_id,
  COALESCE(t.cashier_name, 'System') as user_name,
  t.created_at
FROM transactions t
WHERE t.paid_amount > 0
  AND NOT EXISTS (
    SELECT 1 FROM cash_history ch 
    WHERE ch.reference_id = t.id::text 
      AND (ch.type = 'orderan' OR ch.type = 'panjar_pelunasan')
      AND ABS(ch.amount - t.paid_amount) < 1  -- Allow for small rounding differences
  );

-- Migrate pelunasan piutang (hanya untuk transaksi lunas dengan sisa pembayaran)
-- Ini untuk transaksi yang total > paid_amount tapi statusnya 'Lunas'
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
    (SELECT id FROM accounts LIMIT 1)
  ) as account_id,
  COALESCE(
    (SELECT name FROM accounts WHERE id = t.payment_account_id),
    (SELECT name FROM accounts WHERE name ILIKE '%kas%' OR name ILIKE '%tunai%' LIMIT 1),
    'Kas Umum'
  ) as account_name,
  'panjar_pelunasan' as type,
  (t.total - t.paid_amount) as amount, -- Sisa yang belum dibayar
  CONCAT('Pelunasan piutang - ', t.customer_name, ' (Order: ', LEFT(t.id::text, 8), ')') as description,
  t.id as reference_id,
  CONCAT('LUNAS-', LEFT(t.id::text, 8)) as reference_name,
  t.cashier_id as user_id,
  COALESCE(t.cashier_name, 'System') as user_name,
  t.created_at + INTERVAL '1 hour' as created_at -- Simulasi waktu pelunasan (1 jam setelah order)
FROM transactions t
WHERE t.payment_status = 'Lunas'
  AND t.total > t.paid_amount  -- Masih ada sisa yang perlu dibayar
  AND t.paid_amount > 0        -- Sudah ada pembayaran sebelumnya
  AND (t.total - t.paid_amount) > 0  -- Pastikan ada sisa positif
  AND NOT EXISTS (
    SELECT 1 FROM cash_history ch 
    WHERE ch.reference_id = t.id::text 
      AND ch.type = 'panjar_pelunasan'
      AND ABS(ch.amount - (t.total - t.paid_amount)) < 1
  );

-- STEP 3: LAPORAN HASIL MIGRATION
-- =====================================================

SELECT 
  'HASIL MIGRATION PEMBAYARAN PIUTANG' as status,
  (SELECT COUNT(*) FROM cash_history WHERE type = 'panjar_pelunasan') as total_pembayaran_piutang,
  (SELECT COUNT(*) FROM cash_history WHERE type = 'orderan') as total_penjualan_lunas,
  (SELECT SUM(amount) FROM cash_history WHERE type = 'panjar_pelunasan') as total_nominal_piutang,
  (SELECT COUNT(DISTINCT account_id) FROM cash_history WHERE type IN ('panjar_pelunasan', 'orderan')) as akun_yang_digunakan;

-- Sample pembayaran piutang yang ter-migrate
SELECT 
  'SAMPLE PEMBAYARAN PIUTANG HASIL MIGRATION:' as info,
  account_name,
  type,
  amount,
  description,
  DATE(created_at) as tanggal
FROM cash_history 
WHERE type = 'panjar_pelunasan'
ORDER BY created_at DESC 
LIMIT 10;

-- Ringkasan per akun untuk pembayaran piutang
SELECT 
  'RINGKASAN PEMBAYARAN PIUTANG PER AKUN:' as info,
  account_name,
  COUNT(*) as jumlah_pembayaran,
  SUM(amount) as total_diterima
FROM cash_history 
WHERE type = 'panjar_pelunasan'
GROUP BY account_name, account_id
ORDER BY total_diterima DESC;

-- Cek transaksi yang masih punya piutang belum terbayar
SELECT 
  'PIUTANG YANG MASIH OUTSTANDING:' as info,
  COUNT(*) as jumlah_transaksi,
  SUM(total - paid_amount) as total_piutang_outstanding
FROM transactions 
WHERE payment_status != 'Lunas' 
  AND total > paid_amount 
  AND total > 0;

SELECT 'MIGRATION PEMBAYARAN PIUTANG DARI TRANSACTIONS COMPLETED!' as final_status;