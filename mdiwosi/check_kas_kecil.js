// Script untuk mengecek saldo kas kecil
// Jalankan di browser console saat di halaman yang bisa akses supabase

console.log("=== ANALISIS SALDO KAS KECIL ===");

async function checkKasKecil() {
  try {
    // 1. Cek saldo saat ini di tabel accounts
    console.log("\n1. SALDO SAAT INI DI TABEL ACCOUNTS:");
    const { data: accounts, error: accountError } = await supabase
      .from('accounts')
      .select('id, name, balance, initial_balance')
      .ilike('name', '%kas%kecil%');
    
    if (accountError) {
      console.error('Error fetching accounts:', accountError);
      return;
    }
    
    console.table(accounts);
    
    if (!accounts || accounts.length === 0) {
      console.log("Tidak ada akun kas kecil ditemukan");
      return;
    }
    
    const kasKecilId = accounts[0].id;
    const currentBalance = accounts[0].balance || 0;
    const initialBalance = accounts[0].initial_balance || 0;
    
    console.log(`Akun ID: ${kasKecilId}`);
    console.log(`Saldo saat ini: ${currentBalance.toLocaleString('id-ID')}`);
    console.log(`Saldo awal: ${initialBalance.toLocaleString('id-ID')}`);
    
    // 2. Ambil semua transaksi kas kecil sampai tanggal 16 Agustus 2025
    console.log("\n2. TRANSAKSI KAS KECIL SAMPAI TANGGAL 16:");
    const { data: transactions, error: txError } = await supabase
      .from('cash_history')
      .select('*')
      .eq('account_id', kasKecilId)
      .lte('created_at', '2025-08-16T23:59:59.999Z')
      .order('created_at', { ascending: true });
    
    if (txError) {
      console.error('Error fetching transactions:', txError);
      
      // Fallback ke tabel transactions jika cash_history tidak ada
      console.log("Mencoba dari tabel transactions...");
      const { data: fallbackTx, error: fallbackError } = await supabase
        .from('transactions')
        .select('*')
        .lte('created_at', '2025-08-16T23:59:59.999Z')
        .order('created_at', { ascending: true });
      
      if (fallbackError) {
        console.error('Error fetching fallback transactions:', fallbackError);
        return;
      }
      
      console.log(`Total transaksi dari tabel transactions: ${fallbackTx?.length || 0}`);
      if (fallbackTx && fallbackTx.length > 0) {
        console.table(fallbackTx.slice(0, 10)); // Show first 10
      }
      return;
    }
    
    console.log(`Total transaksi kas kecil sampai tgl 16: ${transactions?.length || 0}`);
    
    if (!transactions || transactions.length === 0) {
      console.log("Tidak ada transaksi kas kecil ditemukan");
      return;
    }
    
    // 3. Analisis transaksi
    console.log("\n3. ANALISIS TRANSAKSI:");
    let totalMasuk = 0;
    let totalKeluar = 0;
    let runningBalance = initialBalance;
    
    console.log("Detail transaksi (10 terakhir):");
    const recentTx = transactions.slice(-10);
    console.table(recentTx.map(tx => ({
      tanggal: tx.created_at,
      deskripsi: tx.description,
      jenis: tx.source_type || tx.type,
      amount: tx.amount,
      transaction_type: tx.transaction_type
    })));
    
    transactions.forEach(tx => {
      const isIncome = tx.transaction_type === 'income' || 
                     (tx.type && ['orderan', 'kas_masuk_manual', 'panjar_pelunasan', 'pemutihan_piutang'].includes(tx.type)) ||
                     tx.source_type === 'transfer_masuk';
      
      if (isIncome) {
        totalMasuk += tx.amount;
        runningBalance += tx.amount;
      } else {
        totalKeluar += tx.amount;
        runningBalance -= tx.amount;
      }
    });
    
    console.log(`Saldo awal: ${initialBalance.toLocaleString('id-ID')}`);
    console.log(`Total kas masuk: ${totalMasuk.toLocaleString('id-ID')}`);
    console.log(`Total kas keluar: ${totalKeluar.toLocaleString('id-ID')}`);
    console.log(`Selisih: ${(totalMasuk - totalKeluar).toLocaleString('id-ID')}`);
    console.log(`Saldo seharusnya: ${runningBalance.toLocaleString('id-ID')}`);
    console.log(`Saldo di database: ${currentBalance.toLocaleString('id-ID')}`);
    console.log(`Perbedaan: ${(currentBalance - runningBalance).toLocaleString('id-ID')}`);
    
    // 4. Cek transaksi pada tanggal 16
    console.log("\n4. TRANSAKSI PADA TANGGAL 16:");
    const tgl16Transactions = transactions.filter(tx => {
      const txDate = new Date(tx.created_at);
      return txDate.getDate() === 16 && 
             txDate.getMonth() === 7 && // Agustus (0-indexed)
             txDate.getFullYear() === 2025;
    });
    
    console.log(`Jumlah transaksi tgl 16: ${tgl16Transactions.length}`);
    if (tgl16Transactions.length > 0) {
      console.table(tgl16Transactions.map(tx => ({
        waktu: tx.created_at,
        deskripsi: tx.description,
        jenis: tx.source_type || tx.type,
        amount: tx.amount,
        transaction_type: tx.transaction_type
      })));
    }
    
  } catch (error) {
    console.error('Error in analysis:', error);
  }
}

// Jalankan analisis
checkKasKecil();