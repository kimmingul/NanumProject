import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('? Missing Supabase credentials in .env file');
  process.exit(1);
}

console.log('?? Supabase URL:', SUPABASE_URL);

// Create Supabase client with service role for migrations
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
  },
});

const migrations = [
  '001_initial_schema.sql',
  '002_rls_policies.sql',
  '003_triggers.sql',
  '004_functions.sql',
  '005_seed_data.sql',
];

async function executeMigration(filename: string): Promise<boolean> {
  try {
    const migrationPath = join(__dirname, '..', 'supabase', 'migrations', filename);
    const sql = readFileSync(migrationPath, 'utf-8');

    console.log(`\n?? Executing: ${filename}`);
    console.log('¦¡'.repeat(50));

    // Note: Supabase client doesn't support direct SQL execution
    // We need to use the Supabase Management API or SQL Editor
    console.log('??  SQL must be executed via Supabase Dashboard SQL Editor:');
    console.log(`   ${SUPABASE_URL.replace('https://', 'https://supabase.com/dashboard/project/')}/sql`);
    console.log('\n?? SQL Preview (first 200 chars):');
    console.log(sql.substring(0, 200) + '...\n');

    return true;
  } catch (error) {
    console.error(`? Error reading ${filename}:`, error);
    return false;
  }
}

async function runMigrations() {
  console.log('?? NanumAuth Database Migration Tool');
  console.log('?'.repeat(50));

  // Test connection
  try {
    const { data, error } = await supabase.from('_test').select('*').limit(1);
    if (error && error.code !== 'PGRST204' && !error.message.includes('does not exist')) {
      console.log('? Connected to Supabase successfully\n');
    }
  } catch (err) {
    console.log('??  Connection test skipped (table may not exist yet)\n');
  }

  console.log('?? Migration files to apply:');
  migrations.forEach((file, index) => {
    console.log(`   ${index + 1}. ${file}`);
  });

  console.log('\n??  IMPORTANT: Supabase JavaScript client cannot execute raw SQL.');
  console.log('   Please follow these steps:\n');
  console.log('   1. Go to Supabase Dashboard:');
  console.log(`      ${SUPABASE_URL.replace('https://', 'https://supabase.com/dashboard/project/').replace('.supabase.co', '')}/sql`);
  console.log('\n   2. Copy and paste each migration file from:');
  console.log('      NanumAuth/supabase/migrations/\n');
  console.log('   3. Execute them in order (001 -> 005)\n');
  console.log('   4. Verify with: SELECT * FROM seed_data_status;\n');

  console.log('?'.repeat(50));
  console.log('\n?? Alternative: Use Supabase CLI');
  console.log('   npm install -g supabase');
  console.log('   supabase login');
  console.log('   supabase link --project-ref xtrusktfudailwpqjdga');
  console.log('   supabase db push\n');

  // Show migration contents for reference
  for (const migration of migrations) {
    await executeMigration(migration);
  }
}

runMigrations().catch(console.error);
