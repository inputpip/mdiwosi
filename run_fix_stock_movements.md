# Fix Stock Movements untuk Produk Tipe "Beli"

## Masalah
Produk dengan tipe "Beli" (seperti Bingkai) saat ini tercatat sebagai:
- ❌ Movement Type: "IN" (Masuk)  
- ❌ Reason: "PURCHASE" (Pembelian)

Padahal seharusnya:
- ✅ Movement Type: "OUT" (Keluar/Konsumsi)
- ✅ Reason: "SALES" (Penjualan)

## Cara Perbaikan

1. **Jalankan SQL Script**:
   ```bash
   # Jika menggunakan Supabase CLI
   npx supabase db reset
   
   # Atau jalankan file SQL manual
   psql -h your-host -U your-user -d your-db -f fix_incorrect_stock_movements.sql
   ```

2. **Verifikasi Perbaikan**:
   - Buka aplikasi 
   - Lihat "Pergerakan Stock Produk"
   - Produk Bingkai seharusnya sudah menampilkan "Keluar" dan "Penjualan"

## Kode Yang Sudah Diperbaiki

1. **stockService.ts**: Logic produk tipe "Beli" 
2. **StockConsumptionReport.tsx**: Tampilan report konsumsi
3. **Database**: Data stock movements yang salah

## Test
Buat transaksi baru dengan produk Bingkai, seharusnya muncul:
- Jenis: **Keluar** 
- Alasan: **Penjualan**