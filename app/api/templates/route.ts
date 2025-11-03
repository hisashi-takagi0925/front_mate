import { NextRequest, NextResponse } from 'next/server'
import { createRlsClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category') || undefined
  const res = NextResponse.next()
  const supabase = createRlsClient(req, res)
  let q = supabase.from('templates').select('*').order('updated_at', { ascending: false })
  if (category) q = q.eq('category', category)
  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ items: data })
}

export async function POST(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createRlsClient(req, res)
  const body = await req.json().catch(() => null as any)
  if (!body?.tenant_id || !body?.category || !body?.title || !body?.body) {
    return NextResponse.json({ error: 'tenant_id,category,title,body required' }, { status: 400 })
  }
  const { data, error } = await supabase.from('templates').insert(body).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

