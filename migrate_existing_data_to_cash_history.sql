-- SQL untuk migrate data existing ke cash_history table
-- Jalankan setelah tabel cash_history sudah dibuat

-- 1. Migrate data dari transactions (penjualan) ke cash_history
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
    (SELECT name FROM accounts WHERE type = 'Aset' LIMIT 1),
    'Kas Umum'
  ) as account_name,
  'orderan' as type,
  t.paid_amount as amount,
  CONCAT('Penjualan - ', t.customer_name, ' (ID: ', t.id, ')') as description,
  t.id as reference_id,
  CONCAT('TXN-', SUBSTRING(t.id, 1, 8)) as reference_name,
  t.cashier_id as user_id,
  COALESCE(t.cashier_name, 'System') as user_name,
  t.created_at
FROM transactions t
WHERE t.status IN ('Selesai', 'Pesanan Selesai')
  AND t.paid_amount > 0
  AND NOT EXISTS (
    SELECT 1 FROM cash_history ch 
    WHERE ch.reference_id = t.id AND ch.type = 'orderan'
  );

-- 2. Migrate data dari account_transfers (transfer antar akun) ke cash_history
-- Transfer keluar (dari akun asal)
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
  at.from_account_id as account_id,
  fa.name as account_name,
  'transfer_keluar' as type,
  -at.amount as amount, -- negative untuk keluar
  CONCAT('Transfer ke ', ta.name, ' - ', at.description) as description,
  at.id as reference_id,
  CONCAT('TF-', at.id) as reference_name,
  at.user_id as user_id,
  COALESCE(at.user_name, 'System') as user_name,
  at.created_at
FROM account_transfers at
JOIN accounts fa ON at.from_account_id = fa.id
JOIN accounts ta ON at.to_account_id = ta.id
WHERE NOT EXISTS (
  SELECT 1 FROM cash_history ch 
  WHERE ch.reference_id = at.id AND ch.type = 'transfer_keluar'
);

-- Transfer masuk (ke akun tujuan)
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
  at.to_account_id as account_id,
  ta.name as account_name,
  'transfer_masuk' as type,
  at.amount as amount, -- positive untuk masuk
  CONCAT('Transfer dari ', fa.name, ' - ', at.description) as description,
  at.id as reference_id,
  CONCAT('TF-', at.id) as reference_name,
  at.user_id as user_id,
  COALESCE(at.user_name, 'System') as user_name,
  at.created_at
FROM account_transfers at
JOIN accounts fa ON at.from_account_id = fa.id
JOIN accounts ta ON at.to_account_id = ta.id
WHERE NOT EXISTS (
  SELECT 1 FROM cash_history ch 
  WHERE ch.reference_id = at.id AND ch.type = 'transfer_masuk'
);

-- 3. Migrate data dari expenses (pengeluaran) ke cash_history
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
    (SELECT name FROM accounts WHERE type = 'Aset' LIMIT 1),
    'Kas Umum'
  ) as account_name,
  'pengeluaran' as type,
  -e.amount as amount, -- negative untuk pengeluaran
  CONCAT('[', COALESCE(e.category, 'Lainnya'), '] ', e.description) as description,
  e.id as reference_id,
  CONCAT('EXP-', e.id) as reference_name,
  e.user_id as user_id,
  COALESCE(e.user_name, 'System') as user_name,
  e.created_at
FROM expenses e
WHERE NOT EXISTS (
  SELECT 1 FROM cash_history ch 
  WHERE ch.reference_id = e.id AND ch.type = 'pengeluaran'
);

-- Tampilkan ringkasan hasil migration
SELECT 
  'MIGRATION COMPLETED' as status,
  (SELECT COUNT(*) FROM cash_history WHERE type = 'orderan') as total_penjualan,
  (SELECT COUNT(*) FROM cash_history WHERE type = 'transfer_masuk') as total_transfer_masuk,
  (SELECT COUNT(*) FROM cash_history WHERE type = 'transfer_keluar') as total_transfer_keluar,
  (SELECT COUNT(*) FROM cash_history WHERE type = 'pengeluaran') as total_pengeluaran,
  (SELECT COUNT(*) FROM cash_history) as total_records;