import { supabase } from './src/lib/supabaseClient';

async function checkOrdersSchema() {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error fetching orders:', error);
  } else {
    console.log('Order columns:', data.length > 0 ? Object.keys(data[0]) : 'No orders found');
  }
}

checkOrdersSchema();
