import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { ROUTES } from '@/consts/routes'

export async function GET(request: NextRequest) {
  const loginRedirect = NextResponse.redirect(new URL(ROUTES.login, request.url))

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          loginRedirect.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          loginRedirect.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    return NextResponse.redirect(new URL(ROUTES.dashboard, request.url))
  }

  return loginRedirect
}
