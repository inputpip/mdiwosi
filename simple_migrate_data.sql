-- SQL Simple untuk migrate data ke cash_history (aman untuk testing)
-- Jalankan setelah tabel cash_history sudah dibuat

-- Cek dulu struktur tabel yang ada
SELECT 'Checking table structures...' as status;

-- 1. Cek kolom di tabel transactions
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'transactions' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Cek kolom di tabel expenses  
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'expenses' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Cek kolom di tabel account_transfers
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'account_transfers' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Cek data yang ada
SELECT 
  'transactions' as tabel,
  COUNT(*) as jumlah_record,
  MIN(created_at) as data_tertua,
  MAX(created_at) as data_terbaru
FROM transactions
WHERE paid_amount > 0

UNION ALL

SELECT 
  'expenses' as tabel,
  COUNT(*) as jumlah_record,
  MIN(created_at) as data_tertua,
  MAX(created_at) as data_terbaru
FROM expenses

UNION ALL

SELECT 
  'accounts' as tabel,
  COUNT(*) as jumlah_record,
  MIN(created_at) as data_tertua,
  MAX(created_at) as data_terbaru
FROM accounts;

-- 5. Cek apakah sudah ada data di cash_history
SELECT COUNT(*) as existing_cash_history_records FROM cash_history;