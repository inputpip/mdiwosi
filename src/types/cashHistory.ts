export type CashTransactionType = 
  | 'orderan' // Kas masuk dari orderan/transaksi
  | 'kas_masuk_manual' // Kas masuk manual
  | 'kas_keluar_manual' // Kas keluar manual
  | 'panjar_pengambilan' // Panjar karyawan - pengambilan
  | 'panjar_pelunasan' // Panjar karyawan - pelunasan
  | 'pengeluaran' // Pengeluaran operasional
  | 'pembayaran_po' // Pembayaran Purchase Order
  | 'pemutihan_piutang' // Pemutihan piutang
  | 'transfer_masuk' // Transfer masuk dari akun lain
  | 'transfer_keluar' // Transfer keluar ke akun lain

export interface CashHistory {
  id: string
  accountId: string
  accountName: string
  type: CashTransactionType
  amount: number // Positive for inflow, negative for outflow
  description: string
  referenceId?: string // ID referensi (transaction_id, expense_id, dll)
  referenceName?: string // Nama referensi (customer name, employee name, dll)
  userId: string
  userName: string
  createdAt: Date
  updatedAt: Date
}

export interface CreateCashHistoryData {
  accountId: string
  accountName: string
  type: CashTransactionType
  amount: number
  description: string
  referenceId?: string
  referenceName?: string
  userId: string
  userName: string
}