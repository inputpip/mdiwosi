-- Fix authentication and permission issues
-- Run this script in your Supabase SQL Editor

-- 1. First, let's ensure RLS is disabled for all main tables (as intended)
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_advances DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.advance_repayments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_settings DISABLE ROW LEVEL SECURITY;

-- 2. Drop all existing policies that might be causing conflicts
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can manage customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can manage accounts" ON public.accounts;
DROP POLICY IF EXISTS "Authenticated users can manage materials" ON public.materials;
DROP POLICY IF EXISTS "Authenticated users can manage products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can manage transactions" ON public.transactions;
DROP POLICY IF EXISTS "Authenticated users can manage quotations" ON public.quotations;
DROP POLICY IF EXISTS "Authenticated users can manage employee advances" ON public.employee_advances;
DROP POLICY IF EXISTS "Authenticated users can manage advance repayments" ON public.advance_repayments;
DROP POLICY IF EXISTS "Authenticated users can manage expenses" ON public.expenses;
DROP POLICY IF EXISTS "Authenticated users can manage purchase orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Authenticated users can manage company settings" ON public.company_settings;

-- 3. Ensure employees_view exists and is properly configured
DROP VIEW IF EXISTS public.employees_view;
CREATE OR REPLACE VIEW public.employees_view AS
SELECT
    u.id,
    p.full_name,
    u.email,
    p.role,
    p.phone,
    p.address,
    p.status,
    '' as username -- Add missing username field
FROM
    auth.users u
JOIN
    public.profiles p ON u.id = p.id;

-- 4. Grant necessary permissions to authenticated users
GRANT SELECT ON public.employees_view TO authenticated;
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.customers TO authenticated;
GRANT ALL ON public.accounts TO authenticated;
GRANT ALL ON public.materials TO authenticated;
GRANT ALL ON public.products TO authenticated;
GRANT ALL ON public.transactions TO authenticated;
GRANT ALL ON public.quotations TO authenticated;
GRANT ALL ON public.employee_advances TO authenticated;
GRANT ALL ON public.advance_repayments TO authenticated;
GRANT ALL ON public.expenses TO authenticated;
GRANT ALL ON public.purchase_orders TO authenticated;
GRANT ALL ON public.company_settings TO authenticated;

-- 5. Grant permissions for sequences (for auto-generated IDs)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 6. Ensure the current_stock column exists in products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'Stock' CHECK (type IN ('Stock', 'Beli')),
ADD COLUMN IF NOT EXISTS current_stock NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS min_stock NUMERIC DEFAULT 0;

-- Update existing products to have default values
UPDATE public.products 
SET 
    type = COALESCE(type, 'Stock'),
    current_stock = COALESCE(current_stock, 0),
    min_stock = COALESCE(min_stock, 0)
WHERE type IS NULL OR current_stock IS NULL OR min_stock IS NULL;

-- 7. Verify the setup by checking table permissions
SELECT 
    schemaname,
    tablename,
    rowsecurity as "RLS Enabled"
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- 8. Check if user has the required role data
SELECT 
    id,
    full_name,
    email,
    role,
    status
FROM public.profiles
LIMIT 5;