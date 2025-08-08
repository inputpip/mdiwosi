# 🔧 MIGRATION INSTRUCTIONS - LOCAL TESTING ONLY

**⚠️ PENTING: JANGAN DEPLOY KE PRODUCTION SAMPAI TESTING SELESAI!**

## 📋 Overview

Script ini untuk memigrate data existing sebelum implementasi sistem laporan keuangan baru ke tabel `cash_history`. 

### ❌ Tentang Data yang Dihapus
**Data yang sudah dihapus TIDAK akan mempengaruhi migration atau laporan keuangan:**
- Migration hanya akan memproses data yang masih ADA di database
- Tidak ada "phantom data" atau referensi rusak
- Data yang dihapus = hilang total, tidak ada jejak di laporan

---

## 🚀 Step-by-Step Testing Process

### **Step 1: Testing di Lokal**

#### 1.1 Run Migration Tester (UI)
```bash
# Start local development
npm run dev
```

1. Login sebagai **Admin/Owner**
2. Buka **Laporan Keuangan** → Tab **"Debug Data"**
3. Scroll ke **"Migration Tester"**
4. Klik **"Run Tests"** 
5. Pastikan status **"✅ Ready for Migration"**
6. Klik **"Preview Migration"** untuk lihat data yang akan dimigrate

#### 1.2 Run Testing SQL
```sql
-- Jalankan di database client (pgAdmin, DBeaver, etc)
-- File: test_migration_local.sql

-- Copy paste seluruh isi file dan execute
```

**Expected Results:**
- ✅ Semua tabel core ada (transactions, accounts, customers)
- ✅ Ada data transactions yang valid untuk migration  
- ✅ Status: "READY FOR MIGRATION"

### **Step 2: Preview Migration (Aman)**

```sql
-- File: migrate_existing_data_to_cash_history_safe.sql

-- 1. UNCOMMENT bagian "PREVIEW" dulu (line ~40-80)
-- 2. Execute bagian preview
-- 3. Check hasil:
--    - Berapa transaksi yang akan dimigrate?
--    - Apakah data terlihat benar?
--    - Ada conflict tidak?
```

### **Step 3: Actual Migration**

**HANYA JIKA PREVIEW TERLIHAT BENAR:**

```sql
-- File: migrate_existing_data_to_cash_history_safe.sql

-- 1. UNCOMMENT bagian "ACTUAL MIGRATION" (line ~90-130)
-- 2. UNCOMMENT bagian "VERIFIKASI" (line ~200-230)  
-- 3. Execute migration
-- 4. Check hasil di verifikasi
```

### **Step 4: Verify Results**

1. **Via UI**: Cek tab "Debug Data" → "Refresh"
2. **Via SQL**: Jalankan query verifikasi
3. **Via Reports**: Cek Laporan Harian & Komprehensif

---

## 📁 File Structure

```
/
├── test_migration_local.sql              # Testing script
├── migrate_existing_data_to_cash_history_safe.sql  # Main migration
├── src/components/MigrationTester.tsx     # UI testing tool
├── MIGRATION_INSTRUCTIONS.md             # This file
```

---

## 🛡️ Safety Features

### Automatic Backup
- Script otomatis backup `cash_history` → `cash_history_backup`
- Jika error: `DROP cash_history; ALTER TABLE cash_history_backup RENAME TO cash_history;`

### Conflict Prevention
- Tidak akan migrate data yang sudah ada di `cash_history`
- Check reference_id untuk avoid duplicates

### Preview Mode
- Semua migration code di-comment out by default
- Must manually uncomment to execute
- Preview mode shows exactly what will be migrated

---

## 🎯 What Will Be Migrated

### ✅ Transactions → Cash History
```sql
Type: 'orderan'
Amount: transaction.total_amount (positive)
Description: "Transaksi dari [Customer] - [Items]"
Reference: transaction.id
```

### ⚠️ Optional Migrations  
```sql
-- Expenses → Cash History (if exists)
Type: 'pengeluaran'
Amount: -expense.amount (negative)

-- Manual Cash → Cash History (if exists) 
Type: 'kas_masuk_manual' or 'kas_keluar_manual'
Amount: manual_cash.amount
```

---

## 🔍 Troubleshooting

### Issue: "Table cash_history doesn't exist"
```sql
-- Run this first to create table
CREATE TABLE cash_history (
    -- See migrate_existing_data_to_cash_history_safe.sql line ~15
);
```

### Issue: "No transactions to migrate"
- Check if transactions table exists and has data
- Check if account_id and total_amount are not null
- May be normal for new installation

### Issue: "Permission denied"
- Make sure user has INSERT/SELECT permissions on all tables
- May need admin privileges for migration

### Issue: "Migration shows 0 records"
- Check if transactions already migrated
- Look for existing cash_history records with type='orderan'
- This is normal if migration already ran

---

## 🚨 Emergency Rollback

If something goes wrong:

```sql
-- 1. Drop problematic cash_history
DROP TABLE IF EXISTS cash_history;

-- 2. Restore from backup
ALTER TABLE cash_history_backup RENAME TO cash_history;

-- 3. Or start fresh
DROP TABLE cash_history_backup;
-- Then re-run migration properly
```

---

## ✅ Testing Checklist

- [ ] Run `test_migration_local.sql` successfully
- [ ] MigrationTester shows "Ready for Migration"
- [ ] Preview migration shows correct data
- [ ] Actual migration completes without errors  
- [ ] Verification shows correct record counts
- [ ] Financial Reports display migrated data correctly
- [ ] No duplicate transactions in cash_history
- [ ] All existing functionality still works

---

## 📞 Next Steps After Testing

**ONLY** after successful local testing:

1. **Document results** - Screenshot successful migration
2. **Test all financial reports** - Ensure data appears correctly
3. **Verify no regressions** - Check existing features work
4. **Plan production migration** - Same process but on production DB
5. **Schedule deployment** - After production migration is complete

**DO NOT DEPLOY TO PRODUCTION UNTIL LOCAL TESTING IS 100% SUCCESSFUL!**