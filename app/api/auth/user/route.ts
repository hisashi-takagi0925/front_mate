import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export async function GET(request: NextRequest) {
  const response = NextResponse.json({ user: null }, { status: 200 })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ user: null }, { status: 401 })

  // Fetch tenant info for the logged-in user (first tenant if multiple)
  const { data: memberships } = await supabase
    .from('tenant_members')
    .select('tenant_id, tenants(name)')
    .eq('user_id', user.id)
    .limit(1)

  const tenant = memberships?.[0]
    ? { id: memberships[0].tenant_id as string, name: (memberships[0] as any).tenants?.name as string | null }
    : null

  return NextResponse.json({ user, tenant })
}
