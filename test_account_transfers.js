// Quick test to check if account_transfers table exists
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function testAccountTransfers() {
  console.log('Testing account_transfers table...');
  
  try {
    // Try to select from the table
    const { data, error } = await supabase
      .from('account_transfers')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('Error accessing account_transfers:', error.message);
      
      if (error.message.includes('does not exist')) {
        console.log('\n❌ Table account_transfers does not exist');
        console.log('Need to create the table in Supabase');
        return false;
      }
    } else {
      console.log('✅ Table account_transfers exists!');
      console.log('Data sample:', data);
      return true;
    }
  } catch (err) {
    console.error('Connection error:', err);
    return false;
  }
}

testAccountTransfers().then(exists => {
  if (!exists) {
    console.log('\nTo fix this issue:');
    console.log('1. Go to Supabase Dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Run the migration file: supabase/migrations/0008_membuat_tabel_account_transfers.sql');
  }
  process.exit(0);
});