-- =====================================================
-- SQL DIAGNOSIS: Cek Masalah BCA Matahari
-- =====================================================

-- STEP 1: CEK SEMUA AKUN DAN KONFIGURASI
-- =====================================================
SELECT 'CHECKING ALL ACCOUNTS CONFIGURATION' as status;

-- Cek semua akun dengan detail lengkap
SELECT 
  id,
  name,
  type,
  balance,
  is_payment_account,
  created_at
FROM accounts 
ORDER BY name;

-- Fokus cek BCA Matahari
SELECT 
  'BCA MATAHARI DETAILS' as info,
  id,
  name,
  type,
  balance,
  is_payment_account,
  created_at
FROM accounts 
WHERE name ILIKE '%BCA%' OR name ILIKE '%Matahari%';

-- STEP 2: CEK DATA CASH HISTORY UNTUK BCA MATAHARI  
-- =====================================================

-- Cek semua data cash history untuk akun BCA Matahari
SELECT 
  'CASH HISTORY FOR BCA MATAHARI' as info,
  ch.id,
  ch.account_name,
  ch.type,
  ch.amount,
  ch.description,
  ch.created_at
FROM cash_history ch
WHERE ch.account_name ILIKE '%BCA%' OR ch.account_name ILIKE '%Matahari%'
ORDER BY ch.created_at DESC;

-- Count berapa banyak data cash history per akun
SELECT 
  'CASH HISTORY COUNT PER ACCOUNT' as info,
  account_name,
  COUNT(*) as total_records,
  SUM(CASE WHEN amount > 0 THEN 1 ELSE 0 END) as kas_masuk,
  SUM(CASE WHEN amount < 0 THEN 1 ELSE 0 END) as kas_keluar,
  SUM(amount) as net_balance
FROM cash_history 
GROUP BY account_name
ORDER BY total_records DESC;

-- STEP 3: CEK TRANSAKSI DENGAN BCA MATAHARI
-- =====================================================

-- Cek transaksi yang menggunakan BCA Matahari sebagai payment account
SELECT 
  'TRANSACTIONS WITH BCA MATAHARI' as info,
  t.id,
  t.customer_name,
  t.total,
  t.paid_amount,
  t.payment_status,
  a.name as payment_account_name,
  t.created_at
FROM transactions t
LEFT JOIN accounts a ON t.payment_account_id = a.id
WHERE a.name ILIKE '%BCA%' OR a.name ILIKE '%Matahari%'
ORDER BY t.created_at DESC
LIMIT 20;

-- STEP 4: CEK APAKAH ADA FILTER ATAU PEMBATASAN
-- =====================================================

-- Cek apakah BCA Matahari bisa dipakai untuk transfer (is_payment_account)
SELECT 
  'PAYMENT ACCOUNT STATUS' as info,
  name,
  is_payment_account,
  CASE 
    WHEN is_payment_account = true THEN 'Bisa dipakai untuk pembayaran/transfer'
    ELSE 'TIDAK bisa dipakai untuk pembayaran/transfer'
  END as status_keterangan
FROM accounts 
WHERE name ILIKE '%BCA%' OR name ILIKE '%Matahari%';

-- Cek akun mana saja yang bisa dipakai untuk transfer
SELECT 
  'ACCOUNTS AVAILABLE FOR TRANSFER' as info,
  name,
  type,
  balance,
  is_payment_account
FROM accounts 
WHERE is_payment_account = true
ORDER BY name;

SELECT 'BCA MATAHARI DIAGNOSIS COMPLETED!' as final_status;