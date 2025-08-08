"use client"
import * as React from "react"
import { ChevronDown, ChevronRight, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PaymentHistory } from "@/types/paymentHistory"
import { format } from "date-fns"
import { id } from "date-fns/locale/id"

interface PaymentHistoryRowProps {
  transactionId: string
  paymentHistory: PaymentHistory[]
  isLoading?: boolean
}

export function PaymentHistoryRow({ transactionId, paymentHistory, isLoading = false }: PaymentHistoryRowProps) {
  const [isExpanded, setIsExpanded] = React.useState(false)

  if (isLoading) {
    return (
      <div className="px-4 py-2 text-sm text-muted-foreground">
        <Clock className="inline-block w-3 h-3 mr-1 animate-spin" />
        Memuat history pembayaran...
      </div>
    )
  }

  if (!paymentHistory || paymentHistory.length === 0) {
    return (
      <div className="px-4 py-2 text-sm text-muted-foreground">
        Belum ada pembayaran
      </div>
    )
  }

  return (
    <div className="border-t bg-muted/30">
      <Button
        variant="ghost"
        className="w-full justify-start px-4 py-2 h-auto font-normal"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 mr-2" />
        ) : (
          <ChevronRight className="w-4 h-4 mr-2" />
        )}
        <span className="text-sm">
          History Pembayaran ({paymentHistory.length} pembayaran)
        </span>
        <Badge variant="secondary" className="ml-2 text-xs">
          Total: {new Intl.NumberFormat("id-ID", { 
            style: "currency", 
            currency: "IDR" 
          }).format(paymentHistory.reduce((sum, payment) => sum + payment.amount, 0))}
        </Badge>
      </Button>
      
      {isExpanded && (
        <div className="px-4 pb-4">
          <div className="space-y-2">
            {paymentHistory
              .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
              .map((payment, index) => (
                <Card key={payment.id} className="shadow-sm">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            Pembayaran #{paymentHistory.length - index}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(payment.paymentDate), "d MMM yyyy, HH:mm", { locale: id })}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-green-600">
                              +{new Intl.NumberFormat("id-ID", { 
                                style: "currency", 
                                currency: "IDR" 
                              }).format(payment.amount)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Sisa setelah bayar: {new Intl.NumberFormat("id-ID", { 
                                style: "currency", 
                                currency: "IDR" 
                              }).format(payment.remainingAmount)}
                            </div>
                          </div>
                        </div>
                        {payment.notes && (
                          <div className="mt-1 text-xs text-muted-foreground italic">
                            "{payment.notes}"
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}