import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://kaddsojhnkyfavaulrfc.supabase.co';
const SQL_PATH = path.join(process.cwd(), 'supabase/migrations/20260216_apply_admin_fixes.sql');

async function main() {
  if (!fs.existsSync(SQL_PATH)) {
    console.error('Migration file not found:', SQL_PATH);
    process.exit(1);
  }

  const sql = fs.readFileSync(SQL_PATH, 'utf8');

  // If service role key is present, try to run via RPC (if exec_sql exists) otherwise print SQL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    console.log('\n⚠️  SUPABASE_SERVICE_ROLE_KEY not set — manual step required');
    console.log('1) Open Supabase Dashboard → SQL Editor');
    console.log(`2) Paste the contents of ${SQL_PATH} and Execute`);
    console.log('\n--- MIGRATION SQL START ---\n');
    console.log(sql);
    console.log('\n--- MIGRATION SQL END ---\n');
    process.exit(0);
  }

  console.log('🔐 Service role key detected — attempting automatic execution (best-effort)');
  const supabase = createClient(SUPABASE_URL, serviceKey);

  try {
    // Try calling a helper RPC if available
    const { data: rpcData, error: rpcErr } = await supabase.rpc('exec_sql', { sql });
    if (rpcErr) {
      console.warn('RPC exec_sql failed (it may not exist) — falling back to showing SQL');
      console.warn(rpcErr.message || rpcErr);
      console.log('\n--- MIGRATION SQL START ---\n');
      console.log(sql);
      console.log('\n--- MIGRATION SQL END ---\n');
      process.exit(0);
    }

    console.log('✅ Migration executed via RPC exec_sql');
    console.log(rpcData);
  } catch (err) {
    console.error('Execution failed:', err.message || err);
    console.log('\n--- MIGRATION SQL START ---\n');
    console.log(sql);
    console.log('\n--- MIGRATION SQL END ---\n');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
