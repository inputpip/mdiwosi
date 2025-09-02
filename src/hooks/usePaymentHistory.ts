import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PaymentHistoryRecord {
  id: string;
  amount: number;
  description: string;
  account_name?: string;
  created_by_name?: string;
  created_at: string;
  reference_number?: string;
}

export function usePaymentHistory(transactionId: string) {
  const { data: paymentHistory, isLoading, error } = useQuery({
    queryKey: ['paymentHistory', transactionId],
    queryFn: async (): Promise<PaymentHistoryRecord[]> => {
      if (!transactionId) return [];
      
      const { data, error } = await supabase
        .from('cash_history')
        .select(`
          id,
          amount,
          description,
          account_name,
          created_by_name,
          created_at,
          reference_number,
          accounts!account_id (
            name
          )
        `)
        .eq('source_type', 'receivable_payment')
        .eq('reference_number', transactionId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch payment history: ${error.message}`);
      }

      // Map the data to include account_name from the join if missing
      return (data || []).map(item => ({
        ...item,
        account_name: item.account_name || (item.accounts?.name) || 'Unknown Account'
      }));
    },
    enabled: !!transactionId
  });

  return {
    paymentHistory: paymentHistory || [],
    isLoading,
    error
  };
}

// Hook for batch fetching payment history for multiple transactions
export function usePaymentHistoryBatch(transactionIds: string[]) {
  const { data: paymentHistories, isLoading, error } = useQuery({
    queryKey: ['paymentHistoryBatch', transactionIds],
    queryFn: async (): Promise<Record<string, PaymentHistoryRecord[]>> => {
      if (!transactionIds.length) return {};
      
      const { data, error } = await supabase
        .from('cash_history')
        .select(`
          id,
          amount,
          description,
          account_name,
          created_by_name,
          created_at,
          reference_number,
          accounts!account_id (
            name
          )
        `)
        .eq('source_type', 'receivable_payment')
        .in('reference_number', transactionIds)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch payment histories: ${error.message}`);
      }

      // Group by reference_number (transaction ID) and map account names
      const grouped: Record<string, PaymentHistoryRecord[]> = {};
      
      (data || []).forEach(item => {
        const transactionId = item.reference_number || '';
        if (!grouped[transactionId]) {
          grouped[transactionId] = [];
        }
        
        grouped[transactionId].push({
          ...item,
          account_name: item.account_name || (item.accounts?.name) || 'Unknown Account'
        });
      });

      return grouped;
    },
    enabled: transactionIds.length > 0
  });

  return {
    paymentHistories: paymentHistories || {},
    isLoading,
    error
  };
}