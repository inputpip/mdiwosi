import { useQuery } from '@tanstack/react-query'
import { PaymentHistory } from '@/types/paymentHistory'
import { supabase } from '@/integrations/supabase/client'

// Helper to map from DB (snake_case) to App (camelCase)
const fromDb = (dbPaymentHistory: {
  id: string;
  transaction_id: string;
  amount: number;
  payment_date: string;
  remaining_amount: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}): PaymentHistory => ({
  id: dbPaymentHistory.id,
  transactionId: dbPaymentHistory.transaction_id,
  amount: dbPaymentHistory.amount,
  paymentDate: new Date(dbPaymentHistory.payment_date),
  remainingAmount: dbPaymentHistory.remaining_amount,
  notes: dbPaymentHistory.notes,
  createdAt: new Date(dbPaymentHistory.created_at),
  updatedAt: new Date(dbPaymentHistory.updated_at),
});

export const usePaymentHistory = (transactionId: string) => {
  const { data: paymentHistory, isLoading } = useQuery<PaymentHistory[]>({
    queryKey: ['paymentHistory', transactionId],
    queryFn: async () => {
      // For now, we'll create mock data based on transaction payment information
      // In a real implementation, this would query a payment_history table
      const { data: transaction, error } = await supabase
        .from('transactions')
        .select('id, total, paid_amount, created_at, order_date')
        .eq('id', transactionId)
        .single();

      if (error) throw new Error(error.message);
      
      if (!transaction || transaction.paid_amount === 0) {
        return [];
      }

      // Mock payment history - in real implementation, this would come from payment_history table
      const mockHistory: PaymentHistory[] = [];
      
      if (transaction.paid_amount > 0) {
        // Create a payment history entry for the current paid amount
        // This is a simplified version - in reality you'd have multiple entries
        mockHistory.push({
          id: `payment_${transactionId}_1`,
          transactionId: transactionId,
          amount: transaction.paid_amount,
          paymentDate: new Date(transaction.created_at),
          remainingAmount: transaction.total - transaction.paid_amount,
          notes: 'Pembayaran parsial',
          createdAt: new Date(transaction.created_at),
          updatedAt: new Date(transaction.created_at),
        });
      }

      return mockHistory;
    },
    enabled: !!transactionId,
  });

  return { paymentHistory, isLoading };
};

export const usePaymentHistoryBatch = (transactionIds: string[]) => {
  const { data: paymentHistories, isLoading } = useQuery<Record<string, PaymentHistory[]>>({
    queryKey: ['paymentHistoryBatch', transactionIds.sort().join(',')],
    queryFn: async () => {
      if (transactionIds.length === 0) return {};

      // Get all transactions in batch
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('id, total, paid_amount, created_at, order_date')
        .in('id', transactionIds);

      if (error) throw new Error(error.message);

      const result: Record<string, PaymentHistory[]> = {};

      transactions?.forEach(transaction => {
        const mockHistory: PaymentHistory[] = [];
        
        if (transaction.paid_amount > 0) {
          mockHistory.push({
            id: `payment_${transaction.id}_1`,
            transactionId: transaction.id,
            amount: transaction.paid_amount,
            paymentDate: new Date(transaction.created_at),
            remainingAmount: transaction.total - transaction.paid_amount,
            notes: 'Pembayaran parsial',
            createdAt: new Date(transaction.created_at),
            updatedAt: new Date(transaction.created_at),
          });
        }

        result[transaction.id] = mockHistory;
      });

      return result;
    },
    enabled: transactionIds.length > 0,
  });

  return { paymentHistories: paymentHistories || {}, isLoading };
};