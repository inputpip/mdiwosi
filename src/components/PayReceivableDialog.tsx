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
import { Transaction } from "@/types/transaction"
import { useTransactions } from "@/hooks/useTransactions"
import { useAccounts } from "@/hooks/useAccounts"
import { useCashHistory } from "@/hooks/useCashHistory"
import { useAuth } from "@/hooks/useAuth"
import { Wallet } from "lucide-react"

const paymentSchema = z.object({
  amount: z.coerce.number().min(1, "Jumlah pembayaran harus lebih dari 0."),
  paymentAccountId: z.string().min(1, "Akun pembayaran harus dipilih."),
})

type PaymentFormData = z.infer<typeof paymentSchema>

interface PayReceivableDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transaction: Transaction | null
}

export function PayReceivableDialog({ open, onOpenChange, transaction }: PayReceivableDialogProps) {
  const { toast } = useToast()
  const { user } = useAuth()
  const { payReceivable } = useTransactions()
  const { accounts, updateAccountBalance } = useAccounts()
  const { addCashHistory } = useCashHistory()
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
  })

  const remainingAmount = transaction ? transaction.total - transaction.paidAmount : 0

  const onSubmit = async (data: PaymentFormData) => {
    if (!transaction || !user) return;
    if (data.amount > remainingAmount) {
      toast({ variant: "destructive", title: "Gagal", description: "Jumlah pembayaran melebihi sisa tagihan." });
      return;
    }

    try {
      // 1. Bayar piutang (update transaction)
      await payReceivable.mutateAsync({ transactionId: transaction.id, amount: data.amount });

      // 2. Update saldo akun
      await updateAccountBalance.mutateAsync({ accountId: data.paymentAccountId, amount: data.amount });

      // 3. Catat ke cash history (FITUR BARU!)
      const selectedAccount = accounts?.find(acc => acc.id === data.paymentAccountId);
      await addCashHistory.mutateAsync({
        accountId: data.paymentAccountId,
        accountName: selectedAccount?.name || 'Unknown Account',
        type: 'panjar_pelunasan',
        amount: data.amount,
        description: `Pembayaran piutang dari ${transaction.customerName} - Order: ${transaction.id}`,
        referenceId: transaction.id,
        referenceName: `PIUTANG-${transaction.id.slice(0, 8)}`,
        userId: user.id,
        userName: user.name || user.email || 'Unknown User'
      });

      toast({ 
        title: "Sukses", 
        description: `Pembayaran piutang sebesar ${new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(data.amount)} berhasil dicatat ke ${selectedAccount?.name}.` 
      });
      
      reset();
      onOpenChange(false);
    } catch (error) {
      toast({ 
        variant: "destructive", 
        title: "Gagal", 
        description: error instanceof Error ? error.message : "Terjadi kesalahan saat memproses pembayaran"
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bayar Piutang: {transaction?.customerName}</DialogTitle>
          <DialogDescription>
            No. Order: {transaction?.id}. Sisa tagihan: <strong className="text-destructive">{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(remainingAmount)}</strong>
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
              <Label htmlFor="paymentAccountId">Setor Ke Akun</Label>
              <Select onValueChange={(value) => setValue("paymentAccountId", value)}>
                <SelectTrigger><SelectValue placeholder="Pilih Akun..." /></SelectTrigger>
                <SelectContent>
                  {accounts?.filter(a => a.isPaymentAccount).map(acc => (
                    <SelectItem key={acc.id} value={acc.id}><Wallet className="inline-block mr-2 h-4 w-4" />{acc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.paymentAccountId && <p className="text-sm text-destructive mt-1">{errors.paymentAccountId.message}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={payReceivable.isPending}>
              {payReceivable.isPending ? "Menyimpan..." : "Simpan Pembayaran"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}