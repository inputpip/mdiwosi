"use client"
import * as React from "react"
import { format } from "date-fns"
import { id } from "date-fns/locale/id"
import { usePaymentHistory, PaymentHistoryRecord } from "@/hooks/usePaymentHistory"
import { TableCell } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Wallet, Calendar, User, FileText } from "lucide-react"

interface PaymentHistoryRowProps {
  transactionId: string
  colSpan: number
}

export function PaymentHistoryRow({ transactionId, colSpan }: PaymentHistoryRowProps) {
  const { paymentHistory, isLoading, error } = usePaymentHistory(transactionId)

  if (isLoading) {
    return (
      <TableCell colSpan={colSpan} className="p-4 bg-muted/30">
        <div className="flex items-center justify-center text-sm text-muted-foreground">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
          Memuat riwayat pembayaran...
        </div>
      </TableCell>
    )
  }

  if (error) {
    return (
      <TableCell colSpan={colSpan} className="p-4 bg-muted/30">
        <div className="text-sm text-destructive">
          Gagal memuat riwayat pembayaran: {error.message}
        </div>
      </TableCell>
    )
  }

  if (paymentHistory.length === 0) {
    return (
      <TableCell colSpan={colSpan} className="p-4 bg-muted/30">
        <div className="text-sm text-muted-foreground text-center py-4">
          <FileText className="mx-auto h-8 w-8 mb-2 opacity-50" />
          <p>Belum ada riwayat pembayaran</p>
        </div>
      </TableCell>
    )
  }

  return (
    <TableCell colSpan={colSpan} className="p-4 bg-muted/30">
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <FileText className="h-4 w-4" />
          Riwayat Pembayaran ({paymentHistory.length})
        </div>
        
        <div className="space-y-2">
          {paymentHistory.map((payment: PaymentHistoryRecord) => (
            <div key={payment.id} className="border rounded-lg p-3 bg-background/50">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="secondary" className="text-xs">
                      <Wallet className="w-3 h-3 mr-1" />
                      {payment.account_name}
                    </Badge>
                    <span className="font-semibold text-green-600">
                      {new Intl.NumberFormat("id-ID", { 
                        style: "currency", 
                        currency: "IDR" 
                      }).format(payment.amount)}
                    </span>
                  </div>
                  
                  {payment.description && (
                    <p className="text-xs text-muted-foreground mb-2">
                      {payment.description}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex justify-between items-center text-xs text-muted-foreground">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(payment.created_at), "d MMM yyyy HH:mm", { locale: id })}
                  </span>
                  {payment.created_by_name && (
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {payment.created_by_name}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-xs text-muted-foreground pt-2 border-t">
          <span className="font-medium">Total Dibayar:</span>{" "}
          <span className="font-semibold text-green-600">
            {new Intl.NumberFormat("id-ID", { 
              style: "currency", 
              currency: "IDR" 
            }).format(paymentHistory.reduce((sum, payment) => sum + payment.amount, 0))}
          </span>
        </div>
      </div>
    </TableCell>
  )
}