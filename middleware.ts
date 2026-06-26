import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  // 1. Initialize Supabase client using modern getAll/setAll architecture
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set({ name, value, ...options }))
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set({ name, value, ...options })
          )
        },
      },
    }
  )

  // 2. Safely extract user authentication status and metadata
  const { data: { user } } = await supabase.auth.getUser()

  // 3. PROTECT DASHBOARD & BACKSTAGE: If not logged in -> Redirect to login
  if (!user && (request.nextUrl.pathname.startsWith('/dashboard') || request.nextUrl.pathname.startsWith('/backstage'))) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // 4. THE BOUNCER (ADMIN ONLY): If logged in but lacks admin badge -> Redirect to dashboard
  if (user && request.nextUrl.pathname.startsWith('/backstage')) {
    const isAdmin = user.app_metadata?.role === 'admin'
    
    if (!isAdmin) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  // 5. PREVENT DOUBLE LOGIN: If logged in and accessing login page -> Route appropriately
  if (user && request.nextUrl.pathname.startsWith('/login')) {
    const url = request.nextUrl.clone()
    const isAdmin = user.app_metadata?.role === 'admin'
    
    // Route admins to backstage, students to dashboard
    url.pathname = isAdmin ? '/backstage' : '/dashboard'
    
    const redirectResponse = NextResponse.redirect(url)
    
    // Copy active session cookies over to the redirect response object
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
    })
    
    return redirectResponse
  }

  return response
}

// Specify exactly which paths should trigger this authentication check
export const config = {
  matcher: ['/dashboard/:path*', '/backstage/:path*', '/login'],
}
