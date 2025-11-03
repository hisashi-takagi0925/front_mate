import { NextRequest, NextResponse } from 'next/server'
import { createRlsClient } from '@/lib/supabase/server'
import { emitConversationEvent } from '@/lib/events'

export async function POST(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createRlsClient(req, res)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null as any)
  if (!body?.tenant_id || !body?.text) return NextResponse.json({ error: 'tenant_id and text required' }, { status: 400 })

  const { data: conv, error: cerr } = await supabase
    .from('conversations')
    .insert({ tenant_id: body.tenant_id, channel: 'admin_test', is_test: true })
    .select('id')
    .single()
  if (cerr) return NextResponse.json({ error: cerr.message }, { status: 400 })

  const { error: merr } = await supabase
    .from('messages')
    .insert({ conversation_id: conv.id, role: 'user', content: body.text })
  if (merr) return NextResponse.json({ error: merr.message }, { status: 400 })

  // Echo immediate placeholder assistant message (optional)
  emitConversationEvent({ type: 'assistant_reply', conversationId: conv.id, text: '[processing...]' })

  return NextResponse.json({ conversationId: conv.id })
}

