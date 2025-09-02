"use client"
import * as React from "react"
import { format, startOfDay, endOfDay } from 'date-fns'
import { id } from 'date-fns/locale/id'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { CalendarDays, DollarSign, FileText, User, Wallet } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useEmployeeAdvances } from "@/hooks/useEmployeeAdvances"

interface TodayPaidAdvance {
  id: string
  employee_id: string
  employee_name: string
  amount: number
  date: string
  notes?: string
  remaining_amount: number
  account_id: string
  account_name: string
  updated_at: string
  advance_repayments: {
    id: string
    amount: number
    date: string
    recorded_by: string
  }[]
}

export function PaidAdvancesTable() {
  console.log('PaidAdvancesTable component rendered')
  
  // Use existing hook that already works
  const { advances, isLoading, isError, error } = useEmployeeAdvances()
  
  // Filter for paid advances (remaining amount = 0)
  const paidAdvances = React.useMemo(() => {
    if (!advances) return []
    
    const paid = advances.filter(advance => advance.remainingAmount <= 0)
    console.log('All advances from hook:', advances)
    console.log('Paid advances filtered:', paid)
    
    return paid
  }, [advances])

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Riwayat Panjar Karyawan yang Sudah Lunas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Riwayat Panjar Karyawan yang Sudah Lunas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-destructive">
            Error: {error?.message || 'Terjadi kesalahan saat memuat data'}
          </div>
        </CardContent>
      </Card>
    )
  }

  const totalAmount = paidAdvances?.reduce((sum, advance) => sum + advance.amount, 0) || 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5" />
          Riwayat Panjar Karyawan yang Sudah Lunas
        </CardTitle>
        <CardDescription>
          Daftar semua panjar karyawan yang sudah dilunaskan
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Summary */}
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            <div>
              <div className="text-sm font-medium text-green-700">
                Total Panjar yang Sudah Dilunaskan
              </div>
              <div className="text-2xl font-bold text-green-600">
                {new Intl.NumberFormat("id-ID", {
                  style: "currency",
                  currency: "IDR",
                  minimumFractionDigits: 0,
                }).format(totalAmount)}
              </div>
              <div className="text-xs text-green-600">
                {paidAdvances?.length || 0} panjar
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        {paidAdvances && paidAdvances.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Karyawan</TableHead>
                  <TableHead>Jumlah Panjar</TableHead>
                  <TableHead>Tanggal Dibuat</TableHead>
                  <TableHead>Tanggal Pelunasan</TableHead>
                  <TableHead>Sumber Dana</TableHead>
                  <TableHead>Catatan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paidAdvances.map((advance) => (
                  <TableRow key={advance.id}>
                    <TableCell className="font-medium">
                      {advance.employeeName}
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-green-600">
                        {new Intl.NumberFormat("id-ID", { 
                          style: "currency", 
                          currency: "IDR",
                          minimumFractionDigits: 0,
                        }).format(advance.amount)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {advance.date ? format(advance.date, "d MMM yyyy", { locale: id }) : 'Tanggal tidak valid'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {advance.updatedAt ? format(advance.updatedAt, "d MMM yyyy HH:mm", { locale: id }) : '-'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        <Wallet className="w-3 h-3 mr-1" />
                        {advance.accountName}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {advance.notes || '-'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="mx-auto h-12 w-12 mb-2 opacity-50" />
            <p>Belum ada panjar karyawan yang dilunaskan</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}