-- Create account_transfers table
CREATE TABLE IF NOT EXISTS public.account_transfers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    from_account_id TEXT NOT NULL,
    to_account_id TEXT NOT NULL,
    amount NUMERIC NOT NULL CHECK (amount > 0),
    description TEXT,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_account_transfers_from_account ON public.account_transfers(from_account_id);
CREATE INDEX IF NOT EXISTS idx_account_transfers_to_account ON public.account_transfers(to_account_id);
CREATE INDEX IF NOT EXISTS idx_account_transfers_created_at ON public.account_transfers(created_at);
CREATE INDEX IF NOT EXISTS idx_account_transfers_user_id ON public.account_transfers(user_id);

-- Add foreign key constraints (optional, depends on your accounts table structure)
-- ALTER TABLE public.account_transfers 
-- ADD CONSTRAINT fk_from_account 
-- FOREIGN KEY (from_account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;

-- ALTER TABLE public.account_transfers 
-- ADD CONSTRAINT fk_to_account 
-- FOREIGN KEY (to_account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;

-- Enable RLS (Row Level Security)
ALTER TABLE public.account_transfers ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to manage their own transfers
CREATE POLICY "Users can view all account transfers" ON public.account_transfers
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create account transfers" ON public.account_transfers
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Grant necessary permissions
GRANT ALL ON public.account_transfers TO authenticated;
GRANT USAGE ON SEQUENCE public.account_transfers_id_seq TO authenticated;

COMMENT ON TABLE public.account_transfers IS 'Table for tracking account transfers between different accounts';