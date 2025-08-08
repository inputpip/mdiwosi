# Setup Cash History Database Table

To complete the cash history implementation, you need to create the `cash_history` table in your Supabase database.

## Database Setup

1. Open your Supabase dashboard
2. Go to the SQL Editor
3. Run the SQL script from `migrations/create_cash_history_table.sql`

```sql
-- Create cash_history table for tracking all cash transactions
CREATE TABLE cash_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id text REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
  account_name text NOT NULL,
  type text NOT NULL CHECK (type IN (
    'orderan',
    'kas_masuk_manual',
    'kas_keluar_manual',
    'panjar_pengambilan',
    'panjar_pelunasan',
    'pengeluaran',
    'pembayaran_po',
    'pemutihan_piutang',
    'transfer_masuk',
    'transfer_keluar'
  )),
  amount numeric NOT NULL,
  description text NOT NULL,
  reference_id text,
  reference_name text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX idx_cash_history_account_id ON cash_history(account_id);
CREATE INDEX idx_cash_history_type ON cash_history(type);
CREATE INDEX idx_cash_history_created_at ON cash_history(created_at);
CREATE INDEX idx_cash_history_user_id ON cash_history(user_id);

-- Enable RLS (Row Level Security)
ALTER TABLE cash_history ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Enable read access for authenticated users" ON cash_history
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON cash_history
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Trigger for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_cash_history_updated_at BEFORE UPDATE ON cash_history
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## Features Implemented

### ✅ Cash History Table
- Comprehensive tracking of all cash transactions
- Account selection dropdown for filtering
- Advanced filtering by transaction type and date
- Color-coded transaction badges
- Real-time statistics

### ✅ Manual Cash Transactions
- **Cash In Dialog**: Record manual cash inflows
- **Cash Out Dialog**: Record manual cash outflows
- **Account Transfer Dialog**: Transfer between accounts with dual history recording

### ✅ Transaction Types Supported
- `orderan` - Cash from orders/transactions
- `kas_masuk_manual` - Manual cash in
- `kas_keluar_manual` - Manual cash out
- `panjar_pengambilan` - Employee advance withdrawal
- `panjar_pelunasan` - Employee advance repayment
- `pengeluaran` - Operational expenses
- `pembayaran_po` - PO payments
- `pemutihan_piutang` - Debt write-offs
- `transfer_masuk` - Incoming transfers
- `transfer_keluar` - Outgoing transfers

## How to Use

1. Navigate to `/accounts` page
2. Use the "Kas Masuk", "Kas Keluar", and "Transfer" buttons to record transactions
3. Select an account in the "Pilih Akun untuk Melihat History" dropdown to view transaction history
4. Use additional filters for more specific searches
5. All transactions are automatically recorded with user information and timestamps

## Next Steps (Optional)

The system is ready for use! Future enhancements can include:
- Automatic cash history recording from POS transactions
- Integration with expense management
- Integration with employee advance system
- PDF report generation using the cash history data