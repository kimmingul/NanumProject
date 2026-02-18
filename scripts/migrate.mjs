/**
 * Supabase Migration Applier
 * This script applies database migrations via Supabase Management API
 */

import { config } from 'dotenv';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

// Load environment variables
config({ path: join(process.cwd(), '.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('? Missing Supabase credentials in .env file');
  process.exit(1);
}

// Extract project reference from URL
const projectRef = SUPABASE_URL.replace('https://', '').split('.')[0];

console.log('?? NanumAuth Database Migration Tool');
console.log('?'.repeat(60));
console.log(`?? Project Reference: ${projectRef}`);
console.log(`?? Supabase URL: ${SUPABASE_URL}\n`);

const migrations = [
  '001_initial_schema.sql',
  '002_rls_policies.sql',
  '003_triggers.sql',
  '004_functions.sql',
  '005_seed_data.sql',
];

const migrationsPath = join(process.cwd(), 'supabase', 'migrations');

console.log('?? Migration Plan:');
console.log('式'.repeat(60));
migrations.forEach((file, index) => {
  const filePath = join(migrationsPath, file);
  const exists = (() => {
    try {
      readFileSync(filePath, 'utf-8');
      return true;
    } catch {
      return false;
    }
  })();
  console.log(`   ${index + 1}. ${file} ${exists ? '?' : '? NOT FOUND'}`);
});

console.log('\n??  MANUAL MIGRATION REQUIRED');
console.log('式'.repeat(60));
console.log('Supabase requires SQL to be executed via Dashboard or CLI.\n');

console.log('?? Option 1: Supabase Dashboard (Recommended)');
console.log('式'.repeat(60));
console.log(`1. Open: https://supabase.com/dashboard/project/${projectRef}/sql`);
console.log('2. For each migration file (in order):');
console.log('   - Open the file from: NanumAuth/supabase/migrations/');
console.log('   - Copy the entire SQL content');
console.log('   - Paste into SQL Editor');
console.log('   - Click "Run" or press Ctrl+Enter');
console.log('3. Verify: Run "SELECT * FROM seed_data_status;"\n');

console.log('?? Option 2: Supabase CLI (Automated)');
console.log('式'.repeat(60));
console.log('Run these commands in order:\n');
console.log('   npm install -g supabase');
console.log('   supabase login');
console.log(`   supabase link --project-ref ${projectRef}`);
console.log('   supabase db push');
console.log('   supabase gen types typescript --local > src/types/supabase.ts\n');

console.log('?? Migration Files Location:');
console.log('式'.repeat(60));
migrations.forEach((file) => {
  console.log(`   ${join('supabase', 'migrations', file)}`);
});

console.log('\n? After applying migrations, run:');
console.log('   npm run dev\n');
console.log('?'.repeat(60));

// Provide quick copy-paste SQL
console.log('\n?? Quick Copy-Paste (for Dashboard SQL Editor):');
console.log('式'.repeat(60));
console.log('Copy each block below in order:\n');

migrations.forEach((file, index) => {
  const filePath = join(migrationsPath, file);
  try {
    const sql = readFileSync(filePath, 'utf-8');
    console.log(`\n${'式'.repeat(60)}`);
    console.log(`Migration ${index + 1}: ${file}`);
    console.log(`${'式'.repeat(60)}\n`);
    console.log(sql);
    console.log('\n');
  } catch (error) {
    console.error(`? Could not read ${file}`);
  }
});
