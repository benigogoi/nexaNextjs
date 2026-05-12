
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: cats } = await supabase.from('categories').select('*');
  console.log('Categories:', JSON.stringify(cats, null, 2));
  
  const { data: prods } = await supabase.from('products').select('name, category, is_bundle').limit(10);
  console.log('Sample Products:', JSON.stringify(prods, null, 2));
}

check();
