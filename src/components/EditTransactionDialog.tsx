"use client"
import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { PlusCircle, Trash2, Check, ChevronsUpDown, Save, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'
import { Textarea } from './ui/textarea'
import { useProducts } from '@/hooks/useProducts'
import { useUsers } from '@/hooks/useUsers'
import { useAccounts } from '@/hooks/useAccounts'
import { useTransactions } from '@/hooks/useTransactions'
import { useCustomers } from '@/hooks/useCustomers'
import { Product } from '@/types/product'
import { Customer } from '@/types/customer'
import { Transaction, TransactionItem } from '@/types/transaction'
import { DateTimePicker } from './ui/datetime-picker'

interface FormTransactionItem {
  id: number;
  product: Product | null;
  keterangan: string;
  qty: number;
  harga: number;
  unit: string;
  designFileName?: string;
}

interface EditTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction | null;
}

export const EditTransactionDialog = ({ open, onOpenChange, transaction }: EditTransactionDialogProps) => {
  const { toast } = useToast()
  const { products } = useProducts()
  const { users } = useUsers();
  const { accounts } = useAccounts();
  const { updateTransaction } = useTransactions();
  const { customers } = useCustomers();
  
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [orderDate, setOrderDate] = useState<Date | undefined>(new Date())
  const [finishDate, setFinishDate] = useState<Date | undefined>()
  const [designerId, setDesignerId] = useState<string>('')
  const [operatorId, setOperatorId] = useState<string>('')
  const [paymentAccountId, setPaymentAccountId] = useState<string>('')
  const [items, setItems] = useState<FormTransactionItem[]>([])
  const [diskon, setDiskon] = useState(0)
  const [paidAmount, setPaidAmount] = useState(0)
  const [openProductDropdowns, setOpenProductDropdowns] = useState<{[key: number]: boolean}>({});

  const subTotal = useMemo(() => items.reduce((total, item) => total + (item.qty * item.harga), 0), [items]);
  const totalTagihan = useMemo(() => subTotal - diskon, [subTotal, diskon]);
  const sisaTagihan = useMemo(() => totalTagihan - paidAmount, [totalTagihan, paidAmount]);

  const designers = useMemo(() => users?.filter(u => u.role === 'designer'), [users]);
  const operators = useMemo(() => users?.filter(u => u.role === 'operator'), [users]);

  // Initialize form data when dialog opens with transaction data
  useEffect(() => {
    if (transaction && open) {
      const customer = customers?.find(c => c.id === transaction.customerId);
      if (customer) setSelectedCustomer(customer);

      setOrderDate(transaction.orderDate ? new Date(transaction.orderDate) : new Date());
      setFinishDate(transaction.finishDate ? new Date(transaction.finishDate) : undefined);
      setDesignerId(transaction.designerId || 'none');
      setOperatorId(transaction.operatorId || 'none');
      setPaymentAccountId(transaction.paymentAccountId || 'none');
      setPaidAmount(transaction.paidAmount || 0);

      const transactionItems: FormTransactionItem[] = transaction.items.map((item, index) => ({
        id: index,
        product: item.product,
        keterangan: item.notes || '',
        qty: item.quantity,
        harga: item.price,
        unit: item.unit,
        designFileName: item.designFileName,
      }));
      setItems(transactionItems);
    }
  }, [transaction, open, customers]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedCustomer(null);
      setItems([]);
      setDiskon(0);
      setPaidAmount(0);
      setPaymentAccountId('none');
      setDesignerId('none');
      setOperatorId('none');
      setOrderDate(new Date());
      setFinishDate(undefined);
    }
  }, [open]);

  const handleAddItem = () => {
    const newItem: FormTransactionItem = {
      id: Date.now(), product: null, keterangan: '', qty: 1, harga: 0, unit: 'pcs'
    };
    setItems([...items, newItem]);
  };

  const handleItemChange = (index: number, field: keyof FormTransactionItem, value: string | number | Product | null) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };

    if (field === 'product' && value) {
      const selectedProduct = value as Product;
      newItems[index].harga = selectedProduct.basePrice || 0;
      newItems[index].unit = selectedProduct.unit || 'pcs';
    }
    
    setItems(newItems);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!transaction) return;
    
    const validItems = items.filter(item => item.product && item.qty > 0);

    if (!selectedCustomer || validItems.length === 0) {
      toast({ variant: "destructive", title: "Validasi Gagal", description: "Harap pilih Pelanggan dan tambahkan minimal satu item produk yang valid." });
      return;
    }

    if (paidAmount > 0 && (!paymentAccountId || paymentAccountId === 'none')) {
      toast({ variant: "destructive", title: "Validasi Gagal", description: "Harap pilih Metode Pembayaran jika ada jumlah yang dibayar." });
      return;
    }

    // Validasi tanggal tidak boleh masa depan
    if (orderDate && orderDate > new Date()) {
      toast({ 
        variant: "destructive", 
        title: "Validasi Gagal", 
        description: "Tanggal order tidak boleh lebih dari hari ini." 
      });
      return;
    }

    const transactionItems: TransactionItem[] = validItems.map(item => ({
      product: item.product!,
      quantity: item.qty,
      price: item.harga,
      unit: item.unit,
      width: 0, height: 0, notes: item.keterangan,
      designFileName: item.designFileName,
    }));

    const updatedTransaction: Transaction = {
      ...transaction,
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      designerId: (designerId && designerId !== 'none') ? designerId : null,
      operatorId: (operatorId && operatorId !== 'none') ? operatorId : null,
      paymentAccountId: (paymentAccountId && paymentAccountId !== 'none') ? paymentAccountId : null,
      orderDate: orderDate || new Date(),
      finishDate: finishDate || null,
      items: transactionItems,
      total: totalTagihan,
      paidAmount: paidAmount,
      paymentStatus: sisaTagihan <= 0 ? 'Lunas' : 'Belum Lunas',
    };

    updateTransaction.mutate(updatedTransaction, {
      onSuccess: () => {
        toast({ title: "Sukses", description: "Transaksi berhasil diperbarui." });
        onOpenChange(false);
      },
      onError: (error) => {
        toast({ variant: "destructive", title: "Gagal Memperbarui", description: error.message });
      }
    });
  };

  if (!transaction) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Transaksi {transaction.id}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Customer Selection */}
          <div className="space-y-2">
            <Label>Pelanggan</Label>
            <div className="p-3 bg-muted rounded-lg">
              <p className="font-semibold text-base">
                {selectedCustomer?.name || 'Belum dipilih'}
              </p>
              {selectedCustomer && (
                <>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedCustomer.address}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    📞 {selectedCustomer.phone}
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Date Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tanggal Order</Label>
              <DateTimePicker
                date={orderDate}
                setDate={setOrderDate}
                maxDate={new Date()}
              />
            </div>
            <div className="space-y-2">
              <Label>Tanggal Selesai</Label>
              <DateTimePicker
                date={finishDate}
                setDate={setFinishDate}
              />
            </div>
          </div>

          {/* Designer and Operator */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Designer</Label>
              <Select value={designerId} onValueChange={setDesignerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Designer..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Tidak Ada</SelectItem>
                  {designers?.map(designer => (
                    <SelectItem key={designer.id} value={designer.id}>
                      {designer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Operator</Label>
              <Select value={operatorId} onValueChange={setOperatorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Operator..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Tidak Ada</SelectItem>
                  {operators?.map(operator => (
                    <SelectItem key={operator.id} value={operator.id}>
                      {operator.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Item Produk</Label>
              <Button onClick={handleAddItem} size="sm">
                <PlusCircle className="mr-2 h-4 w-4" /> Tambah Item
              </Button>
            </div>
            
            {items.map((item, index) => (
              <div key={item.id} className="p-4 border rounded-lg space-y-3">
                {/* Product Selection */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm">Produk</Label>
                    <Popover 
                      open={openProductDropdowns[index] || false} 
                      onOpenChange={(open) => setOpenProductDropdowns({...openProductDropdowns, [index]: open})}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between"
                        >
                          {item.product?.name || "Pilih Produk..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput placeholder="Cari produk..." />
                          <CommandList>
                            <CommandEmpty>Produk tidak ditemukan.</CommandEmpty>
                            <CommandGroup>
                              {products?.map((product) => (
                                <CommandItem
                                  key={product.id}
                                  value={`${product.name} ${product.basePrice}`}
                                  onSelect={() => {
                                    handleItemChange(index, 'product', product);
                                    setOpenProductDropdowns({...openProductDropdowns, [index]: false});
                                  }}
                                >
                                  <div className="flex flex-col w-full">
                                    <span className="font-medium">{product.name}</span>
                                    <span className="text-sm text-muted-foreground">
                                      {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(product.basePrice || 0)} / {product.unit}
                                    </span>
                                  </div>
                                  <Check
                                    className={cn(
                                      "ml-auto h-4 w-4",
                                      item.product?.id === product.id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label className="text-sm">Keterangan</Label>
                    <Textarea 
                      value={item.keterangan} 
                      onChange={(e) => handleItemChange(index, 'keterangan', e.target.value)} 
                      placeholder="Detail, ukuran, dll."
                      rows={2}
                    />
                  </div>
                </div>

                {/* Quantity, Unit, Price */}
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <Label className="text-sm">Qty</Label>
                    <Input 
                      type="number" 
                      value={item.qty} 
                      onChange={(e) => handleItemChange(index, 'qty', Number(e.target.value))} 
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Satuan</Label>
                    <Input 
                      value={item.unit} 
                      onChange={(e) => handleItemChange(index, 'unit', e.target.value)} 
                      placeholder="pcs, m², dll"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Harga Satuan</Label>
                    <Input 
                      type="number" 
                      value={item.harga} 
                      onChange={(e) => handleItemChange(index, 'harga', Number(e.target.value))} 
                    />
                  </div>
                  <div className="flex items-end">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleRemoveItem(index)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Total per item */}
                <div className="text-right">
                  <span className="text-sm text-muted-foreground">Total: </span>
                  <span className="font-semibold">
                    {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(item.qty * item.harga)}
                  </span>
                </div>
              </div>
            ))}

            {items.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <PlusCircle className="mx-auto h-12 w-12 mb-2 opacity-50" />
                <p>Belum ada item</p>
              </div>
            )}
          </div>

          {/* Payment Details */}
          <div className="space-y-4 p-4 bg-muted/40 rounded-lg">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="diskon">Diskon</Label>
                <Input 
                  id="diskon" 
                  type="number" 
                  value={diskon} 
                  onChange={e => setDiskon(Number(e.target.value))} 
                  placeholder="Misal: 50000"
                />
              </div>
              <div>
                <Label>Metode Pembayaran</Label>
                <Select value={paymentAccountId} onValueChange={setPaymentAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Pembayaran..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Tidak Ada</SelectItem>
                    {accounts?.filter(a => a.isPaymentAccount).map(acc => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="paidAmount">Jumlah Bayar</Label>
              <Input 
                id="paidAmount" 
                type="number" 
                value={paidAmount} 
                onChange={e => setPaidAmount(Number(e.target.value))} 
                className="font-bold"
              />
            </div>

            {/* Summary */}
            <div className="space-y-2 pt-4 border-t">
              <div className="flex justify-between">
                <span>Sub Total:</span>
                <span className="font-semibold">
                  {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(subTotal)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Diskon:</span>
                <span className="font-semibold">
                  {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(diskon)}
                </span>
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span>
                  {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(totalTagihan)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Bayar:</span>
                <span className="font-semibold">
                  {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(paidAmount)}
                </span>
              </div>
              <div className="flex justify-between text-lg">
                <span>Sisa:</span>
                <span className={cn(
                  "font-bold",
                  sisaTagihan > 0 ? "text-destructive" : "text-green-600"
                )}>
                  {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(sisaTagihan)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="mr-2 h-4 w-4" /> Batal
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={updateTransaction.isPending || !selectedCustomer || items.length === 0}
          >
            <Save className="mr-2 h-4 w-4" />
            {updateTransaction.isPending ? "Menyimpan..." : "Simpan Perubahan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};