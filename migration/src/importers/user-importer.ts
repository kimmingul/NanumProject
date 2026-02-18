import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { IdMapper } from './id-mapper.js';
import type { ImportConfig } from './supabase-admin.js';
import { logStep } from './utils.js';
import { randomBytes } from 'node:crypto';

interface TGUser {
  id: number;
  email_address: string;
  first_name: string;
  last_name: string;
  permissions?: string;
  status?: string;
  is_disabled?: boolean;
  pic?: string | null;
}

export async function importUsers(
  supabase: SupabaseClient,
  mapper: IdMapper,
  config: ImportConfig,
  outputDir: string,
): Promise<void> {
  logStep(1, 'Users (auth.users + profiles)');

  const usersPath = join(outputDir, 'company', 'users.json');
  const users: TGUser[] = JSON.parse(readFileSync(usersPath, 'utf-8'));
  console.log(`Found ${users.length} users to import`);

  let created = 0;
  let skipped = 0;

  for (const user of users) {
    // Skip if already mapped (resume support)
    if (mapper.has('user', user.id)) {
      skipped++;
      continue;
    }

    const email = user.email_address.toLowerCase();
    const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim() || email;
    const password = randomBytes(16).toString('hex'); // Random password

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
      password,
      user_metadata: { full_name: fullName },
    });

    if (authError) {
      // If user already exists, try to find by email
      if (authError.message.includes('already') || authError.message.includes('exists')) {
        const { data: listData } = await supabase.auth.admin.listUsers() as {
          data: { users: Array<{ id: string; email?: string }> } | null;
        };
        const existing = listData?.users?.find(
          (u: { id: string; email?: string }) => u.email?.toLowerCase() === email,
        );
        if (existing) {
          mapper.set('user', user.id, existing.id);
          console.log(`  User ${email} already exists, mapped to ${existing.id}`);
          skipped++;
          continue;
        }
      }
      console.error(`  Failed to create user ${email}:`, authError.message);
      continue;
    }

    const userId = authData.user.id;
    mapper.set('user', user.id, userId);

    // Create profile
    const role = user.permissions === 'admin' ? 'admin' : 'user';
    const { error: profileError } = await supabase.from('profiles').upsert({
      user_id: userId,
      tenant_id: config.IMPORT_TENANT_ID,
      email,
      full_name: fullName,
      avatar_url: user.pic ?? null,
      role,
    }, { onConflict: 'user_id' });

    if (profileError) {
      console.error(`  Failed to create profile for ${email}:`, profileError.message);
    }

    created++;
    console.log(`  [${created + skipped}/${users.length}] Created: ${email} (${role})`);
  }

  console.log(`Users done: ${created} created, ${skipped} skipped`);
}
