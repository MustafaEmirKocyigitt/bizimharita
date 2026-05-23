import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://headxnpnkuvibdxjqeag.supabase.co'
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_iZHKkyKg19htzKbNsbvMoQ_Z7IbqdA9'

  const supabase = createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Kullanıcı bilgisini çekerek oturumu doğrular/yeniler
  const { data: { user } } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  // Statik dosyaları, api rotalarını ve favicon gibi şeyleri middleware korumasından muaf tutalım
  if (
    path.startsWith('/api') ||
    path.startsWith('/_next') ||
    path.includes('.') ||
    path === '/favicon.ico'
  ) {
    return supabaseResponse
  }

  // Giriş yapmamış kullanıcıyı korumalı sayfalardan login'e yönlendir
  if (!user && path !== '/login' && path !== '/register') {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Giriş yapmış kullanıcıyı login/register sayfalarından ana sayfaya yönlendir
  if (user && (path === '/login' || path === '/register')) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
