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
import { FileDown, X, RefreshCw, CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker"
import * as XLSX from "xlsx"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { CashHistory } from "@/types/cashFlow"
import { format, startOfDay, endOfDay } from "date-fns"
import { id } from "date-fns/locale/id"
import { Skeleton } from "./ui/skeleton"
import { useAuth } from "@/hooks/useAuth"
import { useToast } from "@/components/ui/use-toast"
import { supabase } from "@/integrations/supabase/client"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MoreHorizontal, Trash2 } from "lucide-react"
import { TransferAccountDialog } from "./TransferAccountDialog"
import { DateRangePicker } from "./ui/date-range-picker"

const getTypeVariant = (item: CashHistory) => {
  // Handle transfers with special color
  if (item.source_type === 'transfer_masuk' || item.source_type === 'transfer_keluar') {
    return 'secondary'; // Different color for transfers
  }

  // Handle employee advance repayment (success - income)
  if (item.source_type === 'employee_advance_repayment') {
    return 'success';
  }

  // Handle new format with 'type' field
  if (item.type) {
    switch (item.type) {
      case 'orderan':
      case 'kas_masuk_manual': 
      case 'transfer_masuk':
      case 'panjar_pelunasan':
      case 'pemutihan_piutang':
        return 'success';
      case 'kas_keluar_manual':
      case 'pengeluaran':
      case 'pembayaran_po':
      case 'transfer_keluar':
      case 'panjar_pengambilan':
        return 'destructive';
      default: 
        return 'outline';
    }
  }
  
  // Handle old format with 'transaction_type' field
  if (item.transaction_type) {
    return item.transaction_type === 'income' ? 'success' : 'destructive';
  }
  
  return 'outline';
}

const getTypeLabel = (item: CashHistory) => {
  // Handle transfers first
  if (item.source_type === 'transfer_masuk') {
    return 'Transfer Masuk';
  } else if (item.source_type === 'transfer_keluar') {
    return 'Transfer Keluar';
  }

  // Handle new format with 'type' field
  if (item.type) {
    const labels = {
      'orderan': 'Orderan',
      'kas_masuk_manual': 'Kas Masuk Manual',
      'kas_keluar_manual': 'Kas Keluar Manual',
      'panjar_pengambilan': 'Panjar Pengambilan',
      'panjar_pelunasan': 'Panjar Pelunasan',
      'pengeluaran': 'Pengeluaran',
      'pembayaran_po': 'Pembayaran PO',
      'pemutihan_piutang': 'Pembayaran Piutang',
      'transfer_masuk': 'Transfer Masuk',
      'transfer_keluar': 'Transfer Keluar'
    };
    return labels[item.type as keyof typeof labels] || item.type;
  }
  
  // Handle old format - detect from source_type and transaction_type
  if (item.source_type) {
    switch (item.source_type) {
      case 'receivables_payment':
        return 'Pembayaran Piutang';
      case 'pos_direct':
        return 'Penjualan (POS)';
      case 'manual_expense':
        return 'Pengeluaran Manual';
      case 'employee_advance':
        return 'Panjar Karyawan';
      case 'employee_advance_repayment':
        return 'Pelunasan Panjar Karyawan';
      case 'po_payment':
        return 'Pembayaran PO';
      case 'receivables_writeoff':
        return 'Pemutihan Piutang';
      case 'transfer_masuk':
        return 'Transfer Masuk';
      case 'transfer_keluar':
        return 'Transfer Keluar';
      default:
        return item.source_type;
    }
  }
  
  if (item.transaction_type) {
    return item.transaction_type === 'income' ? 'Kas Masuk' : 'Kas Keluar';
  }
  
  return 'Tidak Diketahui';
}

// Get all available transaction type options
const getAllTransactionTypes = (data: CashHistory[]) => {
  const types = new Set<string>();
  data.forEach(item => {
    const typeLabel = getTypeLabel(item);
    types.add(typeLabel);
  });
  return Array.from(types).sort();
}

const isIncomeType = (item: CashHistory) => {
  // Handle transfers first
  if (item.source_type === 'transfer_masuk') {
    return true;
  }
  if (item.source_type === 'transfer_keluar') {
    return false;
  }

  // Handle employee advance repayment (income)
  if (item.source_type === 'employee_advance_repayment') {
    return true;
  }

  // Handle new format with 'type' field
  if (item.type) {
    return ['orderan', 'kas_masuk_manual', 'panjar_pelunasan', 'pemutihan_piutang'].includes(item.type);
  }
  
  // Handle format with 'transaction_type' field
  if (item.transaction_type) {
    return item.transaction_type === 'income';
  }
  
  return false;
}

