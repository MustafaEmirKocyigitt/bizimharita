import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://headxnpnkuvibdxjqeag.supabase.co'
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_iZHKkyKg19htzKbNsbvMoQ_Z7IbqdA9'
  
  return createBrowserClient(url, anonKey)
}

