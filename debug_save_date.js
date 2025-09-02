// Debug bagaimana tanggal disimpan ke database
console.log("=== DEBUG PENYIMPANAN TANGGAL ===");

const now = new Date();
console.log("1. Current time:", now.toString());
console.log("2. Current timezone offset:", now.getTimezoneOffset(), "minutes");

// Test what happens when we create a Date and send to database
console.log("\n=== SIMULASI PENYIMPANAN ===");

// Simulasi: User input tanggal 30 Agustus 2025, jam 10:00 WIT
const userInputDate = new Date('2025-08-30T10:00:00'); // Local time without Z
console.log("3. User input (30 Aug, 10:00):", userInputDate.toString());
console.log("4. ISO String for DB:", userInputDate.toISOString());

// Simulasi: Apa yang terjadi jika user di WIT tapi database mengira UTC
const userInputWIT = new Date('2025-08-30T10:00:00+09:00'); // Explicit WIT
console.log("5. User input with WIT (+9):", userInputWIT.toString());
console.log("6. ISO String for DB:", userInputWIT.toISOString());

console.log("\n=== MASALAH DITEMUKAN ===");
console.log("- Jika user input 30 Aug 10:00 WIT");
console.log("- JavaScript convert ke UTC:", userInputWIT.toISOString());
console.log("- Database simpan sebagai UTC:", userInputWIT.toISOString().split('T')[0]);
console.log("- Tapi saat ditampilkan, convert kembali ke WIT");

// Test hasil akhir
const fromDB = new Date(userInputWIT.toISOString());
console.log("7. Data dari DB (di-convert balik):", fromDB.toString());

// Cek apakah tanggal berubah
const originalDate = userInputWIT.toDateString();
const finalDate = fromDB.toDateString();
console.log("\n=== PERBANDINGAN ===");
console.log("Original date:", originalDate);
console.log("Final date:", finalDate);
console.log("Date changed?", originalDate !== finalDate);