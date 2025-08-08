"use client"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useCashHistory } from "@/hooks/useCashHistory"
import { useAccounts } from "@/hooks/useAccounts"
import { useAuth } from "@/hooks/useAuth"
import { CashTransactionType } from "@/types/cashHistory"
import { format, startOfDay, endOfDay, isToday } from "date-fns"
import { id } from "date-fns/locale/id"
import { 
  Printer, 
  Calendar, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Receipt,
  Clock,
  BarChart3
} from "lucide-react"

// Type labels dan colors (sama seperti comprehensive)
const typeLabels: Record<CashTransactionType, string> = {
  orderan: "Orderan/Penjualan",
  kas_masuk_manual: "Kas Masuk Manual",
  kas_keluar_manual: "Kas Keluar Manual",
  panjar_pengambilan: "Panjar - Pengambilan",
  panjar_pelunasan: "Panjar - Pelunasan", 
  pengeluaran: "Pengeluaran Operasional",
  pembayaran_po: "Pembayaran PO",
  pemutihan_piutang: "Pemutihan Piutang",
  transfer_masuk: "Transfer Masuk",
  transfer_keluar: "Transfer Keluar",
}

const typeColors: Record<CashTransactionType, string> = {
  orderan: "bg-green-500",
  kas_masuk_manual: "bg-green-600", 
  kas_keluar_manual: "bg-red-600",
  panjar_pengambilan: "bg-orange-500",
  panjar_pelunasan: "bg-blue-500",
  pengeluaran: "bg-red-500",
  pembayaran_po: "bg-purple-500",
  pemutihan_piutang: "bg-gray-500",
  transfer_masuk: "bg-cyan-500",
  transfer_keluar: "bg-indigo-500",
}

interface DailyFinancialReportProps {
  enableCashierAccess?: boolean
}

