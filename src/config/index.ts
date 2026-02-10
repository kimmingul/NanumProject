export const config = {
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL || '',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  },
  app: {
    name: 'NanumAuth',
    version: '0.0.0',
  },
} as const;

export type Config = typeof config;

export { dxTheme, dxDefaults } from './devextreme';
