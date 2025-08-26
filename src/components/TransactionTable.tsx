"use client"
import * as React from "react"
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { MoreHorizontal, PlusCircle, FileDown, Trash2, Search, X, Filter } from "lucide-react"
import * as XLSX from "xlsx"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { useNavigate } from "react-router-dom"

import { Badge, badgeVariants } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Link } from "react-router-dom"
import { Transaction, TransactionStatus } from "@/types/transaction"
import { format, startOfDay, endOfDay } from "date-fns"
import { id } from "date-fns/locale/id"
import { DateRange } from "react-day-picker"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { useToast } from "./ui/use-toast"
import { cn } from "@/lib/utils"
import { useTransactions } from "@/hooks/useTransactions"
import { Skeleton } from "./ui/skeleton"
import { useAuth } from "@/hooks/useAuth"
import { UserRole } from "@/types/user"
import { DateRangePicker } from "./ui/date-range-picker"

const statusOptions: TransactionStatus[] = ['Pesanan Masuk', 'Proses Design', 'ACC Costumer', 'Proses Produksi', 'Pesanan Selesai'];

const getStatusVariant = (status: TransactionStatus) => {
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

const getAvailableStatusOptions = (currentStatus: TransactionStatus, userRole: UserRole): TransactionStatus[] => {
  // Sequential workflow for all users
  switch (currentStatus) {
    case 'Pesanan Masuk':
      return ['Pesanan Masuk', 'Proses Design'];
    
    case 'Proses Design':
      return ['Proses Design', 'ACC Costumer'];
    
    case 'ACC Costumer':
      return ['ACC Costumer', 'Proses Produksi'];
    
    case 'Proses Produksi':
      return ['Proses Produksi', 'Pesanan Selesai'];
    
    case 'Pesanan Selesai':
      return ['Pesanan Selesai']; // Cannot change from completed
    
    case 'Dibatalkan':
      return ['Dibatalkan']; // Cannot change from canceled
    
    default:
      return [currentStatus];
  }
};

export function TransactionTable() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { transactions, isLoading, updateTransactionStatus, deductMaterials, deleteTransaction } = useTransactions();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [selectedTransaction, setSelectedTransaction] = React.useState<Transaction | null>(null);
  const [isCancelWarningOpen, setIsCancelWarningOpen] = React.useState(false);
  const [cancelTransactionData, setCancelTransactionData] = React.useState<{id: string, status: TransactionStatus} | null>(null);
  
  // State preservation for better UX when updating status
  const [savedScrollPosition, setSavedScrollPosition] = React.useState(0);
  const [savedTableState, setSavedTableState] = React.useState<{
    pagination: any;
    columnFilters: any;
    sorting: any;
  } | null>(null);
  
  // Add pagination state
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  });
  
  // Date range filter state
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>();
  
  // Status filter state
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  
  // Filter visibility state
  const [showFilters, setShowFilters] = React.useState<boolean>(false);

  const handleStatusChange = (transactionId: string, newStatus: TransactionStatus) => {
    // Save current state before making changes
    setSavedScrollPosition(window.pageYOffset);
    setSavedTableState({
      pagination: table.getState().pagination,
      columnFilters: table.getState().columnFilters,
      sorting: table.getState().sorting,
    });

    // Remove cancel logic since Dibatalkan is no longer an option

    // Proceed with normal status update
    updateTransactionStatus.mutate({ transactionId, status: newStatus }, {
      onSuccess: () => {
        toast({
          title: "Status Diperbarui",
          description: `Status untuk pesanan ${transactionId} diubah menjadi "${newStatus}".`,
        });
        
        // Restore table state after successful update
        setTimeout(() => {
          if (savedTableState) {
            table.setPageIndex(savedTableState.pagination.pageIndex);
            table.setColumnFilters(savedTableState.columnFilters);
            table.setSorting(savedTableState.sorting);
          }
          window.scrollTo(0, savedScrollPosition);
        }, 100);
        
        if (newStatus === 'Proses Produksi') {
          deductMaterials.mutate(transactionId, {
            onSuccess: () => {
              toast({
                title: "Stok Berkurang",
                description: "Stok bahan baku telah dikurangi sesuai BOM.",
              });
            },
            onError: (error) => {
              toast({ variant: "destructive", title: "Gagal Kurangi Stok", description: error.message });
            }
          });
        }
      },
      onError: (error) => {
        toast({ variant: "destructive", title: "Gagal", description: error.message });
      }
    });
  };

  const confirmCancelProduction = () => {
    if (cancelTransactionData) {
      updateTransactionStatus.mutate({ 
        transactionId: cancelTransactionData.id, 
        status: cancelTransactionData.status 
      }, {
        onSuccess: () => {
          toast({
            title: "Pesanan Dibatalkan",
            description: `Pesanan ${cancelTransactionData.id} telah dibatalkan meskipun sudah dalam proses produksi.`,
          });
          
          // Restore table state after successful update
          setTimeout(() => {
            if (savedTableState) {
              table.setPageIndex(savedTableState.pagination.pageIndex);
              table.setColumnFilters(savedTableState.columnFilters);
              table.setSorting(savedTableState.sorting);
            }
            window.scrollTo(0, savedScrollPosition);
          }, 100);
          
          setIsCancelWarningOpen(false);
          setCancelTransactionData(null);
        },
        onError: (error) => {
          toast({ variant: "destructive", title: "Gagal", description: error.message });
        }
      });
    }
  };

  const handleDeleteClick = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedTransaction) {
      deleteTransaction.mutate(selectedTransaction.id, {
        onSuccess: () => {
          toast({ title: "Transaksi Dihapus", description: `Transaksi ${selectedTransaction.id} berhasil dihapus.` });
          setIsDeleteDialogOpen(false);
        },
        onError: (error) => {
          toast({ variant: "destructive", title: "Gagal Hapus", description: error.message });
        }
      });
    }
  };

  const columns: ColumnDef<Transaction>[] = [
    {
      accessorKey: "id",
      header: "No. Order",
      cell: ({ row }) => <Badge variant="outline">{row.getValue("id")}</Badge>,
    },
    {
      accessorKey: "customerName",
      header: "Pelanggan",
    },
    {
      accessorKey: "orderDate",
      header: "Tgl Order",
      cell: ({ row }) => {
        const dateValue = row.getValue("orderDate");
        if (!dateValue) return "N/A";
        const date = new Date(dateValue as string | number | Date);
        return format(date, "d MMM yyyy, HH:mm", { locale: id });
      },
    },
    {
      accessorKey: "cashierName",
      header: "Kasir",
    },
    {
      id: "products",
      header: "Produk",
      cell: ({ row }) => {
        const transaction = row.original;
        const productNames = transaction.items.map(item => item.product.name).join(", ");
        return (
          <div className="max-w-[200px] truncate" title={productNames}>
            {productNames}
          </div>
        );
      },
      filterFn: (row, id, value) => {
        const transaction = row.original;
        const productNames = transaction.items.map(item => item.product.name.toLowerCase()).join(" ");
        return productNames.includes(value.toLowerCase());
      },
    },
    {
      accessorKey: "total",
      header: () => <div className="text-right">Total</div>,
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue("total"))
        const formatted = new Intl.NumberFormat("id-ID", {
          style: "currency",
          currency: "IDR",
          minimumFractionDigits: 0,
        }).format(amount)
        return <div className="text-right font-medium">{formatted}</div>
      },
    },
    {
      id: "paymentStatus",
      header: "Status Pembayaran",
      cell: ({ row }) => {
        const transaction = row.original;
        const total = transaction.total;
        const paidAmount = transaction.paidAmount || 0;
        
        let statusText = "";
        let variant: "default" | "secondary" | "destructive" | "outline" | "success" = "default";
        
        if (paidAmount === 0) {
          statusText = "Belum Lunas";
          variant = "destructive";
        } else if (paidAmount >= total) {
          statusText = "Lunas";
          variant = "success";
        } else {
          statusText = "Sebagian";
          variant = "secondary";
        }
        
        return (
          <div className="space-y-1">
            <Badge variant={variant}>{statusText}</Badge>
            <div className="text-xs text-muted-foreground">
              Dibayar: {new Intl.NumberFormat("id-ID", {
                style: "currency",
                currency: "IDR",
                minimumFractionDigits: 0,
              }).format(paidAmount)}
            </div>
            {paidAmount < total && (
              <div className="text-xs text-destructive">
                Sisa: {new Intl.NumberFormat("id-ID", {
                  style: "currency",
                  currency: "IDR",
                  minimumFractionDigits: 0,
                }).format(total - paidAmount)}
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const transaction = row.original;
        const availableOptions = user ? getAvailableStatusOptions(transaction.status, user.role) : [transaction.status];
        
        return (
          <Select
            value={transaction.status}
            onValueChange={(value: TransactionStatus) => handleStatusChange(transaction.id, value)}
            disabled={availableOptions.length <= 1 || updateTransactionStatus.isPending}
          >
            <SelectTrigger className={cn("w-[180px] border-0 focus:ring-0 focus:ring-offset-0", badgeVariants({ variant: getStatusVariant(transaction.status) }))}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableOptions.map(status => (
                <SelectItem key={status} value={status}>{status}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const transaction = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button aria-haspopup="true" size="icon" variant="ghost" onClick={(e) => e.stopPropagation()}>
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuLabel>Aksi</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => navigate(`/transactions/${transaction.id}`)}>Lihat Detail</DropdownMenuItem>
              {user && user.role === 'owner' && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-red-500 focus:text-red-500"
                    onClick={() => handleDeleteClick(transaction)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Hapus Transaksi
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  // Filter data by date range and status
  const filteredTransactions = React.useMemo(() => {
    let filtered = transactions || [];
    
    // Date range filter
    if (dateRange?.from) {
      const fromDate = startOfDay(dateRange.from);
      const toDate = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
      
      filtered = filtered.filter(transaction => {
        if (!transaction.orderDate) return false;
        const transactionDate = new Date(transaction.orderDate);
        return transactionDate >= fromDate && transactionDate <= toDate;
      });
    }
    
    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'belum_selesai') {
        // Filter untuk transaksi yang belum selesai (semua status kecuali "Pesanan Selesai")
        filtered = filtered.filter(transaction => transaction.status !== 'Pesanan Selesai');
      } else {
        // Filter berdasarkan status spesifik
        filtered = filtered.filter(transaction => transaction.status === statusFilter);
      }
    }
    
    return filtered;
  }, [transactions, dateRange, statusFilter]);

  const table = useReactTable({
    data: filteredTransactions,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onPaginationChange: setPagination,
    autoResetPageIndex: false,
    state: {
      pagination,
    },
  })

  const handleExportExcel = () => {
    // Use filtered data from table
    const dataToExport = table.getFilteredRowModel().rows.map(row => row.original);
    
    // Calculate summary
    const totalTransactions = dataToExport.length;
    const totalAmount = dataToExport.reduce((sum, t) => sum + t.total, 0);
    const totalPaid = dataToExport.reduce((sum, t) => sum + (t.paidAmount || 0), 0);
    
    const exportData = dataToExport.map(t => ({
      'No Order': t.id,
      'Pelanggan': t.customerName,
      'Tgl Order': t.orderDate ? format(new Date(t.orderDate), "d MMM yyyy, HH:mm", { locale: id }) : 'N/A',
      'Kasir': t.cashierName,
      'Produk': t.items.map(item => item.product.name).join(", "),
      'Total': t.total,
      'Dibayar': t.paidAmount || 0,
      'Sisa': t.total - (t.paidAmount || 0),
      'Status Pembayaran': (t.paidAmount || 0) === 0 ? 'Belum Lunas' : 
                          (t.paidAmount || 0) >= t.total ? 'Lunas' : 'Sebagian',
      'Status Order': t.status
    }));
    
    // Add summary rows
    exportData.push(
      {},
      {
        'No Order': 'RINGKASAN',
        'Pelanggan': '',
        'Tgl Order': '',
        'Kasir': '',
        'Produk': '',
        'Total': '',
        'Dibayar': '',
        'Sisa': '',
        'Status Pembayaran': '',
        'Status Order': ''
      },
      {
        'No Order': 'Jumlah Transaksi',
        'Pelanggan': totalTransactions,
        'Tgl Order': '',
        'Kasir': '',
        'Produk': '',
        'Total': '',
        'Dibayar': '',
        'Sisa': '',
        'Status Pembayaran': '',
        'Status Order': ''
      },
      {
        'No Order': 'Total Nilai Transaksi',
        'Pelanggan': new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(totalAmount),
        'Tgl Order': '',
        'Kasir': '',
        'Produk': '',
        'Total': '',
        'Dibayar': '',
        'Sisa': '',
        'Status Pembayaran': '',
        'Status Order': ''
      },
      {
        'No Order': 'Total Terbayar',
        'Pelanggan': new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(totalPaid),
        'Tgl Order': '',
        'Kasir': '',
        'Produk': '',
        'Total': '',
        'Dibayar': '',
        'Sisa': '',
        'Status Pembayaran': '',
        'Status Order': ''
      }
    );
    
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Transaksi");
    XLSX.writeFile(workbook, "data-transaksi.xlsx");
  };

  const handleExportPdf = () => {
    // Use filtered data from table
    const dataToExport = table.getFilteredRowModel().rows.map(row => row.original);
    
    // Calculate summary
    const totalTransactions = dataToExport.length;
    const totalAmount = dataToExport.reduce((sum, t) => sum + t.total, 0);
    const totalPaid = dataToExport.reduce((sum, t) => sum + (t.paidAmount || 0), 0);
    
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(16);
    doc.text('Laporan Transaksi', 20, 20);
    
    // Add filter info if date range is applied
    if (dateRange?.from) {
      doc.setFontSize(12);
      const fromDate = format(dateRange.from, "d MMM yyyy", { locale: id });
      const toDate = dateRange.to ? format(dateRange.to, "d MMM yyyy", { locale: id }) : fromDate;
      doc.text(`Periode: ${fromDate} - ${toDate}`, 20, 30);
    }
    
    // Add summary info
    doc.setFontSize(10);
    const summaryY = dateRange?.from ? 40 : 30;
    doc.text(`Jumlah Transaksi: ${totalTransactions}`, 20, summaryY);
    doc.text(`Total Nilai: ${new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(totalAmount)}`, 20, summaryY + 5);
    doc.text(`Total Terbayar: ${new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(totalPaid)}`, 20, summaryY + 10);
    
    autoTable(doc, {
      head: [['No. Order', 'Pelanggan', 'Tgl Order', 'Total', 'Dibayar', 'Status Bayar', 'Status Order']],
      body: dataToExport.map(t => [
        t.id,
        t.customerName,
        t.orderDate ? format(new Date(t.orderDate), "d MMM yyyy, HH:mm", { locale: id }) : 'N/A',
        new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(t.total),
        new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(t.paidAmount || 0),
        (t.paidAmount || 0) === 0 ? 'Belum Lunas' : 
        (t.paidAmount || 0) >= t.total ? 'Lunas' : 'Sebagian',
        t.status
      ]),
      startY: summaryY + 15,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [71, 85, 105] },
    });
    
    doc.save('data-transaksi.pdf');
  };

  return (
    <div className="w-full pb-24"> {/* Add bottom padding for fixed pagination */}
      {/* Header with Filter Toggle and Actions */}
      <div className="flex items-center justify-between py-4">
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowFilters(!showFilters)}
            className={`${showFilters ? 'bg-primary text-primary-foreground' : ''}`}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          {(table.getState().columnFilters.length > 0 || statusFilter !== 'all' || dateRange) && (
            <div className="flex items-center gap-2">
              <div className="text-sm text-muted-foreground">
                Menampilkan {table.getFilteredRowModel().rows.length} dari {table.getCoreRowModel().rows.length} transaksi
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  table.resetColumnFilters();
                  setStatusFilter('all');
                  setDateRange(undefined);
                }}
                className="h-8 px-2"
              >
                <X className="h-4 w-4" />
                Clear All
              </Button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExportExcel}><FileDown className="mr-2 h-4 w-4" /> Ekspor Excel</Button>
          <Button variant="outline" onClick={handleExportPdf}><FileDown className="mr-2 h-4 w-4" /> Ekspor PDF</Button>
          <Button asChild><Link to="/pos"><PlusCircle className="mr-2 h-4 w-4" /> Tambah Transaksi</Link></Button>
        </div>
      </div>

      {/* Collapsible Filter Section */}
      {showFilters && (
        <div className="border rounded-lg p-4 mb-4 bg-card">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Tanggal:</label>
                <DateRangePicker
                  date={dateRange}
                  onDateChange={setDateRange}
                  className="w-auto"
                />
                {dateRange && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setDateRange(undefined)}
                    className="h-9 px-2"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Status:</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Status</SelectItem>
                    <SelectItem value="belum_selesai">Belum Selesai</SelectItem>
                    <SelectItem value="Pesanan Masuk">Pesanan Masuk</SelectItem>
                    <SelectItem value="Proses Design">Proses Design</SelectItem>
                    <SelectItem value="ACC Costumer">ACC Customer</SelectItem>
                    <SelectItem value="Proses Produksi">Proses Produksi</SelectItem>
                    <SelectItem value="Pesanan Selesai">Pesanan Selesai</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Pelanggan:</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Cari berdasarkan nama pelanggan..."
                    value={(table.getColumn("customerName")?.getFilterValue() as string) ?? ""}
                    onChange={(event) =>
                      table.getColumn("customerName")?.setFilterValue(event.target.value)
                    }
                    className="pl-10 w-[250px]"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Produk:</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Cari berdasarkan produk..."
                    value={(table.getColumn("products")?.getFilterValue() as string) ?? ""}
                    onChange={(event) =>
                      table.getColumn("products")?.setFilterValue(event.target.value)
                    }
                    className="pl-10 w-[250px]"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>{headerGroup.headers.map((header) => (<TableHead key={header.id}>{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}</TableHead>))}</TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (<TableRow key={i}><TableCell colSpan={columns.length}><Skeleton className="h-8 w-full" /></TableCell></TableRow>))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  onClick={() => navigate(`/transactions/${row.original.id}`)}
                  className="cursor-pointer hover:bg-muted"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow><TableCell colSpan={columns.length} className="h-24 text-center">No results.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Fixed Pagination */}
      <div className="fixed bottom-6 right-6 bg-white border rounded-lg shadow-lg p-3 flex items-center gap-2 z-10">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => table.previousPage()} 
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        
        {/* Page numbers */}
        <div className="flex items-center gap-1">
          {Array.from({ length: table.getPageCount() }, (_, i) => {
            const pageNumber = i + 1;
            const currentPage = table.getState().pagination.pageIndex + 1;
            
            // Show first 2, current page with neighbors, and last 2 pages
            if (
              pageNumber <= 2 ||
              pageNumber >= table.getPageCount() - 1 ||
              (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
            ) {
              return (
                <Button
                  key={i}
                  variant={currentPage === pageNumber ? "default" : "outline"}
                  size="sm"
                  className="w-8 h-8 p-0"
                  onClick={() => table.setPageIndex(i)}
                >
                  {pageNumber}
                </Button>
              );
            } else if (
              pageNumber === 3 && currentPage > 4 ||
              pageNumber === table.getPageCount() - 2 && currentPage < table.getPageCount() - 3
            ) {
              return (
                <span key={i} className="px-2 text-muted-foreground">
                  ...
                </span>
              );
            }
            return null;
          })}
        </div>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => table.nextPage()} 
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
        
        <div className="text-xs text-muted-foreground ml-2">
          {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
        </div>
      </div>
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Ini akan menghapus data transaksi dengan nomor order <strong>{selectedTransaction?.id}</strong> secara permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className={cn(badgeVariants({ variant: "destructive" }))}
              onClick={confirmDelete}
              disabled={deleteTransaction.isPending}
            >
              {deleteTransaction.isPending ? "Menghapus..." : "Ya, Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isCancelWarningOpen} onOpenChange={setIsCancelWarningOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Peringatan: Barang Sudah Diproduksi</AlertDialogTitle>
            <AlertDialogDescription>
              Barang sudah di produksi yakin ingin membatalkan pesanan <strong>{cancelTransactionData?.id}</strong>?
              <br /><br />
              <span className="text-orange-600 font-medium">Perhatian:</span> Pembatalan ini akan mempengaruhi stok dan biaya produksi yang sudah dikeluarkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setIsCancelWarningOpen(false);
              setCancelTransactionData(null);
            }}>
              Tidak, Tetap Lanjutkan Produksi
            </AlertDialogCancel>
            <AlertDialogAction
              className={cn(badgeVariants({ variant: "destructive" }))}
              onClick={confirmCancelProduction}
              disabled={updateTransactionStatus.isPending}
            >
              {updateTransactionStatus.isPending ? "Membatalkan..." : "Ya, Batalkan Pesanan"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}