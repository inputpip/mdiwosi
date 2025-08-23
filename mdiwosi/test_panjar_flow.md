# Test Flow Panjar ke Cash History

## ✅ Perubahan yang Sudah Dibuat:

### 1. **Pengambilan Panjar** (addAdvance)
```typescript
// Struktur cash_history yang BENAR untuk pengambilan panjar (menyesuaikan struktur yang sudah ada):
{
  account_id: newData.accountId,
  transaction_type: 'expense',           // ✅ FIXED: sesuai dengan struktur tabel yang ada
  amount: newData.amount,
  description: `Panjar karyawan untuk ${newData.employeeName}...`,
  reference_number: `ADV-${data.id.slice(4)}`,  // ✅ FIXED: reference number
  source_type: 'employee_advance',       // ✅ FIXED: untuk identifikasi di tabel
  created_by: user.id,                   // ✅ FIXED: sesuai struktur tabel
  created_by_name: user.name,            // ✅ FIXED: sesuai struktur tabel
  created_at: newData.date              // ✅ gunakan tanggal input
}
```

### 2. **Pelunasan Panjar** (addRepayment)
```typescript
// Logika pelunasan:
1. Tambah repayment ke advance_repayments ✅
2. Update remaining_amount via RPC ✅
3. Cek jika remaining_amount <= 0 ✅
4. Jika lunas: HAPUS dari cash_history ✅
   - WHERE reference_number = ADV-{advanceId.slice(4)}
   - AND source_type = 'employee_advance'
5. TIDAK menambah saldo akun (sesuai requirement) ✅
```

### 3. **Hapus Panjar** (deleteAdvance)
```typescript
// Hapus cash_history dengan referensi yang benar:
- WHERE reference_number = ADV-{advanceId.slice(4)} ✅
- AND source_type = 'employee_advance' ✅
```

### 4. **Tampilan di Tabel**
```typescript
// CashFlowTable sudah siap menangani:
- source_type: 'employee_advance' → Label: "Panjar Karyawan" ✅
- transaction_type: 'expense' → Badge warna merah (pengeluaran) ✅
```

## 🧪 Test Scenarios:

### Skenario 1: Buat Panjar Baru
1. Input panjar karyawan Rp 100,000
2. Check: cash_history harus ada record dengan type 'panjar_pengambilan'
3. Check: saldo akun berkurang Rp 100,000

### Skenario 2: Pelunasan Sebagian
1. Bayar cicilan Rp 30,000
2. Check: remaining_amount = 70,000
3. Check: cash_history record masih ada

### Skenario 3: Pelunasan Penuh
1. Bayar sisa Rp 70,000
2. Check: remaining_amount = 0
3. Check: cash_history record terhapus otomatis
4. Check: saldo akun TIDAK berubah (karena pembayaran sudah diinput manual di gaji)

### Skenario 4: Hapus Panjar
1. Delete panjar
2. Check: cash_history record terhapus
3. Check: saldo akun dikembalikan

## 🎯 Expected Behavior:
- ✅ Pengambilan panjar masuk ke cash_history dengan struktur yang sesuai
- ✅ Pelunasan penuh menghapus record dari cash_history
- ✅ Tidak ada double-counting saldo akun saat pelunasan

## 🧪 Testing & Debugging:

### 🔧 Debug Tools yang Telah Ditambahkan:
1. **Console logging** di useEmployeeAdvances untuk melihat data yang dikirim
2. **Console logging** di useCashFlow untuk melihat data yang di-fetch
3. **Button Refresh** di halaman Arus Keuangan untuk force refresh data
4. **Enhanced cache invalidation** + force refetch setelah add panjar

### 🧪 Cara Testing:
1. **Buka Console Browser** (F12 → Console tab)
2. **Buat panjar baru** di aplikasi **http://localhost:8080/**
3. **Lihat console logs**:
   - "Recording advance in cash history:" → Data yang dikirim
   - "Successfully recorded advance in cash history:" → Konfirmasi tersimpan
   - "Fetched cash history data:" → Data yang di-fetch
   - "Employee advances found:" → Filter khusus panjar

4. **Cek tabel**:
   - **Halaman Arus Keuangan** → Harus muncul "Panjar Karyawan"
   - **Jika tidak muncul** → Klik **Button Refresh** yang baru

5. **Testing pelunasan**:
   - **Cicil sebagian** → Record tetap di tabel
   - **Lunas penuh** → Record hilang dari tabel

### 🎯 Expected Console Logs:
```
Recording advance in cash history: {account_id, transaction_type: "expense", source_type: "employee_advance", ...}
Successfully recorded advance in cash history: [{id, account_id, ...}]
Fetched cash history data: [...]
Employee advances found: [{source_type: "employee_advance", ...}]
```

Sistem panjar sekarang fully integrated dengan debug tools! 🚀