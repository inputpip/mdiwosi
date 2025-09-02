export interface EmployeeAdvance {
  id: string;
  employeeId: string;
  employeeName: string;
  amount: number;
  date: Date;
  notes?: string;
  remainingAmount: number; // Sisa utang
  repayments: AdvanceRepayment[];
  createdAt: Date;
  updatedAt?: Date; // Tanggal terakhir diupdate (pelunasan)
  accountId: string; // BARU: Akun sumber dana
  accountName: string; // BARU: Nama akun sumber dana
}

export interface AdvanceRepayment {
  id: string;
  amount: number;
  date: Date;
  recordedBy: string; // Siapa yang mencatat pembayaran
  targetAccountId?: string; // Akun tujuan pembayaran
  targetAccountName?: string; // Nama akun tujuan pembayaran
}