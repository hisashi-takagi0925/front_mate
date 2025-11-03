import { NextRequest, NextResponse } from 'next/server'
import { createRlsClient } from '@/lib/supabase/server'

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const res = NextResponse.next()
  const supabase = createRlsClient(req, res)
  const { id } = await context.params
  const body = await req.json().catch(() => ({}))
  const allowed = ['category', 'title', 'body', 'enabled', 'meta'] as const
  const patch: any = {}
  for (const k of allowed) if (k in body) patch[k] = body[k]
  if (!Object.keys(patch).length) return NextResponse.json({ ok: true })
  const { error } = await supabase.from('templates').update(patch).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
