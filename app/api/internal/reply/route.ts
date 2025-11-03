import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyHmacSHA256Hex } from '@/lib/hmac'
import { emitConversationEvent } from '@/lib/events'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const raw = await req.text()
  const sig = req.headers.get('x-signature') || ''
  const secret = process.env.N8N_OUTBOUND_SHARED_SECRET || ''
  if (!secret) return NextResponse.json({ error: 'server misconfigured' }, { status: 500 })
  const ok = verifyHmacSHA256Hex(raw, sig, secret)
  if (!ok) return NextResponse.json({ error: 'invalid signature' }, { status: 401 })

  let body: any
  try { body = JSON.parse(raw) } catch { return NextResponse.json({ error: 'invalid json' }, { status: 400 }) }
  const { conversationId, text, category, priority_score } = body
  if (!conversationId || !text) {
    return NextResponse.json({ error: 'conversationId and text required' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const updates: any = {}
  if (category) updates.category = category
  if (typeof priority_score === 'number') updates.priority_score = priority_score

  if (Object.keys(updates).length) {
    const { error: uerr } = await supabase.from('conversations').update(updates).eq('id', conversationId)
    if (uerr) return NextResponse.json({ error: uerr.message }, { status: 400 })
  }

  const { error: merr } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, role: 'assistant', content: text })
  if (merr) return NextResponse.json({ error: merr.message }, { status: 400 })

  emitConversationEvent({ type: 'assistant_reply', conversationId, text })
  return NextResponse.json({ ok: true })
}

