-- =====================================================
-- SQL SEDERHANA: Migrate Pembayaran Piutang dari Transactions
-- (Tanpa kolom updated_at yang tidak ada)
-- =====================================================

-- STEP 1: CEK STRUKTUR TRANSACTIONS
-- =====================================================
SELECT 'CHECKING TRANSACTIONS STRUCTURE' as status;

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'transactions' AND table_schema = 'public'
ORDER BY ordinal_position;

-- STEP 2: CEK DATA PEMBAYARAN
-- =====================================================

-- Cek transaksi dengan pembayaran
SELECT 
  'PAYMENT ANALYSIS' as info,
  COUNT(*) as total_transactions,
  COUNT(CASE WHEN paid_amount > 0 THEN 1 END) as transactions_with_payments,
  COUNT(CASE WHEN paid_amount > 0 AND paid_amount < total THEN 1 END) as partial_payments,
  COUNT(CASE WHEN paid_amount >= total THEN 1 END) as full_payments
FROM transactions;

-- Sample data transaksi dengan pembayaran
SELECT 
  id,
  customer_name,
  total,
  paid_amount,
  payment_status,
  payment_account_id,
  created_at
FROM transactions 
WHERE paid_amount > 0
ORDER BY created_at DESC 
LIMIT 10;

-- STEP 3: MIGRATE PEMBAYARAN SEDERHANA
-- =====================================================

-- Hanya migrate pembayaran yang jelas (ada paid_amount > 0)
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
    (SELECT id FROM accounts WHERE name ILIKE '%kas%' LIMIT 1),
    (SELECT id FROM accounts LIMIT 1)
  ) as account_id,
  COALESCE(
    (SELECT name FROM accounts WHERE id = t.payment_account_id),
    (SELECT name FROM accounts WHERE name ILIKE '%kas%' LIMIT 1),
    'Kas Umum'
  ) as account_name,
  CASE 
    WHEN t.paid_amount >= t.total THEN 'orderan'
    ELSE 'panjar_pelunasan'
  END as type,
  t.paid_amount as amount,
  CASE 
    WHEN t.paid_amount >= t.total THEN 
      CONCAT('Penjualan lunas - ', t.customer_name, ' (', DATE(t.created_at), ')')
    ELSE 
      CONCAT('Pembayaran piutang - ', t.customer_name, ' (DP Order: ', LEFT(t.id::text, 8), ')')
  END as description,
  t.id as reference_id,
  CONCAT('PAY-', LEFT(t.id::text, 8)) as reference_name,
  t.cashier_id as user_id,
  COALESCE(t.cashier_name, 'System') as user_name,
  t.created_at
FROM transactions t
WHERE t.paid_amount > 0
  AND NOT EXISTS (
    SELECT 1 FROM cash_history ch 
    WHERE ch.reference_id = t.id::text 
      AND ABS(ch.amount - t.paid_amount) < 1
  );

-- STEP 4: LAPORAN HASIL
-- =====================================================

SELECT 
  'HASIL MIGRATION' as status,
  (SELECT COUNT(*) FROM cash_history WHERE type = 'panjar_pelunasan') as pembayaran_piutang,
  (SELECT COUNT(*) FROM cash_history WHERE type = 'orderan') as penjualan_lunas,
  (SELECT SUM(amount) FROM cash_history WHERE type IN ('panjar_pelunasan', 'orderan')) as total_kas_masuk;

-- Sample hasil migration
SELECT 
  'SAMPLE HASIL:' as info,
  account_name,
  type,
  amount,
  description,
  DATE(created_at) as tanggal
FROM cash_history 
WHERE reference_name LIKE 'PAY-%'
ORDER BY created_at DESC 
LIMIT 10;

-- Ringkasan per akun
SELECT 
  'RINGKASAN PER AKUN:' as info,
  account_name,
  COUNT(*) as jumlah_transaksi,
  SUM(amount) as total_diterima
FROM cash_history 
WHERE reference_name LIKE 'PAY-%'
GROUP BY account_name, account_id
ORDER BY total_diterima DESC;

SELECT 'SIMPLE RECEIVABLE MIGRATION COMPLETED!' as final_status;