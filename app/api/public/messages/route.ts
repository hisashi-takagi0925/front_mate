import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null as any)
  if (!body?.tenantId || !body?.text) {
    return NextResponse.json({ error: 'tenantId and text required' }, { status: 400 })
  }

  const ip = req.headers.get('x-forwarded-for') || '0.0.0.0'
  const ua = req.headers.get('user-agent') || ''
  const meta = { ...(body.meta ?? {}), ip, ua }

  const supabase = createAdminClient()

  // Create conversation
  const { data: conv, error: convErr } = await supabase
    .from('conversations')
    .insert({ tenant_id: body.tenantId, channel: 'web', is_test: false, meta })
    .select('id')
    .single()

  if (convErr) return NextResponse.json({ error: convErr.message }, { status: 400 })

  // Insert first user message
  const { error: msgErr } = await supabase
    .from('messages')
    .insert({ conversation_id: conv.id, role: 'user', content: body.text, meta })

  if (msgErr) return NextResponse.json({ error: msgErr.message }, { status: 400 })

  // TODO: trigger n8n inbound webhook (out of scope in this repo)
  return NextResponse.json({ conversationId: conv.id })
}

