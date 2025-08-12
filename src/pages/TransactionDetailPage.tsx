"use client"
import { useParams, Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Printer, FileDown, Calendar, User, Package, CreditCard } from "lucide-react"
import { useTransactions } from "@/hooks/useTransactions"
import { format } from "date-fns"
import { id } from "date-fns/locale/id"
import { PrintReceiptDialog } from "@/components/PrintReceiptDialog"
import { useState } from "react"
import { Skeleton } from "@/components/ui/skeleton"

export default function TransactionDetailPage() {
  const { id: transactionId } = useParams<{ id: string }>()
  const { transactions, isLoading } = useTransactions()
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false)
  const [printTemplate, setPrintTemplate] = useState<'receipt' | 'invoice'>('receipt')

  const transaction = transactions?.find(t => t.id === transactionId)

  if (!transactionId) {
    return (
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold">ID Transaksi tidak valid</h2>
        <Button asChild>
          <Link to="/transactions">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali ke Daftar Transaksi
          </Link>
        </Button>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button asChild variant="outline">
            <Link to="/transactions">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Kembali
            </Link>
          </Button>
          <div>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96 mt-2" />
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!transaction) {
    return (
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold">Transaksi tidak ditemukan</h2>
        <p className="text-muted-foreground">
          Transaksi dengan ID {transactionId} tidak dapat ditemukan.
        </p>
        <Button asChild>
          <Link to="/transactions">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali ke Daftar Transaksi
          </Link>
        </Button>
      </div>
    )
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'Pesanan Masuk': return 'secondary';
      case 'Proses Design': return 'default';
      case 'ACC Costumer': return 'info';
      case 'Proses Produksi': return 'warning';
      case 'Pesanan Selesai': return 'success';
      case 'Dibatalkan': return 'destructive';
      default: return 'outline';
    }
  }

  const getPaymentStatusVariant = (paidAmount: number, total: number) => {
    if (paidAmount === 0) return 'destructive';
    if (paidAmount >= total) return 'success';
    return 'warning';
  }

  const getPaymentStatusText = (paidAmount: number, total: number) => {
    if (paidAmount === 0) return 'Belum Lunas';
    if (paidAmount >= total) return 'Lunas';
    return 'Sebagian';
  }

  const handlePrintClick = (template: 'receipt' | 'invoice') => {
    setPrintTemplate(template);
    setIsPrintDialogOpen(true);
  }

  return (
    <div className="space-y-6">
      <PrintReceiptDialog 
        open={isPrintDialogOpen} 
        onOpenChange={setIsPrintDialogOpen} 
        transaction={transaction} 
        template={printTemplate}
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button asChild variant="outline">
            <Link to="/transactions">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Kembali
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Detail Transaksi</h1>
            <p className="text-muted-foreground">
              #{transaction.id}
            </p>
          </div>
        </div>
        
        {/* Print Buttons */}
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handlePrintClick('receipt')}>
            <Printer className="mr-2 h-4 w-4" />
            Cetak Thermal
          </Button>
          <Button onClick={() => handlePrintClick('invoice')}>
            <FileDown className="mr-2 h-4 w-4" />
            Cetak Invoice PDF
          </Button>
        </div>
      </div>

      {/* Transaction Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status Order</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Badge variant={getStatusVariant(transaction.status)}>
              {transaction.status}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status Pembayaran</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Badge variant={getPaymentStatusVariant(transaction.paidAmount || 0, transaction.total)}>
              {getPaymentStatusText(transaction.paidAmount || 0, transaction.total)}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transaksi</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat("id-ID", {
                style: "currency",
                currency: "IDR",
                minimumFractionDigits: 0,
              }).format(transaction.total)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sisa Tagihan</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {new Intl.NumberFormat("id-ID", {
                style: "currency",
                currency: "IDR",
                minimumFractionDigits: 0,
              }).format(Math.max(0, transaction.total - (transaction.paidAmount || 0)))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Transaction Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informasi Transaksi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Tanggal Order</p>
                    <p className="text-sm text-muted-foreground">
                      {transaction.orderDate ? format(new Date(transaction.orderDate), "d MMMM yyyy, HH:mm", { locale: id }) : 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Target Selesai</p>
                    <p className="text-sm text-muted-foreground">
                      {transaction.finishDate ? format(new Date(transaction.finishDate), "d MMMM yyyy, HH:mm", { locale: id }) : 'Belum ditentukan'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Kasir</p>
                    <p className="text-sm text-muted-foreground">{transaction.cashierName}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Pelanggan</p>
                    <p className="text-sm text-muted-foreground">{transaction.customerName}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Items Table */}
          <Card>
            <CardHeader>
              <CardTitle>Detail Produk</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produk</TableHead>
                    <TableHead className="text-center">Qty</TableHead>
                    <TableHead className="text-right">Harga Satuan</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transaction.items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.product.name}</p>
                          {item.notes && (
                            <p className="text-sm text-muted-foreground">{item.notes}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {item.quantity} {item.unit}
                      </TableCell>
                      <TableCell className="text-right">
                        {new Intl.NumberFormat("id-ID", {
                          style: "currency",
                          currency: "IDR",
                          minimumFractionDigits: 0,
                        }).format(item.price)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {new Intl.NumberFormat("id-ID", {
                          style: "currency",
                          currency: "IDR",
                          minimumFractionDigits: 0,
                        }).format(item.price * item.quantity)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <Separator className="my-4" />
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>
                    {new Intl.NumberFormat("id-ID", {
                      style: "currency",
                      currency: "IDR",
                      minimumFractionDigits: 0,
                    }).format(transaction.subtotal)}
                  </span>
                </div>
                
                {transaction.ppnEnabled && (
                  <div className="flex justify-between">
                    <span>PPN ({transaction.ppnPercentage}%):</span>
                    <span>
                      {new Intl.NumberFormat("id-ID", {
                        style: "currency",
                        currency: "IDR",
                        minimumFractionDigits: 0,
                      }).format(transaction.ppnAmount)}
                    </span>
                  </div>
                )}
                
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total:</span>
                  <span>
                    {new Intl.NumberFormat("id-ID", {
                      style: "currency",
                      currency: "IDR",
                      minimumFractionDigits: 0,
                    }).format(transaction.total)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Payment Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informasi Pembayaran</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Total Tagihan:</span>
                  <span className="text-sm font-medium">
                    {new Intl.NumberFormat("id-ID", {
                      style: "currency",
                      currency: "IDR",
                      minimumFractionDigits: 0,
                    }).format(transaction.total)}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm">Sudah Dibayar:</span>
                  <span className="text-sm font-medium text-green-600">
                    {new Intl.NumberFormat("id-ID", {
                      style: "currency",
                      currency: "IDR",
                      minimumFractionDigits: 0,
                    }).format(transaction.paidAmount || 0)}
                  </span>
                </div>
                
                <Separator />
                
                <div className="flex justify-between">
                  <span className="font-medium">Sisa Tagihan:</span>
                  <span className={`font-bold ${
                    (transaction.total - (transaction.paidAmount || 0)) > 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {new Intl.NumberFormat("id-ID", {
                      style: "currency",
                      currency: "IDR",
                      minimumFractionDigits: 0,
                    }).format(Math.max(0, transaction.total - (transaction.paidAmount || 0)))}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}