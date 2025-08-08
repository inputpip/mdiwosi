export interface PaymentHistory {
  id: string;
  transactionId: string;
  amount: number;
  paymentDate: Date;
  remainingAmount: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}