
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/Users/William/Desktop/ComissOne_OFICIAL_Fidelite/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
    console.log('--- SALES ---');
    const { data: sales, error: salesError } = await supabase.from('sales').select('*').limit(10);
    if (salesError) console.error(salesError);
    else console.table(sales.map(s => ({ id: s.id, vgv: s.vgv, address: s.property_address })));

    console.log('--- BROKER SPLITS ---');
    const { data: splits, error: splitsError } = await supabase.from('broker_splits').select('*').limit(20);
    if (splitsError) console.error(splitsError);
    else console.table(splits.map(sp => ({ id: sp.id, sale_id: sp.sale_id, value: sp.calculated_value, status: sp.status })));
}

checkData();
