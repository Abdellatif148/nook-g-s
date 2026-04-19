import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials missing. Please check your environment secrets.')
}

/**
 * Supabase client.
 * Falls back to a placeholder URL so the app can still boot when credentials
 * are not yet configured — all network calls will fail gracefully.
 * We don't pass a Database generic here to avoid fighting Supabase's internal
 * type resolution. All table rows are typed explicitly via our service layer.
 */
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
    global: {
      headers: { 'x-app-name': 'nook-os' },
    },
  }
)
