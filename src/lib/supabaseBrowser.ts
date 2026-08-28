import { createClient, type SupabaseClient, type Session } from '@supabase/supabase-js';

// Default public keys if provided via Vite environment
const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as Record<string, any>).env : undefined;
const envUrl = (metaEnv?.VITE_SUPABASE_URL as string) || '';
const envAnonKey = ((metaEnv?.VITE_SUPABASE_ANON_KEY || metaEnv?.VITE_SUPABASE_PUBLISHABLE_KEY) as string) || '';

let browserClient: SupabaseClient | null = null;

export function getBrowserSupabase(customUrl?: string, customAnonKey?: string): SupabaseClient {
  if (browserClient) return browserClient;

  const url = customUrl || envUrl || (typeof window !== 'undefined' && (window as any).__CAREERVOICE_SUPABASE_URL__) || 'https://pfzjbazocmgflcogjjrg.supabase.co';
  const anonKey = customAnonKey || envAnonKey || (typeof window !== 'undefined' && (window as any).__CAREERVOICE_SUPABASE_ANON_KEY__) || 'sb_publishable_5IxIvt5Ba8m-AFbAnwZXDQ_8jyx9qPX';

  browserClient = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'careervoice_supabase_auth_token',
    },
  });

  return browserClient;
}

export const supabaseBrowser = getBrowserSupabase();

export async function getAuthSession(): Promise<Session | null> {
  const client = getBrowserSupabase();
  const { data, error } = await client.auth.getSession();
  if (error || !data.session) return null;
  return data.session;
}

export async function setAuthSession(tokens: { access_token: string; refresh_token: string }): Promise<Session | null> {
  const client = getBrowserSupabase();
  const { data, error } = await client.auth.setSession({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
  });

  if (error) {
    console.error('[AUTH] Failed to set Supabase session in browser client:', error.message);
    throw error;
  }

  const verified = await client.auth.getSession();
  if (!verified.data.session?.access_token) {
    throw new Error('SESSION_ESTABLISHMENT_FAILED');
  }

  console.log('[AUTH] Supabase session established in browser');
  console.log(`[AUTH] session user id = ${verified.data.session.user?.id}`);
  console.log('[AUTH] access token present = true');

  return verified.data.session;
}

export async function clearAuthSession(): Promise<void> {
  const client = getBrowserSupabase();
  await client.auth.signOut();
  console.log('[AUTH] Supabase session cleared');
}
