import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { startOfDay, endOfDay, format } from 'date-fns'

// Types for report data
export interface AccountBalance {
  id: string
  name: string
  type: string
  balance: number
  initialBalance: number
}

export interface CashFlowSummary {
  accountId: string
  accountName: string
  cashIn: number
  cashOut: number
  startBalance: number
  endBalance: number
}

export interface SalesSummary {
  totalCash: number
  totalCredit: number
  totalSales: number
  transactionCount: number
  monthlyBreakdown?: { [key: string]: number }
}

export interface ExpenseSummary {
  totalExpenses: number
  expensesByCategory: { [key: string]: number }
}

export interface DailyTransaction {
  id: string
  orderNumber: string
  time: string
  customerName: string
  total: number
  paidAmount: number
  remaining: number
  paymentStatus: string
  cashierName: string
}

export interface DailyReport {
  date: string
  totalSales: number
  cashIn: number
  cashOut: number
  netCash: number
  salesSummary: SalesSummary
  cashFlowByAccount: CashFlowSummary[]
  transactions: DailyTransaction[]
}

export const useFinancialReports = () => {
  // Get all account balances
  const { data: accountBalances, isLoading: loadingBalances } = useQuery({
    queryKey: ['accountBalances'],
    queryFn: async (): Promise<AccountBalance[]> => {
      const { data, error } = await supabase
        .from('accounts')
        .select('id, name, type, balance, initial_balance')
        .order('name')

      if (error) throw new Error(error.message)
      
      return data.map(account => ({
        id: account.id,
        name: account.name,
        type: account.type,
        balance: account.balance,
        initialBalance: account.initial_balance || 0
      }))
    }
  })

  // Get cash flow summary
  const { data: cashFlowSummary, isLoading: loadingCashFlow } = useQuery({
    queryKey: ['cashFlowSummary'],
    queryFn: async (): Promise<CashFlowSummary[]> => {
      const { data: cashHistory, error } = await supabase
        .from('cash_history')
        .select('account_id, account_name, amount')

      if (error) throw new Error(error.message)

      // Group by account and calculate totals
      const accountSummary: { [key: string]: CashFlowSummary } = {}
      
      cashHistory?.forEach(history => {
        if (!accountSummary[history.account_id]) {
          accountSummary[history.account_id] = {
            accountId: history.account_id,
            accountName: history.account_name,
            cashIn: 0,
            cashOut: 0,
            startBalance: 0,
            endBalance: 0
          }
        }
        
        if (history.amount > 0) {
          accountSummary[history.account_id].cashIn += history.amount
        } else {
          accountSummary[history.account_id].cashOut += Math.abs(history.amount)
        }
      })

      // Add current balances from accounts
      if (accountBalances) {
        accountBalances.forEach(account => {
          if (accountSummary[account.id]) {
            accountSummary[account.id].endBalance = account.balance
            accountSummary[account.id].startBalance = account.initialBalance
          }
        })
      }

      return Object.values(accountSummary)
    },
    enabled: !!accountBalances
  })

  // Get sales summary
  const { data: salesSummary, isLoading: loadingSales } = useQuery({
    queryKey: ['salesSummary'],
    queryFn: async (): Promise<SalesSummary> => {
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('total, paid_amount, payment_status, created_at')
        .eq('status', 'Selesai')

      if (error) throw new Error(error.message)

      let totalCash = 0
      let totalCredit = 0
      let totalSales = 0
      const monthlyBreakdown: { [key: string]: number } = {}

      transactions?.forEach(transaction => {
        totalSales += transaction.total
        
        if (transaction.payment_status === 'Lunas') {
          totalCash += transaction.paid_amount
        } else {
          totalCredit += (transaction.total - transaction.paid_amount)
          totalCash += transaction.paid_amount
        }

        // Monthly breakdown
        const month = format(new Date(transaction.created_at), 'yyyy-MM')
        monthlyBreakdown[month] = (monthlyBreakdown[month] || 0) + transaction.total
      })

      return {
        totalCash,
        totalCredit,
        totalSales,
        transactionCount: transactions?.length || 0,
        monthlyBreakdown
      }
    }
  })

  // Get expense summary
  const { data: expenseSummary, isLoading: loadingExpenses } = useQuery({
    queryKey: ['expenseSummary'],
    queryFn: async (): Promise<ExpenseSummary> => {
      const { data: expenses, error } = await supabase
        .from('expenses')
        .select('amount, category, description')

      if (error) throw new Error(error.message)

      let totalExpenses = 0
      const expensesByCategory: { [key: string]: number } = {}

      expenses?.forEach(expense => {
        totalExpenses += expense.amount
        const category = expense.category || 'Lainnya'
        expensesByCategory[category] = (expensesByCategory[category] || 0) + expense.amount
      })

      return {
        totalExpenses,
        expensesByCategory
      }
    }
  })

  return {
    accountBalances,
    cashFlowSummary,
    salesSummary,
    expenseSummary,
    isLoading: loadingBalances || loadingCashFlow || loadingSales || loadingExpenses
  }
}

