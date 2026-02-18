import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

loadDotenv();

const ImportConfigSchema = z.object({
  SUPABASE_URL: z.string().url('SUPABASE_URL is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),
  IMPORT_BATCH_SIZE: z.coerce.number().min(1).max(500).default(100),
  IMPORT_TENANT_ID: z.string().uuid('IMPORT_TENANT_ID must be a valid UUID'),
});

export type ImportConfig = z.infer<typeof ImportConfigSchema>;

let cachedConfig: ImportConfig | null = null;
let cachedClient: SupabaseClient | null = null;

export function getImportConfig(): ImportConfig {
  if (cachedConfig) return cachedConfig;

  const result = ImportConfigSchema.safeParse(process.env);
  if (!result.success) {
    console.error('Import configuration validation failed:');
    for (const issue of result.error.issues) {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    }
    process.exit(1);
  }

  cachedConfig = result.data;
  return cachedConfig;
}

export function getSupabaseAdmin(): SupabaseClient {
  if (cachedClient) return cachedClient;

  const config = getImportConfig();
  cachedClient = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return cachedClient;
}
