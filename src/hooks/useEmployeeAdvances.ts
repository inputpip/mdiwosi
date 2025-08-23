import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { EmployeeAdvance, AdvanceRepayment } from '@/types/employeeAdvance'
import { useAccounts } from './useAccounts';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

const fromDbToApp = (dbAdvance: any): EmployeeAdvance => ({
  id: dbAdvance.id,
  employeeId: dbAdvance.employee_id,
  employeeName: dbAdvance.employee_name,
  amount: dbAdvance.amount,
  date: new Date(dbAdvance.date),
  notes: dbAdvance.notes,
  remainingAmount: dbAdvance.remaining_amount,
  repayments: (dbAdvance.advance_repayments || []).map((r: any) => ({
    id: r.id,
    amount: r.amount,
    date: new Date(r.date),
    recordedBy: r.recorded_by,
  })),
  createdAt: new Date(dbAdvance.created_at),
  accountId: dbAdvance.account_id,
  accountName: dbAdvance.account_name,
});

const fromAppToDb = (appAdvance: Partial<EmployeeAdvance>) => {
  const dbData: { [key: string]: any } = {};
  if (appAdvance.id !== undefined) dbData.id = appAdvance.id;
  if (appAdvance.employeeId !== undefined) dbData.employee_id = appAdvance.employeeId;
  if (appAdvance.employeeName !== undefined) dbData.employee_name = appAdvance.employeeName;
  if (appAdvance.amount !== undefined) dbData.amount = appAdvance.amount;
  if (appAdvance.date !== undefined) dbData.date = appAdvance.date;
  if (appAdvance.notes !== undefined) dbData.notes = appAdvance.notes;
  if (appAdvance.remainingAmount !== undefined) dbData.remaining_amount = appAdvance.remainingAmount;
  if (appAdvance.accountId !== undefined) dbData.account_id = appAdvance.accountId;
  if (appAdvance.accountName !== undefined) dbData.account_name = appAdvance.accountName;
  return dbData;
};

