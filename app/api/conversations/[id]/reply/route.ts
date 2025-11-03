import { NextRequest, NextResponse } from 'next/server'
import { createRlsClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const res = NextResponse.next()
  const supabase = createRlsClient(req, res)
  const body = await req.json().catch(() => null as any)
  if (!body?.text) return NextResponse.json({ error: 'text required' }, { status: 400 })
  const { id } = await context.params

  // Manual reply from admin (assistant role)
  const { error } = await supabase
    .from('messages')
    .insert({ conversation_id: id, role: 'assistant', content: body.text })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
