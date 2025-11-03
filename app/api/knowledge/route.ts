import { NextRequest, NextResponse } from 'next/server'
import { createRlsClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') || undefined
  const res = NextResponse.next()
  const supabase = createRlsClient(req, res)
  let q = supabase.from('knowledge_base').select('*').order('updated_at', { ascending: false })
  if (type) q = q.eq('type', type)
  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ items: data })
}

export async function POST(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createRlsClient(req, res)
  const body = await req.json().catch(() => null as any)
  if (!body?.tenant_id || !body?.type || !body?.title || !body?.content) {
    return NextResponse.json({ error: 'tenant_id,type,title,content required' }, { status: 400 })
  }
  const { data, error } = await supabase.from('knowledge_base').insert(body).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

