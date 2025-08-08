"use client"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { useCashHistory } from "@/hooks/useCashHistory"
import { useAccounts } from "@/hooks/useAccounts"
import { useAuth } from "@/hooks/useAuth"
import { CashTransactionType } from "@/types/cashHistory"
import { format, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth } from "date-fns"
import { id } from "date-fns/locale/id"
import { 
  FileDown, 
  Printer, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  Filter,
  X,
  DollarSign,
  Receipt,
  Clock,
  Minimize2,
  Maximize2,
  BarChart3
} from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

// Type labels dan colors
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

interface DateRangePreset {
  label: string
  getValue: () => { startDate: string; endDate: string }
}

const datePresets: DateRangePreset[] = [
  {
    label: "Hari ini",
    getValue: () => {
      const today = new Date()
      return {
        startDate: format(startOfDay(today), 'yyyy-MM-dd'),
        endDate: format(endOfDay(today), 'yyyy-MM-dd')
      }
    }
  },
  {
    label: "Kemarin", 
    getValue: () => {
      const yesterday = subDays(new Date(), 1)
      return {
        startDate: format(startOfDay(yesterday), 'yyyy-MM-dd'),
        endDate: format(endOfDay(yesterday), 'yyyy-MM-dd')
      }
    }
  },
  {
    label: "7 hari terakhir",
    getValue: () => {
      const today = new Date()
      const sevenDaysAgo = subDays(today, 6)
      return {
        startDate: format(startOfDay(sevenDaysAgo), 'yyyy-MM-dd'),
        endDate: format(endOfDay(today), 'yyyy-MM-dd')
      }
    }
  },
  {
    label: "30 hari terakhir",
    getValue: () => {
      const today = new Date()
      const thirtyDaysAgo = subDays(today, 29)
      return {
        startDate: format(startOfDay(thirtyDaysAgo), 'yyyy-MM-dd'),
        endDate: format(endOfDay(today), 'yyyy-MM-dd')
      }
    }
  },
  {
    label: "Bulan ini",
    getValue: () => {
      const today = new Date()
      return {
        startDate: format(startOfMonth(today), 'yyyy-MM-dd'),
        endDate: format(endOfMonth(today), 'yyyy-MM-dd')
      }
    }
  }
]

