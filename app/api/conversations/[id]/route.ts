import { NextRequest, NextResponse } from 'next/server'
import { createRlsClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const res = NextResponse.next()
  const supabase = createRlsClient(req, res)
  const { id } = await context.params
  const { data, error } = await supabase
    .from('conversations')
    .select('*, messages(*)')
    .eq('id', id)
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const res = NextResponse.next()
  const supabase = createRlsClient(req, res)
  const { id } = await context.params
  const body = await req.json().catch(() => ({}))
  const patch: any = {}
  if (body.status) patch.status = body.status
  if (body.category) patch.category = body.category
  if (typeof body.priority_score === 'number') patch.priority_score = body.priority_score
  if (!Object.keys(patch).length) return NextResponse.json({ ok: true })
  const { error } = await supabase.from('conversations').update(patch).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
