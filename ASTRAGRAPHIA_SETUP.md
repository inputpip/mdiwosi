# Setup Astragraphia Tracking System

## Fitur Yang Telah Ditambahkan

✅ **AstragraphiaReport Component** - Komponen khusus untuk monitoring kontrak Astragraphia  
✅ **Date Range Filter** - Filter berdasarkan rentang tanggal  
✅ **Billing Calculator** - Kalkulasi otomatis estimasi tagihan  
✅ **Integration with MaterialManagement** - Tombol akses langsung dari halaman Material Management  

## Cara Setup Material Astragraphia

### 1. Tambah Material Baru
- Buka halaman **Material Management**
- Klik **"Tambah Bahan Baru"**

### 2. Isi Form Material
```
Nama Bahan: "Astragraphia - Xerox Printing Service"
Jenis Bahan: "Beli" (untuk tracking konsumsi)
Satuan: "klik" atau "click"
Harga per Satuan: 45 (Rp per klik sesuai kontrak)
Stok Saat Ini: 0
Stok Minimal: 0
Deskripsi: "Kontrak mesin xerox PT Astragraphia per klik cetak"
```

### 3. Cara Material Terdeteksi Sistem
Material akan otomatis terdeteksi sebagai Astragraphia jika nama/deskripsi mengandung:
- "astragraphia" (case insensitive)
- "xerox" (case insensitive)  
- "mesin cetak" (case insensitive)

### 4. Cara Menggunakan Laporan

#### A. Akses Laporan
- Buka **Material Management**
- Klik tombol **"Laporan Astragraphia"** (biru dengan ikon dokumen)

#### B. Filter by Date Range
- **Tanggal Mulai**: Pilih tanggal mulai periode
- **Tanggal Selesai**: Pilih tanggal akhir periode
- Klik **"Clear Filter"** untuk reset

#### C. Dashboard Statistik
- **Total Klik**: Jumlah total penggunaan mesin
- **Biaya per Klik**: Total biaya berdasarkan tarif Rp45/klik
- **Estimasi Tagihan**: Tagihan final (minimum Rp50,000/bulan)
- **Rata-rata Harian**: Average penggunaan per hari

#### D. Informasi Tagihan
- Detail kontrak dan analisis biaya
- Perhitungan hemat dari minimum charge
- Breakdown biaya penggunaan vs tagihan final

#### E. Detail Usage Table
- Riwayat penggunaan per transaksi
- Data user yang menggunakan
- Reference ke transaksi terkait
- Catatan tambahan

## Pengaturan Tarif (Owner Only)

### 🔒 Cara Mengubah Tarif (Khusus Owner):
1. **Login sebagai Owner**
2. **Buka Laporan Astragraphia**
3. **Klik tombol "Pengaturan Tarif"** di kanan atas
4. **Isi form pengaturan:**
   - Tarif per Klik (Rp)
   - Minimum Charge Bulanan (Rp)  
   - Nama Kontrak/Vendor
   - Tanggal Mulai & Berakhir Kontrak
   - Catatan Kontrak
5. **Klik "Simpan Pengaturan"**

### 🛡️ Keamanan:
- **Hanya Owner** yang bisa mengubah tarif
- **Non-owner** akan mendapat pesan "Akses Terbatas"
- **Riwayat perubahan** tercatat (siapa & kapan)
- **Settings disimpan** secara permanen di localStorage

### ⚙️ Default Settings:
- **Per Klik**: Rp 45
- **Minimum Bulanan**: Rp 50,000
- **Vendor**: PT Astragraphia Document Solutions

## Testing

### 1. Buat Material Test
Nama: "Astragraphia Test - Xerox Machine"
Deskripsi: "Test material untuk mesin xerox astragraphia"

### 2. Simulasi Usage  
- Buat transaksi produksi yang menggunakan material Astragraphia
- Material akan tercatat sebagai "OUT" movement
- Quantity akan dihitung sebagai jumlah klik

### 3. Cek Laporan
- Buka Laporan Astragraphia
- Verifikasi data muncul di dashboard
- Test filter tanggal
- Cek kalkulasi tagihan

## Features

### ✅ Completed
- [x] Auto-detect Astragraphia materials
- [x] Date range filtering  
- [x] Usage tracking from material movements
- [x] Billing calculation with minimum charge
- [x] Daily usage statistics
- [x] Material registration guide
- [x] Integration with Material Management
- [x] Responsive UI with proper loading states
- [x] **Dynamic tariff settings (Owner only)**
- [x] **Security validation for rate changes**
- [x] **Settings persistence with localStorage**
- [x] **Contract information management**
- [x] **Change history tracking**

### 🔄 Future Enhancements
- [ ] Export laporan ke PDF/Excel
- [ ] Email notification untuk tagihan bulanan
- [ ] Grafik trend penggunaan
- [ ] Prediksi tagihan bulan depan
- [ ] Multi-contract support (jika ada beberapa mesin)

## Troubleshooting

### Material Tidak Terdeteksi?
- Pastikan nama/deskripsi mengandung kata kunci: "astragraphia", "xerox", atau "mesin cetak"
- Case insensitive, jadi "ASTRAGRAPHIA" atau "Xerox" akan terdeteksi

### Data Tidak Muncul di Laporan?
- Pastikan ada material movement dengan type "OUT" 
- Cek apakah transaksi produksi sudah menggunakan material Astragraphia
- Verifikasi rentang tanggal filter

### Tagihan Tidak Sesuai?
- Cek konstanta tarif di `AstragraphiaReport.tsx`
- Verifikasi perhitungan: (total klik × tarif) vs minimum charge
- Tagihan final = MAX(total biaya, minimum bulanan)