export function DailyFinancialReport({ enableCashierAccess = false }: DailyFinancialReportProps) {
  const { user } = useAuth()
  const { cashHistory, isLoading } = useCashHistory()
  const { accounts } = useAccounts()
  
  // State
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [isGeneratingPrint, setIsGeneratingPrint] = useState(false)

  // Check permissions
  const canAccess = enableCashierAccess || user?.role === 'admin' || user?.role === 'owner' || user?.role === 'cashier'

  // Filter data untuk tanggal yang dipilih
  const dailyData = cashHistory?.filter(history => {
    const historyDate = format(history.createdAt, 'yyyy-MM-dd')
    return historyDate === selectedDate
  }) || []

  // Hitung summary harian
  const totalInflow = dailyData
    .filter(h => h.amount > 0)
    .reduce((sum, h) => sum + h.amount, 0)
    
  const totalOutflow = dailyData
    .filter(h => h.amount < 0) 
    .reduce((sum, h) => sum + Math.abs(h.amount), 0)
    
  const netCashFlow = totalInflow - totalOutflow

  // Group by account untuk saldo per akun
  const groupByAccount = dailyData.reduce((acc, history) => {
    if (!acc[history.accountId]) {
      acc[history.accountId] = {
        accountName: history.accountName,
        transactions: [],
        inflow: 0,
        outflow: 0,
        net: 0
      }
    }
    acc[history.accountId].transactions.push(history)
    if (history.amount > 0) {
      acc[history.accountId].inflow += history.amount
    } else {
      acc[history.accountId].outflow += Math.abs(history.amount)
    }
    acc[history.accountId].net = acc[history.accountId].inflow - acc[history.accountId].outflow
    return acc
  }, {} as Record<string, { accountName: string; transactions: any[]; inflow: number; outflow: number; net: number }>)

  // Group by type untuk analisis
  const groupByType = dailyData.reduce((acc, history) => {
    if (!acc[history.type]) {
      acc[history.type] = { count: 0, total: 0 }
    }
    acc[history.type].count += 1
    acc[history.type].total += history.amount
    return acc
  }, {} as Record<string, { count: number; total: number }>)

  // Print function
  const handlePrint = () => {
    setIsGeneratingPrint(true)
    
    setTimeout(() => {
      const printContent = document.getElementById('daily-report-content')
      if (printContent) {
        const newWindow = window.open('', '_blank')
        if (newWindow) {
          newWindow.document.write(`
            <html>
              <head>
                <title>Laporan Harian - ${format(new Date(selectedDate), 'dd MMMM yyyy', { locale: id })}</title>
                <style>
                  body { font-family: Arial, sans-serif; margin: 20px; }
                  .header { text-align: center; margin-bottom: 30px; }
                  .summary { display: flex; justify-content: space-around; margin: 20px 0; }
                  .summary-card { padding: 15px; border: 1px solid #ddd; border-radius: 8px; text-align: center; min-width: 150px; }
                  table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                  th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                  th { background-color: #f5f5f5; }
                  .amount-positive { color: green; font-weight: bold; }
                  .amount-negative { color: red; font-weight: bold; }
                  .badge { padding: 2px 8px; border-radius: 4px; color: white; font-size: 12px; }
                  .section-title { font-size: 16px; font-weight: bold; margin: 20px 0 10px 0; }
                  @media print { body { margin: 0; } }
                </style>
              </head>
              <body>
                ${printContent.innerHTML}
              </body>
            </html>
          `)
          newWindow.document.close()
          newWindow.print()
          newWindow.close()
        }
      }
      setIsGeneratingPrint(false)
    }, 500)
  }

  if (!canAccess) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <Receipt className="h-5 w-5" />
            Akses Terbatas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Fitur ini hanya dapat diakses oleh admin, owner, atau kasir.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Laporan Harian
          </CardTitle>
          <CardDescription>Memuat data laporan...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Memuat laporan harian...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  const isSelectedDateToday = isToday(new Date(selectedDate))

  return (
    <div className="space-y-6">
      {/* Date Selection */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              <CardTitle>Laporan Keuangan Harian</CardTitle>
            </div>
            <Button 
              onClick={handlePrint} 
              disabled={isGeneratingPrint}
              className="flex items-center gap-2"
            >
              <Printer className="h-4 w-4" />
              {isGeneratingPrint ? "Menyiapkan..." : "Cetak Laporan"}
            </Button>
          </div>
          <CardDescription>
            Laporan detail kas masuk dan keluar per hari dengan akses untuk kasir
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="space-y-2">
              <Label htmlFor="selected-date">Pilih Tanggal</Label>
              <Input
                id="selected-date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-auto"
              />
            </div>
            <div className="flex items-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDate(format(new Date(), 'yyyy-MM-dd'))}
              >
                Hari ini
              </Button>
              {isSelectedDateToday && (
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Hari ini
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Content */}
      <div id="daily-report-content">
        {/* Header for Print */}
        <div className="header hidden print:block">
          <h1>LAPORAN KEUANGAN HARIAN</h1>
          <h2>Matahari Digital Printing</h2>
          <p>Tanggal: {format(new Date(selectedDate), 'dd MMMM yyyy', { locale: id })}</p>
          <p>Dicetak pada: {format(new Date(), 'dd MMMM yyyy HH:mm', { locale: id })}</p>
          <p>Kasir: {user?.name || user?.email}</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                Kas Masuk
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(totalInflow)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {dailyData.filter(h => h.amount > 0).length} transaksi
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-600" />
                Kas Keluar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(totalOutflow)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {dailyData.filter(h => h.amount < 0).length} transaksi
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-blue-600" />
                Kas Bersih
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(netCashFlow)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Selisih harian
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Receipt className="h-4 w-4 text-purple-600" />
                Total Transaksi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {dailyData.length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Transaksi hari ini
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Summary per Akun */}
        {Object.keys(groupByAccount).length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Ringkasan per Akun
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Akun</TableHead>
                    <TableHead className="text-center">Transaksi</TableHead>
                    <TableHead className="text-right">Kas Masuk</TableHead>
                    <TableHead className="text-right">Kas Keluar</TableHead>
                    <TableHead className="text-right">Kas Bersih</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(groupByAccount).map(([accountId, data]) => (
                    <TableRow key={accountId}>
                      <TableCell className="font-medium">{data.accountName}</TableCell>
                      <TableCell className="text-center">{data.transactions.length}</TableCell>
                      <TableCell className="text-right text-green-600 font-semibold">
                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(data.inflow)}
                      </TableCell>
                      <TableCell className="text-right text-red-600 font-semibold">
                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(data.outflow)}
                      </TableCell>
                      <TableCell className={`text-right font-bold ${data.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(data.net)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Summary per Jenis Transaksi */}
        {Object.keys(groupByType).length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Ringkasan per Jenis Transaksi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Jenis Transaksi</TableHead>
                    <TableHead className="text-center">Jumlah</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(groupByType)
                    .sort(([,a], [,b]) => Math.abs(b.total) - Math.abs(a.total))
                    .map(([type, data]) => (
                    <TableRow key={type}>
                      <TableCell>
                        <Badge variant="secondary" className={`${typeColors[type as CashTransactionType]} text-white`}>
                          {typeLabels[type as CashTransactionType]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">{data.count}</TableCell>
                      <TableCell className={`text-right font-semibold ${data.total >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(data.total)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Detailed Transaction List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Detail Transaksi - {format(new Date(selectedDate), 'dd MMMM yyyy', { locale: id })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dailyData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">Tidak ada transaksi</p>
                <p className="text-sm">
                  Belum ada transaksi kas pada tanggal {format(new Date(selectedDate), 'dd MMMM yyyy', { locale: id })}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Waktu</TableHead>
                    <TableHead>Akun</TableHead>
                    <TableHead>Jenis</TableHead>
                    <TableHead>Deskripsi</TableHead>
                    <TableHead>Referensi</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                    <TableHead>User</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dailyData
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((history) => (
                    <TableRow key={history.id}>
                      <TableCell className="font-mono text-sm">
                        {format(history.createdAt, 'HH:mm:ss', { locale: id })}
                      </TableCell>
                      <TableCell className="font-medium">{history.accountName}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={`${typeColors[history.type]} text-white`}>
                          {typeLabels[history.type]}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate" title={history.description}>
                        {history.description}
                      </TableCell>
                      <TableCell className="text-sm">
                        {history.referenceName && (
                          <div>
                            <div className="font-medium truncate max-w-[120px]" title={history.referenceName}>
                              {history.referenceName}
                            </div>
                            {history.referenceId && (
                              <div className="text-muted-foreground font-mono text-xs">
                                {history.referenceId.slice(0, 8)}...
                              </div>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className={`text-right font-semibold ${history.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        <div className="flex items-center justify-end gap-1">
                          {history.amount >= 0 ? (
                            <TrendingUp className="h-4 w-4" />
                          ) : (
                            <TrendingDown className="h-4 w-4" />
                          )}
                          {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(Math.abs(history.amount))}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{history.userName}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}