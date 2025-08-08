"use client"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { useCashHistory } from "@/hooks/useCashHistory"
import { useAccounts } from "@/hooks/useAccounts"
import { CashTransactionType } from "@/types/cashHistory"
import { format } from "date-fns"
import { id } from "date-fns/locale/id"
import { Clock, TrendingUp, TrendingDown, Filter, X } from "lucide-react"

// Type labels untuk display
const typeLabels: Record<CashTransactionType, string> = {
  orderan: "Orderan",
  kas_masuk_manual: "Kas Masuk Manual",
  kas_keluar_manual: "Kas Keluar Manual", 
  panjar_pengambilan: "Panjar - Pengambilan",
  panjar_pelunasan: "Panjar - Pelunasan",
  pengeluaran: "Pengeluaran",
  pembayaran_po: "Pembayaran PO",
  pemutihan_piutang: "Pemutihan Piutang",
  transfer_masuk: "Transfer Masuk",
  transfer_keluar: "Transfer Keluar",
}

// Type colors untuk badge
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

export function CashHistoryTable() {
  const { cashHistory, isLoading } = useCashHistory()
  const { accounts } = useAccounts()
  const [selectedAccount, setSelectedAccount] = useState<string>("")
  const [filterType, setFilterType] = useState<string>("")
  const [filterDate, setFilterDate] = useState<string>("")
  const [showFilters, setShowFilters] = useState(false)

  const filteredHistory = cashHistory?.filter(history => {
    // Account filter
    if (selectedAccount && selectedAccount !== "all" && history.accountId !== selectedAccount) return false
    // Type filter  
    if (filterType && filterType !== "all" && history.type !== filterType) return false
    // Date filter
    if (filterDate) {
      const historyDate = format(history.createdAt, 'yyyy-MM-dd')
      if (historyDate !== filterDate) return false
    }
    return true
  }) || []

  const clearFilters = () => {
    setSelectedAccount("")
    setFilterType("")
    setFilterDate("")
  }

  const hasActiveFilters = (selectedAccount && selectedAccount !== "all") || 
                          (filterType && filterType !== "all") || 
                          filterDate

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            History Kas Masuk/Keluar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Memuat history...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                History Kas Masuk/Keluar
              </CardTitle>
              <CardDescription>
                Riwayat semua transaksi kas masuk dan keluar dari berbagai sumber
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                Filter
              </Button>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="flex items-center gap-2 text-muted-foreground"
                >
                  <X className="h-4 w-4" />
                  Clear
                </Button>
              )}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="account-selector">Pilih Akun untuk Melihat History</Label>
            <Select value={selectedAccount} onValueChange={setSelectedAccount}>
              <SelectTrigger id="account-selector">
                <SelectValue placeholder="Pilih akun untuk melihat history kas..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua akun</SelectItem>
                {accounts?.map(account => (
                  <SelectItem key={account.id} value={account.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{account.name}</span>
                      <span className="text-sm text-muted-foreground">
                        Saldo: {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(account.balance)}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
            <div className="space-y-2">
              <Label htmlFor="filter-type">Filter Jenis Transaksi</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger id="filter-type">
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
            
            <div className="space-y-2">
              <Label htmlFor="filter-date">Filter Tanggal</Label>
              <Input
                id="filter-date"
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
              />
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {filteredHistory.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">
              {(selectedAccount && selectedAccount !== "all") ? "Tidak ada history untuk akun yang dipilih" : hasActiveFilters ? "Tidak ada data sesuai filter" : "Pilih akun untuk melihat history transaksi"}
            </p>
            <p className="text-sm">
              {(selectedAccount && selectedAccount !== "all") ? "Akun ini belum memiliki transaksi kas masuk/keluar" : hasActiveFilters ? "Coba ubah filter untuk melihat data lain" : "Gunakan dropdown di atas untuk memilih akun dan melihat riwayat transaksinya"}
            </p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Akun</TableHead>
                  <TableHead>Jenis Transaksi</TableHead>
                  <TableHead>Referensi</TableHead>
                  <TableHead>Deskripsi</TableHead>
                  <TableHead className="text-right">Jumlah</TableHead>
                  <TableHead>User</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHistory.map((history) => (
                  <TableRow key={history.id}>
                    <TableCell className="font-mono text-sm">
                      {format(history.createdAt, 'dd MMM yyyy, HH:mm', { locale: id })}
                    </TableCell>
                    <TableCell className="font-medium">
                      {history.accountName}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="secondary"
                        className={`${typeColors[history.type]} text-white`}
                      >
                        {typeLabels[history.type]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {history.referenceName && (
                        <div className="text-sm">
                          <div className="font-medium truncate max-w-[150px]" title={history.referenceName}>
                            {history.referenceName}
                          </div>
                          {history.referenceId && (
                            <div className="text-muted-foreground font-mono text-xs">
                              {history.referenceId.slice(0, 8)}...
                            </div>
                          )}
                        </div>
                      )}
                      {!history.referenceName && history.referenceId && (
                        <div className="text-sm font-mono text-muted-foreground">
                          {history.referenceId.slice(0, 12)}...
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <div className="truncate" title={history.description}>
                        {history.description}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      <div className={`flex items-center justify-end gap-1 ${
                        history.amount >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {history.amount >= 0 ? (
                          <TrendingUp className="h-4 w-4" />
                        ) : (
                          <TrendingDown className="h-4 w-4" />
                        )}
                        {new Intl.NumberFormat("id-ID", { 
                          style: "currency", 
                          currency: "IDR" 
                        }).format(Math.abs(history.amount))}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="font-medium">{history.userName}</div>
                      <div className="text-muted-foreground text-xs">
                        {format(history.createdAt, 'HH:mm', { locale: id })}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        
        {filteredHistory.length > 0 && (
          <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
            <div>
              Menampilkan {filteredHistory.length} dari {cashHistory?.length || 0} transaksi
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 text-green-600">
                <TrendingUp className="h-4 w-4" />
                <span>Kas Masuk: {filteredHistory.filter(h => h.amount > 0).length}</span>
              </div>
              <div className="flex items-center gap-1 text-red-600">
                <TrendingDown className="h-4 w-4" />
                <span>Kas Keluar: {filteredHistory.filter(h => h.amount < 0).length}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}