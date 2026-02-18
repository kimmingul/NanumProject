import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

loadDotenv();

const ConfigSchema = z.object({
  TEAMGANTT_BASE_URL: z.string().url().default('https://api.teamgantt.com/v1'),
  OUTPUT_DIR: z.string().default('./output'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  MAX_CONCURRENCY: z.coerce.number().min(1).max(20).default(5),
  DOWNLOAD_DOCUMENTS: z
    .string()
    .transform(v => v === 'true')
    .default('true'),

  // AWS Cognito authentication
  COGNITO_REGION: z.string().min(1, 'Cognito region is required'),
  COGNITO_USER_POOL_ID: z.string().min(1, 'Cognito user pool ID is required'),
  COGNITO_CLIENT_ID: z.string().min(1, 'Cognito client ID is required'),
  COGNITO_REFRESH_TOKEN: z.string().min(1, 'Cognito refresh token is required'),
});

export type Config = z.infer<typeof ConfigSchema>;

let cachedConfig: Config | null = null;

export function getConfig(): Config {
  if (cachedConfig) return cachedConfig;

  const result = ConfigSchema.safeParse(process.env);
  if (!result.success) {
    console.error('Configuration validation failed:');
    for (const issue of result.error.issues) {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    }
    process.exit(1);
  }

  cachedConfig = result.data;
  return cachedConfig;
}
