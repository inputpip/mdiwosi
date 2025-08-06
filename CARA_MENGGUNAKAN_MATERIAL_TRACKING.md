# Cara Menggunakan Material Tracking System

## Masalah yang Anda Alami
Data transaksi tidak muncul di detail bahan karena sistem belum dikonfigurasi dengan benar.

## Cara Kerja Sistem

### 1. Material Tracking hanya bekerja ketika:
- Produk sudah punya **data material** (Bill of Materials/BOM)  
- Status transaksi diubah menjadi **"Proses Produksi"**

### 2. Langkah-langkah untuk Menampilkan Data:

#### Langkah 1: Tambahkan Material ke Produk
1. Masuk ke halaman **Produk**
2. Edit produk yang ingin ditambahkan material
3. Di bagian **"Materials"**, tambahkan bahan yang digunakan:
   - Pilih material dari daftar
   - Isi jumlah yang dibutuhkan per unit produk
   - Contoh: Untuk membuat 1 Banner, butuh 2 meter kain

#### Langkah 2: Buat Transaksi dengan Produk yang Sudah Ada Material
1. Buat transaksi di **POS** seperti biasa
2. Pilih produk yang sudah ditambahkan material-nya
3. Simpan transaksi

#### Langkah 3: Ubah Status Transaksi ke "Proses Produksi"
1. Masuk ke halaman **Transaksi**
2. Cari transaksi yang sudah dibuat
3. Ubah status dari **"Pesanan Masuk"** → **"Proses Design"** → **"ACC Customer"** → **"Proses Produksi"**
4. Saat status berubah ke "Proses Produksi", sistem akan:
   - Mencatat penggunaan material
   - Mengurangi stock material
   - Membuat riwayat pergerakan material

#### Langkah 4: Cek Detail Material
1. Masuk ke halaman **Bahan & Stock**
2. Klik nama material yang ingin dilihat
3. Pilih rentang tanggal sesuai kebutuhan
4. Lihat data pemakaian dan riwayat transaksi

## Contoh Scenario:
```
Produk: Banner 3x2m
Materials: 
- Kain Banner: 6 meter
- Tinta: 50ml

Transaksi: Order 2 unit Banner
Status: Pesanan Masuk → ... → Proses Produksi

Hasil Material Tracking:
- Kain Banner: -12 meter (6 x 2 unit)  
- Tinta: -100ml (50 x 2 unit)
```

## Tips:
- **Material harus ditambahkan ke produk SEBELUM membuat transaksi**
- **Status harus diubah ke "Proses Produksi" untuk mencatat penggunaan**
- **Gunakan filter tanggal di detail material untuk analisis bulanan**

## Troubleshooting:
- **Data tidak muncul**: Cek apakah produk punya material dan status sudah "Proses Produksi"
- **Stock tidak berkurang**: Pastikan material type = "Stock" (bukan "Beli")
- **Jumlah tidak sesuai**: Periksa quantity material di produk

---
*File ini dibuat untuk membantu menggunakan sistem tracking material yang sudah ada di aplikasi*