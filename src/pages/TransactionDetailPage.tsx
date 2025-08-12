"use client"
import { useParams, Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default function TransactionDetailPage() {
  const { id: transactionId } = useParams<{ id: string }>()

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
          <h1 className="text-3xl font-bold">Detail Transaksi</h1>
          <p className="text-muted-foreground">
            Laporan lengkap transaksi dengan tracking pembayaran komprehensif
          </p>
        </div>
      </div>

      <div className="bg-card p-6 rounded-lg border">
        <h2 className="text-xl font-semibold mb-4">Detail Transaksi: {transactionId}</h2>
        <p className="text-muted-foreground">
          Halaman detail transaksi akan dikembangkan ulang nanti.
        </p>
      </div>
    </div>
  )
}