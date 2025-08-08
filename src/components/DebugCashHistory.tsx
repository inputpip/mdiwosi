"use client"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { supabase } from "@/integrations/supabase/client"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, Database, AlertTriangle, CheckCircle } from "lucide-react"
import { format } from "date-fns"
import { id } from "date-fns/locale/id"

interface RawData {
  tableName: string
  count: number
  data: any[]
  error?: string
}

export function DebugCashHistory() {
  const [debugData, setDebugData] = useState<RawData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  const fetchDebugData = async () => {
    setIsLoading(true)
    const results: RawData[] = []

    // Check cash_history table
    try {
      const { data: cashData, error: cashError } = await supabase
        .from('cash_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)

      results.push({
        tableName: 'cash_history',
        count: cashData?.length || 0,
        data: cashData || [],
        error: cashError?.message
      })
    } catch (err) {
      results.push({
        tableName: 'cash_history',
        count: 0,
        data: [],
        error: `Table error: ${err}`
      })
    }

    // Check transactions table (untuk melihat apakah ada data transaksi hari ini)
    try {
      const today = new Date()
      const startOfDay = new Date(today.setHours(0, 0, 0, 0))
      const endOfDay = new Date(today.setHours(23, 59, 59, 999))

      const { data: transactionData, error: transactionError } = await supabase
        .from('transactions')
        .select('*')
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString())
        .order('created_at', { ascending: false })

      results.push({
        tableName: 'transactions (today)',
        count: transactionData?.length || 0,
        data: transactionData || [],
        error: transactionError?.message
      })
    } catch (err) {
      results.push({
        tableName: 'transactions (today)',
        count: 0,
        data: [],
        error: `Table error: ${err}`
      })
    }

    // Check accounts table
    try {
      const { data: accountData, error: accountError } = await supabase
        .from('accounts')
        .select('*')
        .order('created_at', { ascending: false })

      results.push({
        tableName: 'accounts',
        count: accountData?.length || 0,
        data: accountData || [],
        error: accountError?.message
      })
    } catch (err) {
      results.push({
        tableName: 'accounts',
        count: 0,
        data: [],
        error: `Table error: ${err}`
      })
    }

    setDebugData(results)
    setLastRefresh(new Date())
    setIsLoading(false)
  }

  useEffect(() => {
    fetchDebugData()
  }, [])

  const syncTransactionsToCashHistory = async () => {
    setIsLoading(true)
    try {
      // Get today's transactions yang belum ada di cash_history
      const today = new Date()
      const startOfDay = new Date(today.setHours(0, 0, 0, 0))
      
      const { data: todayTransactions, error: transError } = await supabase
        .from('transactions')
        .select(`
          *,
          customer:customers(name),
          account:accounts(name)
        `)
        .gte('created_at', startOfDay.toISOString())
        .order('created_at', { ascending: false })

      if (transError) {
        console.error('Error fetching transactions:', transError)
        return
      }

      // Insert ke cash_history untuk setiap transaksi
      for (const transaction of todayTransactions || []) {
        const cashHistoryEntry = {
          account_id: transaction.account_id,
          account_name: transaction.account?.name || 'Unknown Account',
          type: 'orderan' as const,
          amount: transaction.total_amount,
          description: `Transaksi dari ${transaction.customer?.name || 'Customer'} - ${transaction.items_summary || 'Transaction'}`,
          reference_id: transaction.id,
          reference_name: transaction.customer?.name || 'Unknown Customer',
          user_id: transaction.created_by,
          user_name: transaction.created_by // Bisa diperbaiki dengan join ke users table
        }

        // Check if already exists
        const { data: existing } = await supabase
          .from('cash_history')
          .select('id')
          .eq('reference_id', transaction.id)
          .eq('type', 'orderan')
          .single()

        if (!existing) {
          const { error: insertError } = await supabase
            .from('cash_history')
            .insert(cashHistoryEntry)

          if (insertError) {
            console.error('Error inserting cash history:', insertError)
          }
        }
      }

      // Refresh debug data
      await fetchDebugData()
    } catch (err) {
      console.error('Sync error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Debug Data Laporan Keuangan
              </CardTitle>
              <CardDescription>
                Periksa data di Supabase dan sinkronisasi laporan keuangan
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                onClick={syncTransactionsToCashHistory}
                disabled={isLoading}
                variant="outline"
                size="sm"
              >
                Sync Transaksi ke Cash History
              </Button>
              <Button 
                onClick={fetchDebugData}
                disabled={isLoading}
                size="sm"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Last updated: {format(lastRefresh, 'dd MMM yyyy HH:mm:ss', { locale: id })}
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {debugData.map((table) => (
              <Card key={table.tableName} className="border-l-4 border-l-blue-500">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      {table.tableName}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {table.error ? (
                        <Badge variant="destructive" className="flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Error
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          {table.count} records
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {table.error ? (
                    <div className="text-red-600 text-sm bg-red-50 p-3 rounded">
                      <strong>Error:</strong> {table.error}
                    </div>
                  ) : table.data.length === 0 ? (
                    <div className="text-muted-foreground text-sm bg-gray-50 p-3 rounded text-center">
                      No data found in {table.tableName}
                    </div>
                  ) : (
                    <div className="max-h-60 overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {Object.keys(table.data[0] || {}).slice(0, 5).map((key) => (
                              <TableHead key={key} className="text-xs">
                                {key}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {table.data.slice(0, 5).map((row, index) => (
                            <TableRow key={index}>
                              {Object.values(row).slice(0, 5).map((value: any, i) => (
                                <TableCell key={i} className="text-xs font-mono max-w-32 truncate">
                                  {typeof value === 'object' && value !== null 
                                    ? JSON.stringify(value).substring(0, 20) + '...'
                                    : String(value || '').substring(0, 20) + (String(value || '').length > 20 ? '...' : '')
                                  }
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      {table.data.length > 5 && (
                        <p className="text-xs text-muted-foreground mt-2 text-center">
                          ... and {table.data.length - 5} more records
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-orange-200 bg-orange-50">
        <CardHeader>
          <CardTitle className="text-orange-800 text-sm">
            Tentang Data yang Dihapus
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-orange-700">
          <p><strong>Data yang sudah dihapus TIDAK akan mempengaruhi laporan keuangan</strong> karena:</p>
          <ul className="list-disc pl-4 mt-2 space-y-1">
            <li>Laporan keuangan hanya menampilkan data yang masih ada di database</li>
            <li>Jika data dihapus dari tabel transaksi, maka tidak akan muncul di laporan</li>
            <li>Jika data dihapus dari cash_history, maka tidak akan muncul di arus kas</li>
            <li>Tidak ada "phantom data" atau referensi yang rusak</li>
          </ul>
          <p className="mt-3 font-medium">
            Jadi, data yang Anda hapus tidak akan mengganggu akurasi laporan keuangan.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}