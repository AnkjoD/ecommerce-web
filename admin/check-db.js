import { createClient } from '@supabase/supabase-js';
import pkg from 'dotenv';
const { config } = pkg;
config({ path: '../server/.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.from('orders').select('status, payment_status');
  if (error) {
    console.error(error);
    return;
  }
  const statuses = [...new Set(data.map(o => o.status))];
  const paymentStatuses = [...new Set(data.map(o => o.payment_status))];
  console.log('UNIQUE STATUSES IN DB:', statuses);
  console.log('UNIQUE PAYMENT STATUSES IN DB:', paymentStatuses);
  
  // Also check for specific cases
  const caseCheck = data.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {});
  console.log('STATUS DISTRIBUTION:', caseCheck);
}

check();
