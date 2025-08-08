import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CashHistory, CreateCashHistoryData } from '@/types/cashHistory'
import { supabase } from '@/integrations/supabase/client'

// Helper to map from DB (snake_case) to App (camelCase)
const fromDbToApp = (dbHistory: any): CashHistory => ({
  id: dbHistory.id,
  accountId: dbHistory.account_id,
  accountName: dbHistory.account_name,
  type: dbHistory.type,
  amount: dbHistory.amount,
  description: dbHistory.description,
  referenceId: dbHistory.reference_id,
  referenceName: dbHistory.reference_name,
  userId: dbHistory.user_id,
  userName: dbHistory.user_name,
  createdAt: new Date(dbHistory.created_at),
  updatedAt: new Date(dbHistory.updated_at),
})

// Helper to map from App (camelCase) to DB (snake_case)
const fromAppToDb = (appHistory: CreateCashHistoryData) => ({
  account_id: appHistory.accountId,
  account_name: appHistory.accountName,
  type: appHistory.type,
  amount: appHistory.amount,
  description: appHistory.description,
  reference_id: appHistory.referenceId,
  reference_name: appHistory.referenceName,
  user_id: appHistory.userId,
  user_name: appHistory.userName,
})

export const useCashHistory = () => {
  const queryClient = useQueryClient()

  const { data: cashHistory, isLoading } = useQuery({
    queryKey: ['cashHistory'],
    queryFn: async (): Promise<CashHistory[]> => {
      const { data, error } = await supabase
        .from('cash_history')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching cash history:', error)
        throw new Error(error.message)
      }
      return data ? data.map(fromDbToApp) : []
    }
  })

  const addCashHistory = useMutation({
    mutationFn: async (historyData: CreateCashHistoryData): Promise<CashHistory> => {
      const dbData = fromAppToDb(historyData)
      const { data, error } = await supabase
        .from('cash_history')
        .insert(dbData)
        .select()
        .single()
      
      if (error) {
        console.error('Error creating cash history:', error)
        throw new Error(error.message)
      }
      return fromDbToApp(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashHistory'] })
    },
  })

  const getCashHistoryByAccount = (accountId: string): CashHistory[] => {
    return cashHistory?.filter(history => history.accountId === accountId) || []
  }

  const getCashHistoryByDateRange = async (from: Date, to: Date): Promise<CashHistory[]> => {
    const { data, error } = await supabase
      .from('cash_history')
      .select('*')
      .gte('created_at', from.toISOString())
      .lte('created_at', to.toISOString())
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)
    return data ? data.map(fromDbToApp) : []
  }

  const getCashHistoryByType = (type: string): CashHistory[] => {
    return cashHistory?.filter(history => history.type === type) || []
  }

  return {
    cashHistory,
    isLoading,
    addCashHistory,
    getCashHistoryByAccount,
    getCashHistoryByDateRange,
    getCashHistoryByType,
  }
}