export const useEmployeeAdvances = () => {
  const queryClient = useQueryClient();
  const { updateAccountBalance } = useAccounts();
  const { user } = useAuth();

  const { data: advances, isLoading, isError, error } = useQuery<EmployeeAdvance[]>({
    queryKey: ['employeeAdvances'],
    queryFn: async () => {
      const { data, error } = await supabase.from('employee_advances').select('*, advance_repayments:advance_repayments(*)');
      if (error) {
        console.error("❌ Gagal mengambil data panjar:", error.message);
        throw new Error(error.message);
      }
      return data ? data.map(fromDbToApp) : [];
    }
  });

  const addAdvance = useMutation({
    mutationFn: async (newData: Omit<EmployeeAdvance, 'id' | 'createdAt' | 'remainingAmount' | 'repayments'>): Promise<EmployeeAdvance> => {
      const advanceToInsert = {
        ...newData,
        remainingAmount: newData.amount,
      };
      const dbData = fromAppToDb(advanceToInsert);
      
      const { data, error } = await supabase
        .from('employee_advances')
        .insert({ ...dbData, id: `adv-${Date.now()}` })
        .select()
        .single();

      if (error) throw new Error(error.message);
      
      updateAccountBalance.mutate({ accountId: newData.accountId, amount: -newData.amount });

      // Record in cash_history for advance tracking
      if (newData.accountId && user) {
        try {
          const cashFlowRecord = {
            account_id: newData.accountId,
            transaction_type: 'expense',
            amount: newData.amount,
            description: `Panjar karyawan untuk ${newData.employeeName}: ${newData.notes || 'Tidak ada keterangan'}`,
            reference_number: `ADV-${data.id.slice(4)}`, // Remove 'adv-' prefix
            source_type: 'employee_advance',
            created_by: user.id,
            created_by_name: user.name || user.email || 'Unknown User',
            created_at: newData.date // gunakan tanggal input panjar
          };

          console.log('Recording advance in cash history:', cashFlowRecord);

          const { data: insertedData, error: cashFlowError } = await supabase
            .from('cash_history')
            .insert(cashFlowRecord)
            .select();

          if (cashFlowError) {
            console.error('Failed to record advance in cash flow:', cashFlowError.message);
            console.error('Cash flow record that failed:', cashFlowRecord);
          } else {
            console.log('Successfully recorded advance in cash history:', insertedData);
          }
        } catch (error) {
          console.error('Error recording advance cash flow:', error);
        }
      }

      return fromDbToApp({ ...data, advance_repayments: [] });
    },
    onSuccess: () => {
      console.log('Successfully added advance, invalidating cache...');
      queryClient.invalidateQueries({ queryKey: ['employeeAdvances'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['cashFlow'] });
      queryClient.invalidateQueries({ queryKey: ['cashBalance'] });
      
      // Force refetch immediately
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['cashFlow'] });
      }, 100);
    },
  });

  const addRepayment = useMutation({
    mutationFn: async ({ advanceId, repaymentData }: { advanceId: string, repaymentData: Omit<AdvanceRepayment, 'id'> }): Promise<void> => {
      const newRepayment = {
        id: `rep-${Date.now()}`,
        advance_id: advanceId,
        amount: repaymentData.amount,
        date: repaymentData.date,
        recorded_by: repaymentData.recordedBy,
      };
      const { error: insertError } = await supabase.from('advance_repayments').insert(newRepayment);
      if (insertError) throw insertError;

      // Call RPC to update remaining amount
      const { error: rpcError } = await supabase.rpc('update_remaining_amount', {
        p_advance_id: advanceId
      });
      if (rpcError) throw new Error(rpcError.message);

      // Get updated advance to check if fully paid
      const { data: updatedAdvance, error: advanceError } = await supabase
        .from('employee_advances')
        .select('remaining_amount')
        .eq('id', advanceId)
        .single();

      if (advanceError) {
        console.error('Failed to get updated advance:', advanceError.message);
        return;
      }

      // If fully paid (remaining_amount = 0), remove from cash_history
      if (updatedAdvance.remaining_amount <= 0) {
        console.log(`Panjar ${advanceId} sudah lunas, menghapus dari cash_history`);
        
        const { error: deleteError } = await supabase
          .from('cash_history')
          .delete()
          .eq('reference_number', `ADV-${advanceId.slice(4)}`)
          .eq('source_type', 'employee_advance');

        if (deleteError) {
          console.error('Failed to delete advance from cash_history:', deleteError.message);
        } else {
          console.log('Successfully removed paid advance from cash_history');
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employeeAdvances'] });
      queryClient.invalidateQueries({ queryKey: ['cashFlow'] });
      queryClient.invalidateQueries({ queryKey: ['cashBalance'] });
    }
  });

  const deleteAdvance = useMutation({
    mutationFn: async (advanceToDelete: EmployeeAdvance): Promise<void> => {
      // First delete related cash_history records
      const { error: cashHistoryError } = await supabase
        .from('cash_history')
        .delete()
        .eq('reference_number', `ADV-${advanceToDelete.id.slice(4)}`)
        .eq('source_type', 'employee_advance');
      
      if (cashHistoryError) {
        console.error('Failed to delete related cash history:', cashHistoryError.message);
        // Continue anyway, don't throw
      }

      // Delete associated repayments first
      await supabase.from('advance_repayments').delete().eq('advance_id', advanceToDelete.id);
      
      // Then delete the advance itself
      const { error } = await supabase.from('employee_advances').delete().eq('id', advanceToDelete.id);
      if (error) throw new Error(error.message);

      // Reimburse the account with the original amount
      updateAccountBalance.mutate({ accountId: advanceToDelete.accountId, amount: advanceToDelete.amount });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employeeAdvances'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['cashFlow'] });
    }
  });

  return {
    advances,
    isLoading,
    isError,
    error,
    addAdvance,
    addRepayment,
    deleteAdvance,
  }
}