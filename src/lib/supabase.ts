import { createClient } from '@supabase/supabase-js';
import { config } from '@/config';
import type { Database } from '@/types/supabase';

/**
 * Supabase client singleton (typed)
 */
export const supabase = createClient<Database>(
  config.supabase.url,
  config.supabase.anonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: window.localStorage,
    },
    global: {
      headers: {
        'X-Client-Info': `${config.app.name}/${config.app.version}`,
      },
    },
  }
);

/** Update 객체에서 undefined 값 제거 (exactOptionalPropertyTypes 호환) */
export function dbUpdate<T extends Record<string, unknown>>(obj: T) {
  const result: Record<string, unknown> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key) && obj[key] !== undefined) {
      result[key] = obj[key];
    }
  }
  return result as { [K in keyof T]: Exclude<T[K], undefined> };
}

/**
 * Helper to get current session
 */
export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

/**
 * Helper to get current user
 */
export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
}

/**
 * Helper to sign out
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
