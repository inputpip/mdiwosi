-- SQL untuk migrate data yang sudah diperbaiki
-- Jalankan setelah tabel cash_history sudah dibuat

-- 1. Migrate HANYA dari transactions yang berhasil dan sudah dibayar
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
    (SELECT id FROM accounts WHERE name ILIKE '%kas%' LIMIT 1),
    (SELECT id FROM accounts LIMIT 1)
  ) as account_id,
  COALESCE(
    (SELECT name FROM accounts WHERE name ILIKE '%kas%' LIMIT 1),
    'Kas Umum'
  ) as account_name,
  'orderan' as type,
  t.paid_amount as amount,
  CONCAT('Penjualan - ', t.customer_name) as description,
  t.id as reference_id,
  CONCAT('TXN-', LEFT(t.id::text, 8)) as reference_name,
  NULL as user_id, -- Biarkan NULL dulu
  t.cashier_name as user_name,
  t.created_at
FROM transactions t
WHERE t.paid_amount > 0
  AND t.paid_amount IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM cash_history ch 
    WHERE ch.reference_id = t.id::text AND ch.type = 'orderan'
  )
LIMIT 50; -- Batasi untuk testing

-- 2. Cek hasil
SELECT 
  'MIGRATION RESULT' as status,
  COUNT(*) as total_migrated_records,
  SUM(amount) as total_amount,
  MIN(created_at) as oldest_record,
  MAX(created_at) as newest_record
FROM cash_history 
WHERE type = 'orderan';

-- 3. Tampilkan sample data
SELECT 
  account_name,
  type,
  amount,
  description,
  created_at
FROM cash_history 
ORDER BY created_at DESC 
LIMIT 10;