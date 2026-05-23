import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://headxnpnkuvibdxjqeag.supabase.co'
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_iZHKkyKg19htzKbNsbvMoQ_Z7IbqdA9'

  return createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Sunucu bileşenlerinden (Server Components) çağrıldığında
            // cookie set işlemi hata verebilir. Bu beklenen bir durumdur.
          }
        },
      },
    }
  )
}
