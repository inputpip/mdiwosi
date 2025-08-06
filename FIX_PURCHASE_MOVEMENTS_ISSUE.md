# Fix: Remove Unwanted Purchase Movements

## Problem
User is seeing purchase movements (like "Kertas A4 - Masuk - Pembelian - +100") that they didn't input manually. These are appearing in the material movement reports.

## Root Cause Analysis
✅ **Application Code is CORRECT**: The application only creates PURCHASE movements through legitimate Purchase Order workflows.

❌ **Issue**: Sample/test data from SQL migration scripts is creating fake purchase movements.

## Where PURCHASE Movements Should Come From
The application correctly creates PURCHASE movements ONLY from:
- **Purchase Orders (PO)** - File: `src/hooks/usePurchaseOrders.ts`
- When PO status changes to "received" 
- Only for materials with `type = 'Stock'`

## Sources of Unwanted Data
The following SQL files contain sample data insertions that create fake purchases:
- `URGENT_CREATE_TABLES.sql`
- `create_required_tables_simple.sql` 
- `create_sample_material_movements.sql`
- `fix_database_issues.sql`
- And others...

## Solution Steps

### Step 1: Remove Existing Sample Data
Run this script to clean up fake purchase data:
```bash
# Run the cleanup script
psql -d your_database -f remove_sample_purchase_data.sql
```

### Step 2: Add Database Constraints
Prevent future fake purchases by enforcing proper references:
```bash
# Add constraints to ensure PURCHASE movements must come from POs
psql -d your_database -f enforce_purchase_order_constraint.sql
```

### Step 3: Verify Application Behavior
The application code is already correct:
- ✅ PURCHASE movements only created from PO workflow
- ✅ Proper `reference_type = 'purchase_order'`
- ✅ Proper `reference_id` pointing to actual PO

### Step 4: Prevent Future Issues
- Don't run migration scripts that insert sample data in production
- Use the proper Purchase Order workflow to record actual purchases
- The system will automatically create proper PURCHASE movements when:
  1. Create a Purchase Order request
  2. Change PO status to "received"

## Files Created
1. `remove_sample_purchase_data.sql` - Cleans existing fake data
2. `enforce_purchase_order_constraint.sql` - Prevents future fake data
3. This documentation file

## Expected Result
After running these scripts:
- ❌ No more "Sample purchase" entries
- ❌ No more orphaned purchase movements
- ✅ Only legitimate PO-based purchase movements
- ✅ All PURCHASE movements have proper `reference_type = 'purchase_order'`

## How to Create Legitimate Purchases
1. Go to Purchase Orders section
2. Create new PO request
3. Fill in material and quantity details
4. Change status to "received" when material arrives
5. System automatically creates proper material movement with PURCHASE reason