export const useDailyReport = (date: Date) => {
  return useQuery({
    queryKey: ['dailyReport', format(date, 'yyyy-MM-dd')],
    queryFn: async (): Promise<DailyReport> => {
      const startDate = startOfDay(date)
      const endDate = endOfDay(date)
      const dateStr = format(date, 'yyyy-MM-dd')
      
      // Check if this is "all data" request (year 2020 or earlier)
      const isAllDataRequest = date.getFullYear() <= 2020

      // Get daily transactions - support all data or date filtered
      let transactionsQuery = supabase
        .from('transactions')
        .select(`
          id,
          order_number,
          customer_name,
          total,
          paid_amount,
          payment_status,
          cashier_name,
          created_at
        `)
        
      if (!isAllDataRequest) {
        transactionsQuery = transactionsQuery
          .gte('created_at', startDate.toISOString())
          .lt('created_at', endDate.toISOString())
      }
      
      const { data: transactions, error: transError } = await transactionsQuery

      if (transError) throw new Error(transError.message)
      
      console.log('Daily transactions:', transactions?.length || 0, 'for date:', dateStr)
      console.log('Date range:', startDate.toISOString(), 'to', endDate.toISOString())

      // Get daily cash history - support all data or date filtered
      let cashHistoryQuery = supabase
        .from('cash_history')
        .select('account_id, account_name, amount, type')
        
      if (!isAllDataRequest) {
        cashHistoryQuery = cashHistoryQuery
          .gte('created_at', startDate.toISOString())
          .lt('created_at', endDate.toISOString())
      }
      
      const { data: cashHistory, error: cashError } = await cashHistoryQuery

      if (cashError) throw new Error(cashError.message)
      
      console.log('Daily cash history:', cashHistory?.length || 0, 'for date:', dateStr)

      // Process transactions
      let totalSales = 0
      let totalCash = 0
      let totalCredit = 0

      const dailyTransactions: DailyTransaction[] = transactions?.map(t => {
        totalSales += t.total
        if (t.payment_status === 'Lunas') {
          totalCash += t.paid_amount
        } else {
          totalCredit += (t.total - t.paid_amount)
          totalCash += t.paid_amount
        }

        return {
          id: t.id,
          orderNumber: t.order_number || '-',
          time: format(new Date(t.created_at), 'HH:mm'),
          customerName: t.customer_name,
          total: t.total,
          paidAmount: t.paid_amount,
          remaining: t.total - t.paid_amount,
          paymentStatus: t.payment_status,
          cashierName: t.cashier_name
        }
      }) || []

      // Process cash flow
      let cashIn = 0
      let cashOut = 0
      const accountCashFlow: { [key: string]: CashFlowSummary } = {}

      cashHistory?.forEach(history => {
        if (!accountCashFlow[history.account_id]) {
          accountCashFlow[history.account_id] = {
            accountId: history.account_id,
            accountName: history.account_name,
            cashIn: 0,
            cashOut: 0,
            startBalance: 0,
            endBalance: 0
          }
        }

        if (history.amount > 0) {
          accountCashFlow[history.account_id].cashIn += history.amount
          cashIn += history.amount
        } else {
          accountCashFlow[history.account_id].cashOut += Math.abs(history.amount)
          cashOut += Math.abs(history.amount)
        }
      })

      const reportData = {
        date: isAllDataRequest ? 'Semua Data Historis' : dateStr,
        totalSales: totalSales || 0,
        cashIn: cashIn || 0,
        cashOut: cashOut || 0,
        netCash: (cashIn || 0) - (cashOut || 0),
        salesSummary: {
          totalCash: totalCash || 0,
          totalCredit: totalCredit || 0,
          totalSales: totalSales || 0,
          transactionCount: transactions?.length || 0
        },
        cashFlowByAccount: Object.values(accountCashFlow),
        transactions: dailyTransactions || []
      }
      
      console.log('Final daily report:', reportData)
      
      return reportData
    }
  })
}