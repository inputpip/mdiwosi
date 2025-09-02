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
  updatedAt: dbAdvance.updated_at ? new Date(dbAdvance.updated_at) : undefined,
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
            created_by_name: user.name || user.email || 'Unknown User'
            // created_at akan otomatis menggunakan NOW() dari database
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
      // Get the advance details first
      const { data: currentAdvance, error: advanceGetError } = await supabase
        .from('employee_advances')
        .select('*')
        .eq('id', advanceId)
        .single();

      if (advanceGetError || !currentAdvance) {
        throw new Error('Failed to get advance details: ' + advanceGetError?.message);
      }

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
        .select('remaining_amount, updated_at')
        .eq('id', advanceId)
        .single();

      if (advanceError) {
        console.error('Failed to get updated advance:', advanceError.message);
        return;
      }

      // Record repayment in cash_history as income (proper accounting)
      if (repaymentData.targetAccountId && user) {
        try {
          // Add the payment amount to target account
          updateAccountBalance.mutate({ 
            accountId: repaymentData.targetAccountId, 
            amount: repaymentData.amount 
          });

          // Create income entry in cash_history for the repayment
          const cashFlowRecord = {
            account_id: repaymentData.targetAccountId,
            transaction_type: 'income',
            amount: repaymentData.amount,
            description: `Pelunasan panjar karyawan dari ${currentAdvance.employee_name} - ${repaymentData.amount === currentAdvance.remaining_amount + repaymentData.amount ? 'LUNAS' : 'Cicilan'}`,
            reference_number: `REP-${advanceId.slice(4)}-${Date.now()}`,
            source_type: 'employee_advance_repayment',
            created_by: user.id,
            created_by_name: user.name || user.email || 'Unknown User'
            // created_at akan otomatis menggunakan NOW() dari database
          };

          console.log('Recording advance repayment in cash history:', cashFlowRecord);

          const { data: insertedData, error: cashFlowError } = await supabase
            .from('cash_history')
            .insert(cashFlowRecord)
            .select();

          if (cashFlowError) {
            console.error('Failed to record advance repayment in cash flow:', cashFlowError.message);
          } else {
            console.log('Successfully recorded advance repayment in cash history:', insertedData);
          }

        } catch (error) {
          console.error('Error processing advance repayment cash flow:', error);
        }
      }

      // If fully paid, update timestamp for completion tracking
      if (updatedAdvance.remaining_amount <= 0) {
        console.log(`Panjar ${advanceId} sudah lunas - expense tetap disimpan, income pelunasan sudah dicatat`);
        
        // Update the advance record with updated_at timestamp
        await supabase
          .from('employee_advances')
          .update({ updated_at: repaymentData.date })
          .eq('id', advanceId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employeeAdvances'] });
      queryClient.invalidateQueries({ queryKey: ['cashFlow'] });
      queryClient.invalidateQueries({ queryKey: ['cashBalance'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    }
  });

  const deleteAdvance = useMutation({
    mutationFn: async (advanceToDelete: EmployeeAdvance): Promise<void> => {
      console.log('DEBUG: Deleting advance:', {
        id: advanceToDelete.id,
        accountId: advanceToDelete.accountId,
        accountName: advanceToDelete.accountName,
        amount: advanceToDelete.amount,
        employeeName: advanceToDelete.employeeName
      });

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
      console.log('DEBUG: Returning amount to account:', {
        accountId: advanceToDelete.accountId,
        accountName: advanceToDelete.accountName,
        amount: advanceToDelete.amount
      });
      
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