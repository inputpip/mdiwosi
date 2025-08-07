"use client"
import { useState, useMemo, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from './ui/badge'
import { Separator } from '@/components/ui/separator'
import { Calendar, Calculator, FileText, Printer, Download, DollarSign, ArrowUpDown, Wallet, CreditCard, TrendingUp, TrendingDown } from 'lucide-react'
import { format, startOfDay, endOfDay, isAfter, isBefore, parseISO } from 'date-fns'
import { id } from 'date-fns/locale/id'
import { useTransactions } from '@/hooks/useTransactions'
import { useAccountTransfers } from '@/hooks/useAccountTransfers'
import { useAccounts } from '@/hooks/useAccounts'
import { useExpenses } from '@/hooks/useExpenses'
import { useCompanySettings } from '@/hooks/useCompanySettings'
import { useAuth } from '@/hooks/useAuth'

interface DailyReportData {
  // Sales Summary
  totalSales: number
  totalTransactions: number
  cashSales: number
  creditSales: number
  
  // Payment Collections
  receivablePayments: number
  receivableCount: number
  
  // Cash Flow
  cashInflow: number
  cashOutflow: number
  netCashFlow: number
  
  // Account Transfers
  totalTransfers: number
  transferCount: number
  
  // Expenses
  totalExpenses: number
  expenseCount: number
  
  // Starting and Ending Cash
  startingCash: number
  endingCash: number
}

export const DailyReportSummary = () => {
  const { transactions, isLoading: isTransactionsLoading } = useTransactions()
  const { transfers, getTransfersByDateRange } = useAccountTransfers()
  const { accounts } = useAccounts()
  const { expenses } = useExpenses()
  const { settings } = useCompanySettings()
  const { user } = useAuth()
  
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [dailyTransfers, setDailyTransfers] = useState<any[]>([])
  const [isLoadingTransfers, setIsLoadingTransfers] = useState(false)

  // Permissions
  const canViewFinancials = user && ['admin', 'owner', 'supervisor'].includes(user.role)

  // Get cash account (kas kecil)
  const cashAccount = accounts?.find(acc => 
    acc.name.toLowerCase().includes('kas kecil') || 
    acc.name.toLowerCase().includes('cash') ||
    acc.type === 'cash'
  )

  // Filter data by selected date
  const dailyData = useMemo(() => {
    if (!transactions || !expenses) return null

    const selectedDateStart = startOfDay(new Date(selectedDate))
    const selectedDateEnd = endOfDay(new Date(selectedDate))

    // Filter transactions for the selected date
    const dailyTransactions = transactions.filter(transaction => {
      const transactionDate = new Date(transaction.createdAt)
      return transactionDate >= selectedDateStart && transactionDate <= selectedDateEnd
    })

    // Filter expenses for the selected date
    const dailyExpenses = expenses.filter(expense => {
      const expenseDate = new Date(expense.date)
      return expenseDate >= selectedDateStart && expenseDate <= selectedDateEnd
    })

    // Calculate sales summary
    const totalSales = dailyTransactions.reduce((sum, t) => sum + t.total, 0)
    const totalTransactions = dailyTransactions.length
    const cashSales = dailyTransactions
      .filter(t => t.paymentStatus === 'Lunas')
      .reduce((sum, t) => sum + t.paidAmount, 0)
    const creditSales = dailyTransactions
      .filter(t => t.paymentStatus === 'Kredit' || t.paymentStatus === 'Belum Lunas')
      .reduce((sum, t) => sum + (t.total - t.paidAmount), 0)

    // Calculate receivable payments - this is a simplified calculation
    // In a real system, you'd track payments separately with timestamps
    // For now, we'll estimate based on partial payments on older transactions
    const receivablePayments = transactions
      ?.filter(t => {
        const orderDate = new Date(t.orderDate)
        const selectedDateObj = new Date(selectedDate)
        // Find transactions created before selected date but potentially paid on selected date
        return orderDate.toDateString() !== selectedDateObj.toDateString() && 
               t.paidAmount > 0 && t.paidAmount < t.total &&
               t.paymentStatus === 'Kredit'
      })
      .reduce((sum, t) => sum + Math.min(t.paidAmount, t.total - t.paidAmount), 0) || 0
    
    const receivableCount = transactions
      ?.filter(t => {
        const orderDate = new Date(t.orderDate)
        const selectedDateObj = new Date(selectedDate)
        return orderDate.toDateString() !== selectedDateObj.toDateString() && 
               t.paidAmount > 0 && t.paidAmount < t.total &&
               t.paymentStatus === 'Kredit'
      }).length || 0

    // Calculate expenses
    const totalExpenses = dailyExpenses.reduce((sum, e) => sum + e.amount, 0)
    const expenseCount = dailyExpenses.length

    // Calculate transfers (will be updated when we load transfer data)
    const totalTransfers = dailyTransfers.reduce((sum, t) => sum + t.amount, 0)
    const transferCount = dailyTransfers.length

    // Cash flow calculations
    const cashInflow = cashSales + receivablePayments
    const cashOutflow = totalExpenses + totalTransfers
    const netCashFlow = cashInflow - cashOutflow

    // Starting and ending cash (simplified - would need proper calculation)
    const startingCash = cashAccount?.balance || 0
    const endingCash = startingCash + netCashFlow

    const reportData: DailyReportData = {
      totalSales,
      totalTransactions,
      cashSales,
      creditSales,
      receivablePayments,
      receivableCount,
      cashInflow,
      cashOutflow,
      netCashFlow,
      totalTransfers,
      transferCount,
      totalExpenses,
      expenseCount,
      startingCash,
      endingCash,
    }

    return {
      reportData,
      dailyTransactions,
      dailyExpenses,
    }
  }, [transactions, expenses, dailyTransfers, selectedDate, cashAccount])

  // Load transfers for selected date
  const loadTransfersForDate = useCallback(async (date: string) => {
    setIsLoadingTransfers(true)
    try {
      const startDate = startOfDay(new Date(date))
      const endDate = endOfDay(new Date(date))
      const transfers = await getTransfersByDateRange(startDate, endDate)
      setDailyTransfers(transfers)
    } catch (error) {
      console.error('Failed to load transfers:', error)
      setDailyTransfers([])
    } finally {
      setIsLoadingTransfers(false)
    }
  }, [getTransfersByDateRange])

  // Load transfers when date changes
  useEffect(() => {
    loadTransfersForDate(selectedDate)
  }, [selectedDate, loadTransfersForDate])

  const handleDateChange = (date: string) => {
    setSelectedDate(date)
    loadTransfersForDate(date)
  }

  const handlePrint = () => {
    window.print()
  }

  const handleExport = () => {
    // Simple CSV export
    if (!dailyData) return
    
    const { reportData } = dailyData
    const csvContent = `Laporan Harian,${format(new Date(selectedDate), 'dd MMMM yyyy', { locale: id })}
Toko,${settings?.companyName || 'MDI Wosi'}

RINGKASAN PENJUALAN
Total Penjualan,${reportData.totalSales.toLocaleString()}
Jumlah Transaksi,${reportData.totalTransactions}
Penjualan Tunai,${reportData.cashSales.toLocaleString()}
Penjualan Kredit,${reportData.creditSales.toLocaleString()}

PEMBAYARAN PIUTANG
Pembayaran Diterima,${reportData.receivablePayments.toLocaleString()}
Jumlah Pembayaran,${reportData.receivableCount}

ARUS KAS
Kas Masuk,${reportData.cashInflow.toLocaleString()}
Kas Keluar,${reportData.cashOutflow.toLocaleString()}
Kas Bersih,${reportData.netCashFlow.toLocaleString()}

TRANSFER REKENING
Total Transfer,${reportData.totalTransfers.toLocaleString()}
Jumlah Transfer,${reportData.transferCount}

PENGELUARAN
Total Pengeluaran,${reportData.totalExpenses.toLocaleString()}
Jumlah Pengeluaran,${reportData.expenseCount}

KAS KECIL
Saldo Awal,${reportData.startingCash.toLocaleString()}
Saldo Akhir,${reportData.endingCash.toLocaleString()}`

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `laporan-harian-${selectedDate}.csv`
    link.click()
  }

  if (!canViewFinancials) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Akses Terbatas</h3>
          <p className="text-muted-foreground">
            Anda tidak memiliki izin untuk melihat laporan keuangan.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (isTransactionsLoading || !dailyData) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Calendar className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Memuat laporan harian...</p>
        </CardContent>
      </Card>
    )
  }

  const { reportData, dailyTransactions, dailyExpenses } = dailyData

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Header Controls - Hidden in Print */}
      <div className="print:hidden">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Laporan Harian Kas
            </CardTitle>
            <CardDescription>
              Ringkasan penjualan, pembayaran, dan arus kas harian untuk memudahkan pelaporan kasir
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="space-y-2">
                <Label htmlFor="reportDate">Tanggal Laporan</Label>
                <Input
                  id="reportDate"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                />
              </div>
              <div className="flex gap-2 items-end">
                <Button onClick={handlePrint} className="flex items-center gap-2">
                  <Printer className="h-4 w-4" />
                  Print
                </Button>
                <Button variant="outline" onClick={handleExport} className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Export CSV
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Print Header */}
      <div className="hidden print:block text-center mb-6">
        <h1 className="text-2xl font-bold">{settings?.companyName || 'MDI Wosi'}</h1>
        <h2 className="text-xl font-semibold mt-2">LAPORAN HARIAN KAS</h2>
        <p className="text-lg mt-1">{format(new Date(selectedDate), 'dd MMMM yyyy', { locale: id })}</p>
        <Separator className="mt-4" />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="rounded-full bg-green-500 p-3 mr-4">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Penjualan</p>
                <p className="text-2xl font-bold">Rp{reportData.totalSales.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{reportData.totalTransactions} transaksi</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="rounded-full bg-blue-500 p-3 mr-4">
                <Wallet className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Kas Masuk</p>
                <p className="text-2xl font-bold">Rp{reportData.cashInflow.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Tunai + Piutang</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="rounded-full bg-red-500 p-3 mr-4">
                <ArrowUpDown className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Kas Keluar</p>
                <p className="text-2xl font-bold">Rp{reportData.cashOutflow.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Transfer + Biaya</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className={`rounded-full p-3 mr-4 ${reportData.netCashFlow >= 0 ? 'bg-green-500' : 'bg-red-500'}`}>
                {reportData.netCashFlow >= 0 ? 
                  <TrendingUp className="h-6 w-6 text-white" /> : 
                  <TrendingDown className="h-6 w-6 text-white" />
                }
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Kas Bersih</p>
                <p className={`text-2xl font-bold ${reportData.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  Rp{reportData.netCashFlow.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">Arus kas hari ini</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Ringkasan Penjualan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span>Penjualan Tunai:</span>
                <span className="font-semibold">Rp{reportData.cashSales.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Penjualan Kredit:</span>
                <span className="font-semibold">Rp{reportData.creditSales.toLocaleString()}</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center font-bold text-lg">
                <span>Total Penjualan:</span>
                <span>Rp{reportData.totalSales.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cash Flow */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Arus Kas Kecil
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span>Saldo Awal:</span>
                <span className="font-semibold">Rp{reportData.startingCash.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-green-600">
                <span>Kas Masuk (+):</span>
                <span className="font-semibold">Rp{reportData.cashInflow.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-red-600">
                <span>Kas Keluar (-):</span>
                <span className="font-semibold">Rp{reportData.cashOutflow.toLocaleString()}</span>
              </div>
              <Separator />
              <div className={`flex justify-between items-center font-bold text-lg ${reportData.endingCash >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                <span>Saldo Akhir:</span>
                <span>Rp{reportData.endingCash.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Collections Summary */}
      {reportData.receivablePayments > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Pembayaran Piutang
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <span>Total Pembayaran Diterima:</span>
              <span className="font-semibold text-green-600">Rp{reportData.receivablePayments.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span>Jumlah Pembayaran:</span>
              <span className="font-semibold">{reportData.receivableCount} pembayaran</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transfer List */}
      {dailyTransfers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowUpDown className="h-5 w-5" />
              Daftar Transfer Harian
            </CardTitle>
            <CardDescription>{dailyTransfers.length} transfer pada {format(new Date(selectedDate), 'dd MMMM yyyy', { locale: id })}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Waktu</TableHead>
                  <TableHead>Dari</TableHead>
                  <TableHead>Ke</TableHead>
                  <TableHead>Jumlah</TableHead>
                  <TableHead>Keterangan</TableHead>
                  <TableHead>User</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dailyTransfers.map((transfer) => (
                  <TableRow key={transfer.id}>
                    <TableCell className="font-mono text-sm">
                      {format(new Date(transfer.createdAt), 'HH:mm')}
                    </TableCell>
                    <TableCell>
                      {accounts?.find(acc => acc.id === transfer.fromAccountId)?.name || 'Unknown'}
                    </TableCell>
                    <TableCell>
                      {accounts?.find(acc => acc.id === transfer.toAccountId)?.name || 'Unknown'}
                    </TableCell>
                    <TableCell className="font-semibold">
                      Rp{transfer.amount.toLocaleString()}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {transfer.description}
                    </TableCell>
                    <TableCell>{transfer.userName}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Expenses List */}
      {dailyExpenses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pengeluaran Harian</CardTitle>
            <CardDescription>{dailyExpenses.length} pengeluaran pada {format(new Date(selectedDate), 'dd MMMM yyyy', { locale: id })}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Waktu</TableHead>
                  <TableHead>Deskripsi</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Jumlah</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dailyExpenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell className="font-mono text-sm">
                      {format(new Date(expense.date), 'HH:mm')}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {expense.description}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{expense.category}</Badge>
                    </TableCell>
                    <TableCell className="font-semibold text-red-600">
                      Rp{expense.amount.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Daily Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detail Transaksi Harian</CardTitle>
          <CardDescription>{dailyTransactions.length} transaksi pada {format(new Date(selectedDate), 'dd MMMM yyyy', { locale: id })}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No. Order</TableHead>
                <TableHead>Waktu</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Dibayar</TableHead>
                <TableHead>Sisa</TableHead>
                <TableHead>Status Bayar</TableHead>
                <TableHead>Kasir</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dailyTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    Tidak ada transaksi pada tanggal ini
                  </TableCell>
                </TableRow>
              ) : (
                dailyTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="font-mono text-sm">
                      {transaction.id.slice(0, 8)}...
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {format(new Date(transaction.createdAt), 'HH:mm')}
                    </TableCell>
                    <TableCell>{transaction.customerName}</TableCell>
                    <TableCell>Rp{transaction.total.toLocaleString()}</TableCell>
                    <TableCell>Rp{transaction.paidAmount.toLocaleString()}</TableCell>
                    <TableCell>
                      <span className={transaction.total - transaction.paidAmount > 0 ? 'text-red-600' : 'text-green-600'}>
                        Rp{(transaction.total - transaction.paidAmount).toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={transaction.paymentStatus === 'Lunas' ? 'default' : transaction.paymentStatus === 'Kredit' ? 'destructive' : 'secondary'}>
                        {transaction.paymentStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>{transaction.cashierName}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* Print Footer */}
      <div className="hidden print:block mt-8 pt-4 border-t text-center text-sm text-muted-foreground">
        <p>Dicetak pada: {format(new Date(), 'dd MMMM yyyy HH:mm', { locale: id })}</p>
        <p>Kasir/Petugas: _________________________</p>
        <p className="mt-4">Tanda Tangan: _________________________</p>
      </div>
    </div>
  )
}