interface CashFlowTableProps {
  data: CashHistory[];
  isLoading: boolean;
  onRefresh?: () => void;
  dateRange?: DateRange;
  onDateRangeChange?: (dateRange: DateRange | undefined) => void;
}

export function CashFlowTable({ data, isLoading, onRefresh, dateRange, onDateRangeChange }: CashFlowTableProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [selectedRecord, setSelectedRecord] = React.useState<CashHistory | null>(null);
  const [transactionTypeFilter, setTransactionTypeFilter] = React.useState<string>("all");
  
  // Get available transaction types from data
  const availableTransactionTypes = React.useMemo(() => {
    return getAllTransactionTypes(data || []);
  }, [data]);

  // Debug logging for employee advances (reduced)
  React.useEffect(() => {
    if (data) {
      const employeeAdvances = data.filter(item => item.source_type === 'employee_advance');
      if (employeeAdvances.length > 0) {
        console.log('Employee advances in table:', employeeAdvances.length);
      }
    }
  }, [data]);
  const [isTransferDialogOpen, setIsTransferDialogOpen] = React.useState(false);
  const [accountBalances, setAccountBalances] = React.useState<{[key: string]: number}>({});

  // Fetch current account balances
  React.useEffect(() => {
    const fetchAccountBalances = async () => {
      try {
        const { data: accounts, error } = await supabase
          .from('accounts')
          .select('id, balance');
        
        if (error) throw error;
        
        const balances: {[key: string]: number} = {};
        accounts?.forEach(account => {
          balances[account.id] = account.balance || 0;
        });
        setAccountBalances(balances);
      } catch (error) {
        console.error('Failed to fetch account balances:', error);
      }
    };

    fetchAccountBalances();
  }, []);

  // Calculate running account balance for each transaction
  const dataWithAccountBalance = React.useMemo(() => {
    if (!data || Object.keys(accountBalances).length === 0) {
      return data || [];
    }
    
    // Sort data by created_at (newest first, same as display order)
    const sortedData = [...data].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    
    // Create a copy of account balances starting from current balances
    const workingBalances = { ...accountBalances };
    
    // Calculate balance after each transaction (working backwards from current balance)
    const dataWithBalances = sortedData.map((item) => {
      const accountId = item.account_id;
      const currentAccountBalance = workingBalances[accountId] || 0;
      
      // This is the balance AFTER this transaction (current state)
      const balanceAfterTransaction = currentAccountBalance;
      
      // Calculate what the balance was BEFORE this transaction for next iteration
      const isIncome = isIncomeType(item);
      
      if (item.source_type === 'transfer_masuk') {
        // Money came into this account, so before transaction balance was less
        workingBalances[accountId] = currentAccountBalance - item.amount;
      } else if (item.source_type === 'transfer_keluar') {
        // Money left this account, so before transaction balance was more
        workingBalances[accountId] = currentAccountBalance + item.amount;
      } else if (isIncome) {
        // Income increased balance, so before transaction balance was less
        workingBalances[accountId] = currentAccountBalance - item.amount;
      } else {
        // Expense decreased balance, so before transaction balance was more
        workingBalances[accountId] = currentAccountBalance + item.amount;
      }
      
      return { ...item, accountBalance: balanceAfterTransaction };
    });
    
    return dataWithBalances;
  }, [data, accountBalances]);

  const handleDeleteCashHistory = async () => {
    if (!selectedRecord) return;

    try {
      // First, determine the impact on account balance
      const isIncome = isIncomeType(selectedRecord);
      const balanceChange = isIncome ? -selectedRecord.amount : selectedRecord.amount;

      // Update account balance to reverse the transaction effect
      if (selectedRecord.account_id) {
        // Get current account balance first
        const { data: account, error: fetchError } = await supabase
          .from('accounts')
          .select('balance')
          .eq('id', selectedRecord.account_id)
          .single();

        if (fetchError) throw new Error(`Failed to fetch account: ${fetchError.message}`);

        let newBalance;
        
        if (selectedRecord.source_type === 'transfer_masuk' || selectedRecord.source_type === 'transfer_keluar') {
          // For transfers, reverse the direction
          if (selectedRecord.source_type === 'transfer_masuk') {
            // This was money coming in, so subtract it back
            newBalance = (account.balance || 0) - selectedRecord.amount;
          } else if (selectedRecord.source_type === 'transfer_keluar') {
            // This was money going out, so add it back
            newBalance = (account.balance || 0) + selectedRecord.amount;
          } else {
            newBalance = account.balance; // No change for other transfer types
          }
        } else {
          // For regular transactions, reverse the effect
          newBalance = (account.balance || 0) + balanceChange;
        }

        // Update the account balance
        const { error: updateError } = await supabase
          .from('accounts')
          .update({ balance: newBalance })
          .eq('id', selectedRecord.account_id);

        if (updateError) throw new Error(`Failed to update account balance: ${updateError.message}`);
      }

      // Now delete the cash history record
      const { error } = await supabase
        .from('cash_history')
        .delete()
        .eq('id', selectedRecord.id);

      if (error) throw error;

      toast({
        title: "Berhasil",
        description: "Data arus kas berhasil dihapus dan saldo akun diperbarui."
      });

      // Refresh the page or invalidate query
      window.location.reload();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Gagal",
        description: error instanceof Error ? error.message : "Terjadi kesalahan"
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setSelectedRecord(null);
    }
  };
  const columns: ColumnDef<CashHistory & { accountBalance?: number }>[] = [
    {
      accessorKey: "created_at",
      header: "Tanggal",
      cell: ({ row }) => {
        const dateValue = row.getValue("created_at");
        if (!dateValue) return "N/A";
        const date = new Date(dateValue as string);
        return format(date, "d MMM yyyy, HH:mm", { locale: id });
      },
    },
    {
      accessorKey: "account_name",
      header: "Akun Keuangan",
    },
    {
      id: "transactionType",
      header: "Jenis Transaksi",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <Badge variant={getTypeVariant(item)}>
            {getTypeLabel(item)}
          </Badge>
        );
      },
    },
    {
      accessorKey: "description",
      header: "Deskripsi",
      cell: ({ row }) => {
        const description = row.getValue("description") as string;
        return (
          <div className="max-w-[300px] truncate" title={description}>
            {description}
          </div>
        );
      },
    },
    {
      accessorKey: "reference_name",
      header: "Referensi",
      cell: ({ row }) => {
        const refName = row.getValue("reference_name") as string;
        const refId = row.original.reference_id;
        if (!refName && !refId) return "-";
        return (
          <div className="text-sm">
            {refName && <div className="font-medium">{refName}</div>}
            {refId && <div className="text-muted-foreground">{refId}</div>}
          </div>
        );
      },
    },
    {
      id: "cashFlow",
      header: "Kas Masuk",
      cell: ({ row }) => {
        const item = row.original;
        const amount = item.amount;
        
        if (isIncomeType(item)) {
          return (
            <div className="text-right font-medium text-green-600">
              {new Intl.NumberFormat("id-ID", {
                style: "currency",
                currency: "IDR",
                minimumFractionDigits: 0,
              }).format(amount)}
            </div>
          );
        }
        return <div className="text-right">-</div>;
      },
    },
    {
      id: "cashOut",
      header: "Kas Keluar",
      cell: ({ row }) => {
        const item = row.original;
        const amount = item.amount;
        
        if (!isIncomeType(item)) {
          return (
            <div className="text-right font-medium text-red-600">
              {new Intl.NumberFormat("id-ID", {
                style: "currency",
                currency: "IDR",
                minimumFractionDigits: 0,
              }).format(amount)}
            </div>
          );
        }
        return <div className="text-right">-</div>;
      },
    },
    {
      id: "accountBalance",
      header: "Saldo Akun",
      cell: ({ row }) => {
        const item = row.original as CashHistory & { accountBalance?: number };
        const balance = item.accountBalance;
        
        if (balance === undefined) return <div className="text-right text-muted-foreground">-</div>;
        
        return (
          <div className={`text-right font-medium ${balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
            {new Intl.NumberFormat("id-ID", {
              style: "currency",
              currency: "IDR",
              minimumFractionDigits: 0,
            }).format(balance)}
          </div>
        );
      },
    },
    {
      id: "createdBy",
      header: "Dibuat Oleh",
      cell: ({ row }) => {
        const item = row.original;
        return item.user_name || item.created_by_name || 'Unknown';
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const item = row.original;
        
        // Only show actions for owner
        if (!user || user.role !== 'owner') {
          return null;
        }
        
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button aria-haspopup="true" size="icon" variant="ghost">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Aksi</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-500 focus:text-red-500"
                onClick={() => {
                  setSelectedRecord(item);
                  setIsDeleteDialogOpen(true);
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Hapus Data
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ]

  // Filter data by date range and transaction type
  const filteredData = React.useMemo(() => {
    let filtered = dataWithAccountBalance || [];
    
    // Filter by date range
    if (dateRange?.from) {
      const fromDate = startOfDay(dateRange.from);
      const toDate = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
      
      filtered = filtered.filter(item => {
        if (!item.created_at) return false;
        const itemDate = new Date(item.created_at);
        return itemDate >= fromDate && itemDate <= toDate;
      });
    }
    
    // Filter by transaction type
    if (transactionTypeFilter !== "all") {
      filtered = filtered.filter(item => {
        const typeLabel = getTypeLabel(item);
        return typeLabel === transactionTypeFilter;
      });
    }
    
    return filtered;
  }, [dataWithAccountBalance, dateRange, transactionTypeFilter]);

  const table = useReactTable({
    data: filteredData || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  const handleExportExcel = () => {
    // Use filtered data from table instead of all data
    const dataToExport = table.getFilteredRowModel().rows.map(row => row.original);
    
    const exportData = dataToExport.map(item => ({
      'Tanggal': item.created_at ? format(new Date(item.created_at), "d MMM yyyy, HH:mm", { locale: id }) : 'N/A',
      'Akun Keuangan': item.account_name || 'Unknown Account',
      'Jenis Transaksi': getTypeLabel(item),
      'Deskripsi': item.description,
      'Referensi': item.reference_name || item.reference_id || item.reference_number || '-',
      'Kas Masuk': isIncomeType(item) ? item.amount : 0,
      'Kas Keluar': !isIncomeType(item) ? item.amount : 0,
      'Saldo Akun': item.accountBalance || 0,
      'Dibuat Oleh': item.user_name || item.created_by_name || 'Unknown'
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Buku Besar");
    XLSX.writeFile(workbook, "buku-besar.xlsx");
  };

  const handleExportPdf = () => {
    // Use filtered data from table instead of all data
    const dataToExport = table.getFilteredRowModel().rows.map(row => row.original);
    
    const doc = new jsPDF('l', 'mm', 'a4'); // landscape orientation for more columns
    autoTable(doc, {
      head: [['Tanggal', 'Akun', 'Jenis', 'Deskripsi', 'Kas Masuk', 'Kas Keluar', 'Saldo Akun', 'User']],
      body: dataToExport.map(item => [
        item.created_at ? format(new Date(item.created_at), "d MMM yyyy, HH:mm", { locale: id }) : 'N/A',
        item.account_name || 'Unknown Account',
        getTypeLabel(item),
        item.description,
        isIncomeType(item) ? new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(item.amount) : '-',
        !isIncomeType(item) ? new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(item.amount) : '-',
        item.accountBalance ? new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(item.accountBalance) : '-',
        item.user_name || item.created_by_name || 'Unknown'
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [71, 85, 105] },
    });
    doc.save('arus-kas.pdf');
  };

  // Calculate summary (exclude ONLY internal transfers, include other transfers)
  const summary = React.useMemo(() => {
    if (!data) return { totalIncome: 0, totalExpense: 0, netFlow: 0 };
    
    const totalIncome = data
      .filter(item => {
        if (isIncomeType(item)) {
          // Exclude only internal transfers (transfer antar kas)
          if (item.source_type === 'transfer_masuk' || item.source_type === 'transfer_keluar') {
            return false;
          }
          return true;
        }
        return false;
      })
      .reduce((sum, item) => sum + item.amount, 0);
    
    const totalExpense = data
      .filter(item => {
        if (!isIncomeType(item)) {
          // Exclude only internal transfers (transfer antar kas)
          if (item.source_type === 'transfer_masuk' || item.source_type === 'transfer_keluar') {
            return false;
          }
          return true;
        }
        return false;
      })
      .reduce((sum, item) => sum + item.amount, 0);
    
    return {
      totalIncome,
      totalExpense,
      netFlow: totalIncome - totalExpense
    };
  }, [data]);

  return (
    <div className="w-full space-y-4">
      <TransferAccountDialog open={isTransferDialogOpen} onOpenChange={setIsTransferDialogOpen} />
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-sm font-medium text-green-700">Total Kas Masuk</div>
          <div className="text-2xl font-bold text-green-600">
            {new Intl.NumberFormat("id-ID", {
              style: "currency",
              currency: "IDR",
              minimumFractionDigits: 0,
            }).format(summary.totalIncome)}
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-sm font-medium text-red-700">Total Kas Keluar</div>
          <div className="text-2xl font-bold text-red-600">
            {new Intl.NumberFormat("id-ID", {
              style: "currency",
              currency: "IDR",
              minimumFractionDigits: 0,
            }).format(summary.totalExpense)}
          </div>
        </div>
        <div className={`border rounded-lg p-4 ${summary.netFlow >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'}`}>
          <div className={`text-sm font-medium ${summary.netFlow >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
            Kas Bersih
          </div>
          <div className={`text-2xl font-bold ${summary.netFlow >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
            {new Intl.NumberFormat("id-ID", {
              style: "currency",
              currency: "IDR",
              minimumFractionDigits: 0,
            }).format(summary.netFlow)}
          </div>
        </div>
      </div>

      {/* Date Range and Transaction Type Filters */}
      <div className="flex items-center gap-4 mb-4">
        {onDateRangeChange && (
          <>
            <DateRangePicker
              date={dateRange}
              onDateChange={onDateRangeChange}
              className="w-auto"
            />
            {dateRange && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => onDateRangeChange(undefined)}
                className="h-9 px-3"
              >
                <X className="h-4 w-4 mr-1" />
                Clear Date
              </Button>
            )}
          </>
        )}
        
        {/* Transaction Type Filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Jenis:</span>
          <Select value={transactionTypeFilter} onValueChange={setTransactionTypeFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Pilih jenis transaksi..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Jenis</SelectItem>
              {availableTransactionTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {transactionTypeFilter !== "all" && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setTransactionTypeFilter("all")}
              className="h-9 px-3"
            >
              <X className="h-4 w-4 mr-1" />
              Clear Type
            </Button>
          )}
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="flex items-center justify-between">
        <div className="flex gap-4 items-center">
          <div className="relative max-w-sm">
            <Input
              placeholder="Cari akun keuangan..."
              value={(table.getColumn("account_name")?.getFilterValue() as string) ?? ""}
              onChange={(event) =>
                table.getColumn("account_name")?.setFilterValue(event.target.value)
              }
            />
          </div>
          {(table.getState().columnFilters.length > 0 || dateRange || transactionTypeFilter !== "all") && (
            <div className="flex items-center gap-2">
              <div className="text-sm text-muted-foreground">
                Menampilkan {table.getFilteredRowModel().rows.length} dari {(dataWithAccountBalance || []).length} transaksi
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  table.resetColumnFilters();
                  setTransactionTypeFilter("all");
                  if (onDateRangeChange) onDateRangeChange(undefined);
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
          {onRefresh && (
            <Button variant="outline" onClick={onRefresh}>
              <RefreshCw className="mr-2 h-4 w-4" /> Refresh
            </Button>
          )}
          <Button variant="outline" onClick={handleExportExcel}>
            <FileDown className="mr-2 h-4 w-4" /> Ekspor Excel
          </Button>
          <Button variant="outline" onClick={handleExportPdf}>
            <FileDown className="mr-2 h-4 w-4" /> Ekspor PDF
          </Button>
          <Button variant="outline" className="text-blue-600 border-blue-600 hover:bg-blue-50" onClick={() => setIsTransferDialogOpen(true)}>
            <MoreHorizontal className="mr-2 h-4 w-4" /> Transfer Antar Kas
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={columns.length}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  Tidak ada data arus kas.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Pagination */}
      <div className="flex items-center justify-end space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Data Buku Besar</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus data buku besar ini? 
              <br /><br />
              <strong>Deskripsi:</strong> {selectedRecord?.description}
              <br />
              <strong>Jumlah:</strong> {selectedRecord?.amount && new Intl.NumberFormat("id-ID", {
                style: "currency",
                currency: "IDR",
                minimumFractionDigits: 0,
              }).format(selectedRecord.amount)}
              <br /><br />
              <span className="text-destructive">Tindakan ini tidak dapat dibatalkan.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteCashHistory}
            >
              Ya, Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}