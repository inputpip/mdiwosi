"use client"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { useToast } from "./ui/use-toast"
import { useAuth } from "@/hooks/useAuth"
import { useUsers } from "@/hooks/useUsers"
import { useEmployeeAdvances } from "@/hooks/useEmployeeAdvances"
import { EmployeeAdvance } from "@/types/employeeAdvance"
import { RepayAdvanceDialog } from "./RepayAdvanceDialog"
import { format } from "date-fns"
import { id } from "date-fns/locale/id"
import { Badge } from "./ui/badge"
import { useAccounts } from "@/hooks/useAccounts"
import { Trash2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { PaidAdvancesTable } from "./TodayEmployeeAdvancePayments"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const advanceSchema = z.object({
  employeeId: z.string().min(1, "Karyawan harus dipilih."),
  amount: z.coerce.number().min(1000, "Jumlah minimal Rp 1.000."),
  notes: z.string().optional(),
  accountId: z.string().min(1, "Sumber dana harus dipilih."),
})

type AdvanceFormData = z.infer<typeof advanceSchema>

export function EmployeeAdvanceManagement() {
  const { toast } = useToast()
  const { user } = useAuth()
  const { users: employees, isLoading: loadingUsers } = useUsers()
  const { accounts, isLoading: loadingAccounts } = useAccounts()
  const { advances, isLoading: loadingAdvances, addAdvance, deleteAdvance, isError, error: advancesError } = useEmployeeAdvances()
  const [isRepayDialogOpen, setIsRepayDialogOpen] = useState(false)
  const [selectedAdvance, setSelectedAdvance] = useState<EmployeeAdvance | null>(null)

  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<AdvanceFormData>({
    resolver: zodResolver(advanceSchema),
    defaultValues: {
      employeeId: "",
      amount: 0,
      notes: "",
      accountId: "",
    }
  })

  const handleOpenRepayDialog = (advance: EmployeeAdvance) => {
    setSelectedAdvance(advance)
    setIsRepayDialogOpen(true)
  }

  const onAddAdvanceSubmit = (data: AdvanceFormData) => {
    const employee = employees?.find(e => e.id === data.employeeId)
    const account = accounts?.find(a => a.id === data.accountId)
    if (!employee || !account) return

    const newAdvanceData = {
      employeeId: data.employeeId,
      amount: data.amount,
      date: new Date(), // Selalu gunakan waktu saat ini
      notes: data.notes,
      accountId: data.accountId,
      employeeName: employee.name,
      accountName: account.name,
    };

    addAdvance.mutate(newAdvanceData, {
      onSuccess: () => {
        toast({ title: "Sukses", description: "Panjar berhasil dicatat." })
        reset({ amount: 0, employeeId: '', notes: '', accountId: '' })
      },
      onError: (error) => {
        toast({ variant: "destructive", title: "Gagal", description: error.message })
      }
    })
  }

  const handleDeleteAdvance = (advance: EmployeeAdvance) => {
    deleteAdvance.mutate(advance, {
      onSuccess: () => {
        toast({ title: "Sukses", description: "Data panjar berhasil dihapus." });
      },
      onError: (error) => {
        toast({ variant: "destructive", title: "Gagal", description: error.message });
      }
    });
  };

  const isAdminOrOwnerOrCashier = user?.role === 'admin' || user?.role === 'owner' || user?.role === 'cashier';
  const isOwner = user?.role === 'owner';

  // Filter hanya panjar yang belum lunas
  const advancesUnpaid = advances?.filter(adv => adv.remainingAmount > 0) || [];
  const groupedAdvances = advancesUnpaid.reduce((groups, advance) => {
    const employeeName = advance.employeeName;
    if (!groups[employeeName]) {
      groups[employeeName] = [];
    }
    groups[employeeName].push(advance);
    return groups;
  }, {} as Record<string, EmployeeAdvance[]>) || {};

  const getEmployeeTotalDebt = (employeeAdvances: EmployeeAdvance[]) => {
    return employeeAdvances.reduce((total, advance) => total + advance.remainingAmount, 0);
  };

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-destructive">Gagal Memuat Data</CardTitle>
          <CardDescription>
            Terjadi kesalahan saat mengambil data panjar karyawan. Silakan coba muat ulang halaman.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Detail Error: {advancesError?.message}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <RepayAdvanceDialog open={isRepayDialogOpen} onOpenChange={setIsRepayDialogOpen} advance={selectedAdvance} />
      
      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="active">Panjar Aktif</TabsTrigger>
          <TabsTrigger value="completed">Riwayat Lunas</TabsTrigger>
        </TabsList>
        
        <TabsContent value="active" className="space-y-6">

      {isAdminOrOwnerOrCashier && (
        <Card>
          <CardHeader>
            <CardTitle>Beri Panjar Karyawan</CardTitle>
            <CardDescription>Fitur ini untuk Owner/Admin/Kasir. Catat uang muka yang diberikan kepada karyawan.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onAddAdvanceSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="employeeId">Karyawan</Label>
                  <Select onValueChange={(value) => setValue("employeeId", value)}>
                    <SelectTrigger><SelectValue placeholder="Pilih Karyawan..." /></SelectTrigger>
                    <SelectContent>{loadingUsers ? <SelectItem value="loading" disabled>Memuat...</SelectItem> : employees?.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
                  </Select>
                  {errors.employeeId && <p className="text-sm text-destructive">{errors.employeeId.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Jumlah Panjar (Rp)</Label>
                  <Input id="amount" type="number" {...register("amount")} />
                  {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accountId">Sumber Dana</Label>
                  <Select onValueChange={(value) => setValue("accountId", value)}>
                    <SelectTrigger><SelectValue placeholder="Pilih Akun..." /></SelectTrigger>
                    <SelectContent>{loadingAccounts ? <SelectItem value="loading" disabled>Memuat...</SelectItem> : accounts?.filter(a => a.isPaymentAccount).map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                  </Select>
                  {errors.accountId && <p className="text-sm text-destructive">{errors.accountId.message}</p>}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Catatan</Label>
                <Textarea id="notes" {...register("notes")} />
              </div>
              <Button type="submit" disabled={addAdvance.isPending}>
                {addAdvance.isPending ? "Menyimpan..." : "Simpan Panjar"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Riwayat Panjar Karyawan</CardTitle>
          <CardDescription>Klik nama karyawan untuk melihat detail panjar</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingAdvances ? (
            <div className="text-center py-4">Memuat...</div>
          ) : Object.keys(groupedAdvances).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Belum ada data panjar karyawan
            </div>
          ) : (
            <Accordion type="multiple" className="w-full">
              {Object.entries(groupedAdvances).map(([employeeName, employeeAdvances]) => {
                const totalDebt = getEmployeeTotalDebt(employeeAdvances);
                const hasUnpaidAdvances = employeeAdvances.some(adv => adv.remainingAmount > 0);
                
                return (
                  <AccordionItem key={employeeName} value={employeeName}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center justify-between w-full mr-4">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold">{employeeName}</span>
                          <Badge variant={hasUnpaidAdvances ? "destructive" : "success"}>
                            {employeeAdvances.length} panjar
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Total Sisa:</span>
                          <span className={`font-bold ${totalDebt > 0 ? 'text-destructive' : 'text-green-600'}`}>
                            {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(totalDebt)}
                          </span>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 pt-2">
                        {employeeAdvances.map(adv => (
                          <div key={adv.id} className="border rounded-lg p-4 bg-muted/30">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
                              <div>
                                <p className="text-sm text-muted-foreground">Tanggal Panjar</p>
                                <p className="font-medium">{format(new Date(adv.date), "d MMM yyyy", { locale: id })}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Total Panjar</p>
                                <p className="font-medium">{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(adv.amount)}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Sisa Utang</p>
                                <div className="flex items-center gap-2">
                                  <p className={`font-bold ${adv.remainingAmount > 0 ? 'text-destructive' : 'text-green-600'}`}>
                                    {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(adv.remainingAmount)}
                                  </p>
                                  <Badge variant={adv.remainingAmount <= 0 ? "success" : "destructive"}>
                                    {adv.remainingAmount <= 0 ? 'Lunas' : 'Belum Lunas'}
                                  </Badge>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => handleOpenRepayDialog(adv)} 
                                  disabled={adv.remainingAmount <= 0}
                                >
                                  Bayar Cicilan
                                </Button>
                                {isOwner && (
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="icon">
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Anda yakin?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Tindakan ini akan menghapus data panjar untuk {adv.employeeName} dan mengembalikan saldo ke akun asal. Tindakan ini tidak dapat dibatalkan.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Batal</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => handleDeleteAdvance(adv)}
                                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        >
                                          Ya, Hapus
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                )}
                              </div>
                            </div>
                            {adv.notes && (
                              <div className="mt-3 pt-3 border-t">
                                <p className="text-sm text-muted-foreground">Catatan:</p>
                                <p className="text-sm">{adv.notes}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </CardContent>
      </Card>
        </TabsContent>
        
        <TabsContent value="completed">
          <PaidAdvancesTable />
        </TabsContent>
      </Tabs>
    </div>
  )
}