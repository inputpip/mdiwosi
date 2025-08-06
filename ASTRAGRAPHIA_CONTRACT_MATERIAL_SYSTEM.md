# Sistem Material Kontrak/Jasa (Astragraphia)

## Problem Yang Diselesaikan
Astragraphia adalah kontrak printing yang dibayar per klik/lembar yang digunakan, bukan bahan fisik yang dibeli. Sistem sebelumnya salah menampilkan stok negatif (-19 lembar) padahal ini adalah kontrak layanan.

## Solusi Yang Diimplementasikan

### 1. **Logika Material Jasa/Kontrak Baru** ✅
File: `src/services/materialStockService.ts`

**Logika Lama (Salah):**
- Material "Beli" → Movement IN (menambah stok fisik)
- Hasil: Stok bisa negatif, tidak masuk akal untuk kontrak

**Logika Baru (Benar):**
```typescript
// Untuk material Beli/Jasa (seperti Astragraphia)
movementType = 'OUT'  // Ini adalah penggunaan/konsumsi
reason = 'PRODUCTION_CONSUMPTION'
newStock = currentStock + quantity  // Counter usage yang selalu bertambah
```

### 2. **Tampilan UI Yang Diperbaiki** ✅
File: `src/components/MaterialManagement.tsx`

**Material Stock (Fisik):**
- Menampilkan stok yang bisa berkurang
- Ada minimum stock warning

**Material Jasa/Kontrak:**
```
Total Digunakan: 19 lembar
(Kontrak/Jasa)
```

### 3. **Laporan Penggunaan & Estimasi Tagihan** ✅
File: `src/components/MaterialDetail.tsx`

Ketika user klik material Astragraphia, akan muncul:

#### **Dashboard Ringkasan:**
- **Total Digunakan:** 19 lembar
- **Jumlah Transaksi:** 5 transaksi  
- **Rata-rata per Transaksi:** 3.8 lembar
- **Estimasi Tagihan:** Rp43,700

#### **Laporan Bulanan:**
| Bulan | Penggunaan | Transaksi | Estimasi Tagihan |
|-------|------------|-----------|------------------|
| Januari 2025 | 12 lembar | 3 | Rp27,600 |
| Desember 2024 | 7 lembar | 2 | Rp16,100 |

### 4. **Perbaikan Data Existing** ✅
File: `fix_astragraphia_negative_stock.sql`

Script ini akan:
- Mengubah stok negatif menjadi positif 
- Memperbaiki movement history
- Memastikan semua material jasa menggunakan logika yang benar

## Cara Penggunaan untuk Astragraphia

### 1. **Setup Material Astragraphia**
- **Nama:** Astragraphia
- **Jenis:** Beli (atau Jasa)
- **Harga per Unit:** Rp2,300 (sesuai tarif kontrak)
- **Satuan:** lembar

### 2. **Workflow Normal**
1. **Produksi Order** → Sistem otomatis catat penggunaan
2. **Material Movement** dibuat dengan:
   - Type: OUT (keluar/digunakan)
   - Reason: PRODUCTION_CONSUMPTION
   - Quantity: Jumlah lembar yang digunakan

### 3. **Monitoring & Reporting**
- **Dashboard Material:** Lihat total penggunaan real-time
- **Laporan Detail:** Klik nama material → lihat breakdown bulanan
- **Estimasi Tagihan:** Otomatis dihitung berdasarkan penggunaan × tarif

### 4. **Export untuk Billing**
- Sistem dapat export laporan penggunaan per periode
- Format CSV/PDF untuk diserahkan ke Astragraphia
- Data sudah terstruktur per bulan sesuai siklus tagihan

## Keuntungan Sistem Baru

### ✅ **Tracking Akurat**
- Tidak ada lagi stok negatif
- Counter penggunaan yang jelas
- History lengkap per transaksi

### ✅ **Estimasi Biaya Real-time**
- Tahu berapa yang harus dibayar setiap saat
- Bisa budget planning lebih baik
- Alert jika penggunaan tinggi

### ✅ **Laporan Siap Pakai**
- Data terorganisir per bulan
- Bisa langsung diserahkan ke vendor
- Audit trail yang lengkap

### ✅ **Skalable untuk Material Lain**
- Sistem ini bisa dipakai untuk kontrak lain
- Outsourcing services
- Rental equipment
- Pay-per-use materials

## Files Yang Diubah
1. `src/services/materialStockService.ts` - Core logic
2. `src/components/MaterialManagement.tsx` - UI display
3. `src/components/MaterialDetail.tsx` - Detailed reporting
4. `fix_astragraphia_negative_stock.sql` - Data cleanup

## Langkah Implementasi
```bash
# 1. Jalankan SQL untuk fix data existing
psql -d your_database -f fix_astragraphia_negative_stock.sql

# 2. Restart aplikasi untuk load perubahan code

# 3. Test dengan membuat transaksi yang menggunakan Astragraphia

# 4. Cek laporan di material detail page
```

Sekarang Astragraphia akan berfungsi sebagai kontrak printing yang proper dengan tracking penggunaan dan estimasi tagihan yang akurat! 🎯