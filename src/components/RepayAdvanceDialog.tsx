"use client"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "./ui/use-toast"
import { EmployeeAdvance } from "@/types/employeeAdvance"
import { useEmployeeAdvances } from "@/hooks/useEmployeeAdvances"
import { useAuth } from "@/hooks/useAuth"
import { useAccounts } from "@/hooks/useAccounts"

const repaymentSchema = z.object({
  amount: z.coerce.number().min(1, "Jumlah pembayaran harus lebih dari 0."),
  targetAccountId: z.string().min(1, "Akun tujuan pembayaran harus dipilih."),
})

type RepaymentFormData = z.infer<typeof repaymentSchema>

interface RepayAdvanceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  advance: EmployeeAdvance | null
}

export function RepayAdvanceDialog({ open, onOpenChange, advance }: RepayAdvanceDialogProps) {
  const { toast } = useToast()
  const { user } = useAuth()
  const { addRepayment } = useEmployeeAdvances()
  const { accounts, isLoading: loadingAccounts } = useAccounts()
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<RepaymentFormData>({
    resolver: zodResolver(repaymentSchema),
  })

  const onSubmit = (data: RepaymentFormData) => {
    if (!advance || !user) return;
    if (data.amount > advance.remainingAmount) {
      toast({ variant: "destructive", title: "Gagal", description: "Jumlah pembayaran melebihi sisa utang." });
      return;
    }

    // Cari nama akun tujuan
    const targetAccount = accounts?.find(acc => acc.id === data.targetAccountId);
    if (!targetAccount) {
      toast({ variant: "destructive", title: "Gagal", description: "Akun tujuan tidak ditemukan." });
      return;
    }

    addRepayment.mutate({
      advanceId: advance.id,
      repaymentData: {
        amount: data.amount,
        date: new Date(),
        recordedBy: user.name,
        targetAccountId: data.targetAccountId,
        targetAccountName: targetAccount.name,
      }
    }, {
      onSuccess: () => {
        toast({ 
          title: "Sukses", 
          description: `Pembayaran cicilan berhasil dicatat. Dana masuk ke ${targetAccount.name}.` 
        })
        reset()
        onOpenChange(false)
      },
      onError: (error) => {
        toast({ variant: "destructive", title: "Gagal", description: error.message })
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bayar Cicilan Panjar: {advance?.employeeName}</DialogTitle>
          <DialogDescription>
            Sisa utang saat ini: <strong className="text-destructive">{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(advance?.remainingAmount || 0)}</strong>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="py-4 space-y-4">
            <div>
              <Label htmlFor="amount">Jumlah Pembayaran</Label>
              <Input id="amount" type="number" {...register("amount")} />
              {errors.amount && <p className="text-sm text-destructive mt-1">{errors.amount.message}</p>}
            </div>
            
            <div>
              <Label htmlFor="targetAccount">Akun Tujuan Pembayaran</Label>
              <Select onValueChange={(value) => setValue("targetAccountId", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih akun penerima pembayaran..." />
                </SelectTrigger>
                <SelectContent>
                  {loadingAccounts ? (
                    <SelectItem value="loading" disabled>
                      Memuat akun...
                    </SelectItem>
                  ) : (
                    accounts?.filter(acc => acc.isPaymentAccount).map(account => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name} - {new Intl.NumberFormat("id-ID", {
                          style: "currency",
                          currency: "IDR",
                          minimumFractionDigits: 0,
                        }).format(account.balance)}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {errors.targetAccountId && (
                <p className="text-sm text-destructive mt-1">{errors.targetAccountId.message}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Pilih akun dimana pembayaran panjar ini akan masuk (kas/bank)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={addRepayment.isPending}>
              {addRepayment.isPending ? "Menyimpan..." : "Simpan Pembayaran"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}