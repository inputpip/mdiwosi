-- =====================================================
-- SQL SEDERHANA: Diagnosis BCA Matahari Issues
-- =====================================================

-- STEP 1: CEK STRUKTUR TABEL ACCOUNTS DULU
-- =====================================================
SELECT 'CHECKING ACCOUNTS TABLE STRUCTURE' as status;

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'accounts' AND table_schema = 'public'
ORDER BY ordinal_position;

-- STEP 2: CEK SEMUA AKUN
-- =====================================================
SELECT 
  'ALL ACCOUNTS' as info,
  id,
  name,
  type,
  balance,
  is_payment_account,
  created_at
FROM accounts 
ORDER BY name;

-- STEP 3: FOKUS BCA MATAHARI  
-- =====================================================
SELECT 
  'BCA MATAHARI SPECIFIC' as info,
  id,
  name,
  type,
  balance,
  is_payment_account,
  CASE 
    WHEN is_payment_account = true THEN 'BISA untuk transfer/pembayaran'
    ELSE 'TIDAK BISA untuk transfer/pembayaran - INI MASALAHNYA!'
  END as transfer_status
FROM accounts 
WHERE name ILIKE '%BCA%' OR name ILIKE '%Matahari%';

-- STEP 4: CEK AKUN YANG BISA TRANSFER
-- =====================================================
SELECT 
  'ACCOUNTS AVAILABLE FOR TRANSFER' as info,
  name,
  balance,
  is_payment_account
FROM accounts 
WHERE is_payment_account = true
ORDER BY name;

-- STEP 5: CEK HISTORY BCA MATAHARI
-- =====================================================
SELECT 
  'BCA MATAHARI CASH HISTORY' as info,
  account_name,
  type,
  amount,
  description,
  DATE(created_at) as tanggal
FROM cash_history 
WHERE account_name ILIKE '%BCA%' OR account_name ILIKE '%Matahari%'
ORDER BY created_at DESC;

-- Count history per akun
SELECT 
  'HISTORY COUNT PER ACCOUNT' as info,
  account_name,
  COUNT(*) as total_records
FROM cash_history 
GROUP BY account_name
ORDER BY total_records DESC;

-- STEP 6: CEK TRANSAKSI DENGAN BCA MATAHARI
-- =====================================================
SELECT 
  'TRANSACTIONS USING BCA MATAHARI' as info,
  t.customer_name,
  t.total,
  t.paid_amount,
  a.name as payment_account,
  DATE(t.created_at) as tanggal
FROM transactions t
JOIN accounts a ON t.payment_account_id = a.id
WHERE a.name ILIKE '%BCA%' OR a.name ILIKE '%Matahari%'
ORDER BY t.created_at DESC
LIMIT 10;

-- STEP 7: SOLUSI UNTUK MASALAH TRANSFER
-- =====================================================
SELECT 'SOLUSI: Jika BCA Matahari is_payment_account = false, jalankan query berikut:' as solusi;
SELECT 'UPDATE accounts SET is_payment_account = true WHERE name ILIKE ''%BCA%'' AND name ILIKE ''%Matahari%'';' as sql_fix;

SELECT 'DIAGNOSIS BCA MATAHARI COMPLETED!' as final_status;