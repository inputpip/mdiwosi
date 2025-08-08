"use client"
import * as React from "react"
import { ColumnDef, flexRender, getCoreRowModel, useReactTable, Row } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Transaction } from "@/types/transaction"
import { useTransactions } from "@/hooks/useTransactions"
import { usePaymentHistoryBatch } from "@/hooks/usePaymentHistory"
import { format } from "date-fns"
import { id } from "date-fns/locale/id"
import { PayReceivableDialog } from "./PayReceivableDialog"
import { PaymentHistoryRow } from "./PaymentHistoryRow"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu"
import { MoreHorizontal, ChevronDown, ChevronRight } from "lucide-react"
import { useAuthContext } from "@/contexts/AuthContext"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog"
import { showSuccess, showError } from "@/utils/toast"

export function ReceivablesTable() {
  const { transactions, isLoading, writeOffReceivable } = useTransactions()
  const { user } = useAuthContext()
  const [isPayDialogOpen, setIsPayDialogOpen] = React.useState(false)
  const [isWriteOffDialogOpen, setIsWriteOffDialogOpen] = React.useState(false)
  const [selectedTransaction, setSelectedTransaction] = React.useState<Transaction | null>(null)
  const [expandedRows, setExpandedRows] = React.useState<Set<string>>(new Set())

  const receivables = React.useMemo(() => {
    return transactions?.filter(t => t.paymentStatus === 'Belum Lunas') || []
  }, [transactions])

  const receivableIds = React.useMemo(() => {
    return receivables.map(r => r.id)
  }, [receivables])

  const { paymentHistories, isLoading: isLoadingHistory } = usePaymentHistoryBatch(receivableIds)

  const handlePayClick = (transaction: Transaction) => {
    setSelectedTransaction(transaction)
    setIsPayDialogOpen(true)
  }

  const handleWriteOffClick = (transaction: Transaction) => {
    setSelectedTransaction(transaction)
    setIsWriteOffDialogOpen(true)
  }

  const toggleRowExpansion = (transactionId: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(transactionId)) {
      newExpanded.delete(transactionId)
    } else {
      newExpanded.add(transactionId)
    }
    setExpandedRows(newExpanded)
  }

  const handleConfirmWriteOff = async () => {
    if (!selectedTransaction) return

    try {
      await writeOffReceivable.mutateAsync(selectedTransaction)
      showSuccess(`Piutang untuk No. Order ${selectedTransaction.id} berhasil diputihkan.`)
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Gagal memutihkan piutang."
      showError(errorMessage)
    } finally {
      setIsWriteOffDialogOpen(false)
      setSelectedTransaction(null)
    }
  }

  const columns: ColumnDef<Transaction>[] = [
    {
      id: "expand",
      header: "",
      cell: ({ row }) => {
        const isExpanded = expandedRows.has(row.original.id)
        const hasPaymentHistory = paymentHistories[row.original.id]?.length > 0
        
        return hasPaymentHistory ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => toggleRowExpansion(row.original.id)}
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </Button>
        ) : null
      }
    },
    { accessorKey: "id", header: "No. Order" },
    { accessorKey: "customerName", header: "Pelanggan" },
    { accessorKey: "orderDate", header: "Tgl Order", cell: ({ row }) => format(new Date(row.getValue("orderDate")), "d MMM yyyy", { locale: id }) },
    { accessorKey: "total", header: "Total Tagihan", cell: ({ row }) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(row.getValue("total")) },
    { accessorKey: "paidAmount", header: "Telah Dibayar", cell: ({ row }) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(row.getValue("paidAmount")) },
    {
      id: "remainingAmount",
      header: "Sisa Tagihan",
      cell: ({ row }) => {
        const remaining = row.original.total - row.original.paidAmount
        return <span className="font-bold text-destructive">{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(remaining)}</span>
      }
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Buka menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handlePayClick(row.original)}>
              Bayar
            </DropdownMenuItem>
            {user?.role === 'owner' && (
              <DropdownMenuItem
                className="text-orange-600 focus:text-orange-600 focus:bg-orange-50"
                onClick={() => handleWriteOffClick(row.original)}
              >
                Putihkan Piutang
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  const table = useReactTable({
    data: receivables,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <>
      <PayReceivableDialog open={isPayDialogOpen} onOpenChange={setIsPayDialogOpen} transaction={selectedTransaction} />
      <AlertDialog open={isWriteOffDialogOpen} onOpenChange={setIsWriteOffDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Anda yakin ingin memutihkan piutang ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini akan menghapus sisa tagihan untuk <strong>No. Order {selectedTransaction?.id}</strong> sebesar <strong>{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(selectedTransaction ? selectedTransaction.total - selectedTransaction.paidAmount : 0)}</strong>.
              <br /><br />
              Sebuah catatan pengeluaran akan dibuat secara otomatis untuk menyeimbangkan pembukuan. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmWriteOff}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Ya, Putihkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <div className="rounded-md border">
        <Table>
          <TableHeader>{table.getHeaderGroups().map(hg => <TableRow key={hg.id}>{hg.headers.map(h => <TableHead key={h.id}>{flexRender(h.column.columnDef.header, h.getContext())}</TableHead>)}</TableRow>)}</TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={columns.length}>Memuat...</TableCell></TableRow> :
              table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map(row => (
                  <React.Fragment key={row.id}>
                    <TableRow>
                      {row.getVisibleCells().map(cell => <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>)}
                    </TableRow>
                    {expandedRows.has(row.original.id) && (
                      <TableRow>
                        <TableCell colSpan={columns.length} className="p-0">
                          <PaymentHistoryRow
                            transactionId={row.original.id}
                            paymentHistory={paymentHistories[row.original.id] || []}
                            isLoading={isLoadingHistory}
                          />
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))
              ) : (
                <TableRow><TableCell colSpan={columns.length} className="h-24 text-center">Tidak ada piutang.</TableCell></TableRow>
              )}
          </TableBody>
        </Table>
      </div>
    </>
  )
}