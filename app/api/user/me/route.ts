import { NextRequest, NextResponse } from 'next/server'
import { createRlsClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createRlsClient(req, res)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const meta = (user as any)?.user_metadata ?? {}
  const displayName: string | null =
    meta.full_name || meta.name || meta.user_name || meta.username || null

  const { data: memberships } = await supabase
    .from('tenant_members')
    .select('tenant_id, tenants(name)')
    .eq('user_id', user.id)
    .limit(1)

  const tenantId: string | null = memberships?.[0]?.tenant_id ?? null
  const tenantName: string | null = (memberships?.[0] as any)?.tenants?.name ?? null

  return NextResponse.json({
    userId: user.id,
    displayName,
    tenantId,
    tenantName,
  })
}

