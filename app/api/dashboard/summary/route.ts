import { NextRequest, NextResponse } from 'next/server'
import { createRlsClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const range = searchParams.get('range') === '30d' ? 30 : 7
  const res = NextResponse.next()
  const supabase = createRlsClient(req, res)

  const since = new Date(Date.now() - range * 24 * 60 * 60 * 1000).toISOString()

  // Count total (exclude tests)
  const { data: convs, error } = await supabase
    .from('conversations')
    .select('id, category, priority_score, created_at, first_user_message_at, last_assistant_message_at, is_test')
    .gte('created_at', since)
    .eq('is_test', false)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const count_total = convs.length
  const cats: Record<string, number> = {}
  let high_priority = 0
  let first_reply_secs_sum = 0
  let first_reply_count = 0
  for (const c of convs) {
    const cat = (c as any).category || 'other'
    cats[cat] = (cats[cat] || 0) + 1
    if (typeof (c as any).priority_score === 'number' && (c as any).priority_score >= 80) high_priority++
    const first = (c as any).first_user_message_at ? new Date((c as any).first_user_message_at).getTime() : undefined
    const firstReply = (c as any).last_assistant_message_at ? new Date((c as any).last_assistant_message_at).getTime() : undefined
    if (first && firstReply && firstReply >= first) {
      first_reply_secs_sum += (firstReply - first) / 1000
      first_reply_count++
    }
  }
  const avg_first_reply_seconds = first_reply_count ? (first_reply_secs_sum / first_reply_count) : null
  const high_priority_rate = count_total ? high_priority / count_total : 0

  return NextResponse.json({ count_total, count_by_category: cats, high_priority_rate, avg_first_reply_seconds })
}

