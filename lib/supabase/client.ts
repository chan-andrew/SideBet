import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null

export function createClient(): SupabaseClient {
  if (_client) return _client
  console.log('[supabase] URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
  console.log('[supabase] KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  _client = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  return _client
}
