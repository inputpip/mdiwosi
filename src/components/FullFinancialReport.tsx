"use client"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useFinancialReports } from "@/hooks/useFinancialReports"
import { useAuth } from "@/hooks/useAuth"
import { FileDown, DollarSign, TrendingUp, TrendingDown, Receipt } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { format } from "date-fns"
import { id } from "date-fns/locale/id"

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF
  }
}

export function FullFinancialReport() {
  const { user } = useAuth()
  const { accountBalances, cashFlowSummary, salesSummary, expenseSummary, isLoading } = useFinancialReports()
  const [isGenerating, setIsGenerating] = useState(false)

  // Check if user is admin or owner
  if (user?.role !== 'admin' && user?.role !== 'owner') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <Receipt className="h-5 w-5" />
            Akses Ditolak
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Hanya administrator yang dapat mengakses laporan keuangan keseluruhan.
          </p>
        </CardContent>
      </Card>
    )
  }

  const generatePDF = async () => {
    if (!accountBalances || !cashFlowSummary || !salesSummary || !expenseSummary) return
    
    setIsGenerating(true)
    
    try {
      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.getWidth()
      
      // Header
      doc.setFontSize(18)
      doc.setFont(undefined, 'bold')
      doc.text('LAPORAN KEUANGAN KESELURUHAN', pageWidth / 2, 20, { align: 'center' })
      
      doc.setFontSize(14)
      doc.setFont(undefined, 'normal')
      doc.text('Matahari Digital Printing', pageWidth / 2, 30, { align: 'center' })
      doc.text(`Periode: ${format(new Date(), 'dd MMMM yyyy', { locale: id })}`, pageWidth / 2, 38, { align: 'center' })
      
      let yPosition = 50

      // A. Rekapitulasi Saldo per Akun
      doc.setFontSize(14)
      doc.setFont(undefined, 'bold')
      doc.text('A. REKAPITULASI SALDO PER AKUN', 14, yPosition)
      yPosition += 10

      const accountData = accountBalances.map(account => [
        account.name,
        account.type,
        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(account.balance)
      ])

      doc.autoTable({
        startY: yPosition,
        head: [['Nama Akun', 'Tipe', 'Saldo Akhir']],
        body: accountData,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [41, 128, 185] }
      })

      yPosition = (doc as any).lastAutoTable.finalY + 15

      // B. Arus Kas Keseluruhan
      doc.setFontSize(14)
      doc.setFont(undefined, 'bold')
      doc.text('B. ARUS KAS KESELURUHAN', 14, yPosition)
      yPosition += 10

      const cashFlowData = cashFlowSummary.map(flow => [
        flow.accountName,
        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(flow.startBalance),
        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(flow.cashIn),
        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(flow.cashOut),
        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(flow.endBalance)
      ])

      doc.autoTable({
        startY: yPosition,
        head: [['Akun', 'Saldo Awal', 'Kas Masuk', 'Kas Keluar', 'Saldo Akhir']],
        body: cashFlowData,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [52, 152, 219] }
      })

      yPosition = (doc as any).lastAutoTable.finalY + 15

      // C. Rangkuman Penjualan
      doc.setFontSize(14)
      doc.setFont(undefined, 'bold')
      doc.text('C. RANGKUMAN PENJUALAN', 14, yPosition)
      yPosition += 10

      const salesData = [
        ['Penjualan Tunai', new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(salesSummary.totalCash)],
        ['Penjualan Kredit', new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(salesSummary.totalCredit)],
        ['Total Penjualan', new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(salesSummary.totalSales)],
        ['Jumlah Transaksi', salesSummary.transactionCount.toString()]
      ]

      doc.autoTable({
        startY: yPosition,
        head: [['Kategori', 'Jumlah']],
        body: salesData,
        styles: { fontSize: 10 },
        headStyles: { fillColor: [46, 204, 113] }
      })

      yPosition = (doc as any).lastAutoTable.finalY + 15

      // D. Ringkasan Pengeluaran
      doc.setFontSize(14)
      doc.setFont(undefined, 'bold')
      doc.text('D. RINGKASAN PENGELUARAN', 14, yPosition)
      yPosition += 10

      const expenseData = [
        ['Total Pengeluaran', new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(expenseSummary.totalExpenses)],
        ...Object.entries(expenseSummary.expensesByCategory).map(([category, amount]) => [
          `- ${category}`,
          new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount)
        ])
      ]

      doc.autoTable({
        startY: yPosition,
        head: [['Kategori', 'Jumlah']],
        body: expenseData,
        styles: { fontSize: 10 },
        headStyles: { fillColor: [231, 76, 60] }
      })

      // Footer
      const pageCount = doc.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.text(`Halaman ${i} dari ${pageCount}`, pageWidth - 30, doc.internal.pageSize.getHeight() - 10)
        doc.text(`Dicetak pada: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, doc.internal.pageSize.getHeight() - 10)
      }

      // Save PDF
      const filename = `Laporan_Keuangan_${format(new Date(), 'yyyy-MM-dd')}.pdf`
      doc.save(filename)

    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Gagal membuat laporan PDF')
    } finally {
      setIsGenerating(false)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Laporan Keuangan Keseluruhan
          </CardTitle>
          <CardDescription>Memuat data laporan...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Laporan Keuangan Keseluruhan
            </CardTitle>
            <CardDescription>
              Laporan lengkap saldo akun, arus kas, penjualan, dan pengeluaran
            </CardDescription>
          </div>
          <Button 
            onClick={generatePDF} 
            disabled={isGenerating}
            className="flex items-center gap-2"
          >
            <FileDown className="h-4 w-4" />
            {isGenerating ? 'Membuat PDF...' : 'Generate PDF'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Summary Cards */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                Total Saldo Akun
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat('id-ID', { 
                  style: 'currency', 
                  currency: 'IDR',
                  minimumFractionDigits: 0 
                }).format(accountBalances?.reduce((sum, acc) => sum + acc.balance, 0) || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {accountBalances?.length || 0} akun
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                Total Penjualan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat('id-ID', { 
                  style: 'currency', 
                  currency: 'IDR',
                  minimumFractionDigits: 0 
                }).format(salesSummary?.totalSales || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {salesSummary?.transactionCount || 0} transaksi
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-600" />
                Total Pengeluaran
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat('id-ID', { 
                  style: 'currency', 
                  currency: 'IDR',
                  minimumFractionDigits: 0 
                }).format(expenseSummary?.totalExpenses || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {Object.keys(expenseSummary?.expensesByCategory || {}).length} kategori
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Receipt className="h-4 w-4 text-purple-600" />
                Kas Bersih
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat('id-ID', { 
                  style: 'currency', 
                  currency: 'IDR',
                  minimumFractionDigits: 0 
                }).format(
                  (salesSummary?.totalSales || 0) - (expenseSummary?.totalExpenses || 0)
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Laba bersih
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Klik "Generate PDF" untuk mengunduh laporan lengkap dengan detail per akun, 
            arus kas, dan breakdown penjualan/pengeluaran.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}