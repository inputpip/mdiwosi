-- =====================================================
-- SQL untuk Migrate Data Pembayaran Piutang yang Ada
-- =====================================================

-- STEP 1: CEK DATA PAYMENT HISTORY
-- =====================================================
SELECT 'CHECKING PAYMENT HISTORY DATA' as status;

-- Cek tabel payment_history
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'payment_history' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Cek data payment history existing
SELECT COUNT(*) as total_payment_records FROM payment_history;

-- Sample payment history data
SELECT 
  id,
  transaction_id,
  amount,
  payment_account_id,
  description,
  created_at
FROM payment_history 
ORDER BY created_at DESC 
LIMIT 10;

-- STEP 2: MIGRATE PAYMENT HISTORY KE CASH HISTORY
-- =====================================================

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
  ph.payment_account_id as account_id,
  COALESCE(
    (SELECT name FROM accounts WHERE id = ph.payment_account_id),
    'Unknown Account'
  ) as account_name,
  'panjar_pelunasan' as type,
  ph.amount as amount,
  CONCAT('Pembayaran piutang - ', ph.description) as description,
  ph.transaction_id as reference_id,
  CONCAT('PAY-', LEFT(ph.id::text, 8)) as reference_name,
  ph.user_id as user_id,
  COALESCE(ph.user_name, 'System') as user_name,
  ph.created_at
FROM payment_history ph
WHERE ph.amount > 0
  AND ph.payment_account_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_history' AND table_schema = 'public')
  AND NOT EXISTS (
    SELECT 1 FROM cash_history ch 
    WHERE ch.reference_id = ph.transaction_id::text 
      AND ch.type = 'panjar_pelunasan'
      AND ch.amount = ph.amount
      AND DATE(ch.created_at) = DATE(ph.created_at)
  );

-- STEP 3: MIGRATE DARI TRANSACTIONS YANG SUDAH LUNAS (PEMBAYARAN BERTAHAP)
-- =====================================================

-- Migrate transaksi yang dibayar bertahap (paid_amount > 0 tapi < total)
-- Ini untuk menangkap pembayaran piutang historis
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
  'panjar_pelunasan' as type,
  (t.total - t.paid_amount) as amount, -- Sisa yang dibayar
  CONCAT('Pelunasan piutang - ', t.customer_name, ' (Order: ', LEFT(t.id::text, 8), ')') as description,
  t.id as reference_id,
  CONCAT('LUNAS-', LEFT(t.id::text, 8)) as reference_name,
  t.cashier_id as user_id,
  t.cashier_name as user_name,
  t.updated_at as created_at -- Gunakan updated_at sebagai tanggal pelunasan
FROM transactions t
WHERE t.payment_status = 'Lunas'
  AND t.total > t.paid_amount  -- Ada sisa yang perlu dibayar
  AND t.paid_amount > 0
  AND t.updated_at > t.created_at -- Ada update setelah creation (indikasi pelunasan)
  AND NOT EXISTS (
    SELECT 1 FROM cash_history ch 
    WHERE ch.reference_id = t.id::text 
      AND ch.type = 'panjar_pelunasan'
  );

-- STEP 4: LAPORAN HASIL MIGRATION
-- =====================================================

SELECT 
  'HASIL MIGRATION PEMBAYARAN PIUTANG' as status,
  (SELECT COUNT(*) FROM cash_history WHERE type = 'panjar_pelunasan') as total_pembayaran_piutang,
  (SELECT SUM(amount) FROM cash_history WHERE type = 'panjar_pelunasan') as total_nominal_pembayaran,
  (SELECT COUNT(DISTINCT account_id) FROM cash_history WHERE type = 'panjar_pelunasan') as akun_yang_terpakai;

-- Sample data hasil migration
SELECT 
  'SAMPLE PEMBAYARAN PIUTANG:' as info,
  account_name,
  amount,
  description,
  DATE(created_at) as tanggal
FROM cash_history 
WHERE type = 'panjar_pelunasan'
ORDER BY created_at DESC 
LIMIT 10;

-- Ringkasan per akun
SELECT 
  'RINGKASAN PER AKUN:' as info,
  account_name,
  COUNT(*) as jumlah_pembayaran,
  SUM(amount) as total_diterima
FROM cash_history 
WHERE type = 'panjar_pelunasan'
GROUP BY account_name, account_id
ORDER BY total_diterima DESC;

SELECT 'MIGRATION PEMBAYARAN PIUTANG COMPLETED!' as final_status;