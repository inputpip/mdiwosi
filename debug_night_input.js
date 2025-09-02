// Debug input malam hari
console.log("=== DEBUG INPUT MALAM HARI ===");

console.log("Skenario: Kasir input tanggal 30 Agustus jam 20:00 WIT");

// Skenario 1: Input jam 20:00 WIT (masih aman)
const input20 = new Date('2025-08-30T20:00:00'); // 20:00 WIT
console.log("Input 20:00 WIT:", input20.toString());
console.log("Disimpan ke DB sebagai:", input20.toISOString());
console.log("Tanggal di DB:", input20.toISOString().split('T')[0]);

// Skenario 2: Input jam 16:00 WIT (bermasalah!)
const input16 = new Date('2025-08-30T16:00:00'); // 16:00 WIT
console.log("\nInput 16:00 WIT:", input16.toString());  
console.log("Disimpan ke DB sebagai:", input16.toISOString());
console.log("Tanggal di DB:", input16.toISOString().split('T')[0]);

// Skenario 3: Apa yang terjadi jika sistem clock salah?
console.log("\n=== KEMUNGKINAN MASALAH SISTEM ===");

// Test jika ada selisih timezone
const testDate = new Date('2025-08-30T15:00:00'); // 15:00 local
console.log("Input 30 Aug 15:00:", testDate.toString());
console.log("UTC yang disimpan:", testDate.toISOString());
console.log("Jika UTC ini di-parse ulang:", new Date(testDate.toISOString()).toString());

// Test edge case: jam 15:00 WIT = 06:00 UTC (hari yang sama)
// Tapi jika ada bug, bisa jadi 06:00 UTC dianggap +1 hari
console.log("\n=== POTENSI BUG ===");
console.log("15:00 WIT = 06:00 UTC pada hari yang sama");
console.log("Tapi jika ada timezone bug, bisa jadi dianggap hari berikutnya");

// Check current system time
const now = new Date();
console.log("\nSystem saat ini:");
console.log("Local:", now.toString());
console.log("UTC:", now.toUTCString());
console.log("ISO:", now.toISOString());