export function ComprehensiveFinancialReport() {
  const { user } = useAuth()
  const { cashHistory, getCashHistoryByDateRange, isLoading } = useCashHistory()
  const { accounts } = useAccounts()
  
  // State untuk filtering
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [selectedAccount, setSelectedAccount] = useState<string>("")
  const [selectedType, setSelectedType] = useState<string>("")
  const [isMinimized, setIsMinimized] = useState(false)
  const [isGeneratingPrint, setIsGeneratingPrint] = useState(false)

  // Filter data berdasarkan kriteria
  const filteredData = cashHistory?.filter(history => {
    // Date range filter
    if (startDate && endDate) {
      const historyDate = format(history.createdAt, 'yyyy-MM-dd')
      if (historyDate < startDate || historyDate > endDate) {
        console.log('Filtered out by date:', historyDate, 'not in range', startDate, '-', endDate)
        return false
      }
    }
    
    // Account filter
    if (selectedAccount && selectedAccount !== "all") {
      if (history.accountId !== selectedAccount) return false
    }
    
    // Type filter
    if (selectedType && selectedType !== "all") {
      if (history.type !== selectedType) return false
    }
    
    return true
  }) || []

  // Debug logging
  console.log('Total cash history records:', cashHistory?.length || 0)
  console.log('Filtered data count:', filteredData.length)
  console.log('Date range filter:', startDate, 'to', endDate)
  console.log('Sample data:', cashHistory?.slice(0, 2))

  // Hitung summary
  const totalInflow = filteredData
    .filter(h => h.amount > 0)
    .reduce((sum, h) => sum + h.amount, 0)
    
  const totalOutflow = filteredData
    .filter(h => h.amount < 0) 
    .reduce((sum, h) => sum + Math.abs(h.amount), 0)
    
  const netCashFlow = totalInflow - totalOutflow

  // Group by type untuk analisis
  const groupByType = filteredData.reduce((acc, history) => {
    if (!acc[history.type]) {
      acc[history.type] = {
        count: 0,
        total: 0,
        transactions: []
      }
    }
    acc[history.type].count += 1
    acc[history.type].total += history.amount
    acc[history.type].transactions.push(history)
    return acc
  }, {} as Record<string, { count: number; total: number; transactions: any[] }>)

  // Clear filters
  const clearFilters = () => {
    setStartDate("")
    setEndDate("")
    setSelectedAccount("")
    setSelectedType("")
  }

  const hasActiveFilters = startDate || endDate || (selectedAccount && selectedAccount !== "all") || (selectedType && selectedType !== "all")

  // Apply preset
  const applyPreset = (preset: DateRangePreset) => {
    const { startDate: start, endDate: end } = preset.getValue()
    setStartDate(start)
    setEndDate(end)
  }

  // Print function
  const handlePrint = () => {
    setIsGeneratingPrint(true)
    
    setTimeout(() => {
      const printContent = document.getElementById('financial-report-content')
      if (printContent) {
        const newWindow = window.open('', '_blank')
        if (newWindow) {
          newWindow.document.write(`
            <html>
              <head>
                <title>Laporan Keuangan - ${format(new Date(), 'dd MMMM yyyy', { locale: id })}</title>
                <style>
                  body { font-family: Arial, sans-serif; margin: 20px; }
                  .header { text-align: center; margin-bottom: 30px; }
                  .summary { display: flex; justify-content: space-around; margin: 20px 0; }
                  .summary-card { padding: 15px; border: 1px solid #ddd; border-radius: 8px; text-align: center; }
                  table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                  th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                  th { background-color: #f5f5f5; }
                  .amount-positive { color: green; font-weight: bold; }
                  .amount-negative { color: red; font-weight: bold; }
                  .badge { padding: 2px 8px; border-radius: 4px; color: white; font-size: 12px; }
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

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Laporan Keuangan Komprehensif
          </CardTitle>
          <CardDescription>Memuat data laporan...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Memuat laporan keuangan...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filter Section */}
      <Card>
        <Collapsible open={!isMinimized} onOpenChange={(open) => setIsMinimized(!open)}>
          <CardHeader className="cursor-pointer">
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  <CardTitle>Filter Laporan Keuangan</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  {hasActiveFilters && (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                      {[
                        startDate && endDate && `${format(new Date(startDate), 'dd/MM')} - ${format(new Date(endDate), 'dd/MM')}`,
                        selectedAccount && selectedAccount !== "all" && accounts?.find(a => a.id === selectedAccount)?.name,
                        selectedType && selectedType !== "all" && typeLabels[selectedType as CashTransactionType]
                      ].filter(Boolean).join(" • ")}
                    </Badge>
                  )}
                  {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
                </div>
              </div>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-6">
              {/* Date Range */}
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Label>Presets Tanggal:</Label>
                  {datePresets.map((preset, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => applyPreset(preset)}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start-date">Tanggal Mulai</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end-date">Tanggal Akhir</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Other Filters */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Filter Akun</Label>
                  <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                    <SelectTrigger>
                      <SelectValue placeholder="Semua akun" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua akun</SelectItem>
                      {accounts?.map(account => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Filter Jenis Transaksi</Label>
                  <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Semua jenis" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua jenis</SelectItem>
                      {Object.entries(typeLabels).map(([type, label]) => (
                        <SelectItem key={type} value={type}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <Button onClick={handlePrint} disabled={isGeneratingPrint} className="flex items-center gap-2">
                  <Printer className="h-4 w-4" />
                  {isGeneratingPrint ? "Menyiapkan..." : "Cetak Laporan"}
                </Button>
                {hasActiveFilters && (
                  <Button variant="ghost" onClick={clearFilters} className="flex items-center gap-2">
                    <X className="h-4 w-4" />
                    Clear Filter
                  </Button>
                )}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Report Content */}
      <div id="financial-report-content">
        {/* Header for Print */}
        <div className="header hidden print:block">
          <h1>LAPORAN KEUANGAN KOMPREHENSIF</h1>
          <h2>Matahari Digital Printing</h2>
          <p>Periode: {startDate && endDate ? `${format(new Date(startDate), 'dd MMMM yyyy', { locale: id })} - ${format(new Date(endDate), 'dd MMMM yyyy', { locale: id })}` : 'Semua periode'}</p>
          <p>Dicetak pada: {format(new Date(), 'dd MMMM yyyy HH:mm', { locale: id })}</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                Total Kas Masuk
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(totalInflow)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {filteredData.filter(h => h.amount > 0).length} transaksi
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-600" />
                Total Kas Keluar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(totalOutflow)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {filteredData.filter(h => h.amount < 0).length} transaksi
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-blue-600" />
                Arus Kas Bersih
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(netCashFlow)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Selisih masuk/keluar
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
                {filteredData.length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Semua transaksi kas
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Summary by Type */}
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
              Detail Transaksi Kas
            </CardTitle>
            <CardDescription>
              {startDate && endDate 
                ? `Periode: ${format(new Date(startDate), 'dd MMMM yyyy', { locale: id })} - ${format(new Date(endDate), 'dd MMMM yyyy', { locale: id })}`
                : 'Menampilkan semua transaksi'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">Tidak ada data transaksi</p>
                <p className="text-sm">
                  {hasActiveFilters 
                    ? "Coba ubah filter untuk melihat data lain" 
                    : "Belum ada transaksi kas yang tercatat"
                  }
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal & Waktu</TableHead>
                    <TableHead>Akun</TableHead>
                    <TableHead>Jenis</TableHead>
                    <TableHead>Deskripsi</TableHead>
                    <TableHead>Referensi</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                    <TableHead>User</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((history) => (
                    <TableRow key={history.id}>
                      <TableCell className="font-mono text-sm">
                        {format(history.createdAt, 'dd/MM/yyyy HH:mm', { locale: id })}
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