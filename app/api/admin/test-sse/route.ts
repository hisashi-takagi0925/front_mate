import { NextRequest } from 'next/server'
import { subscribeConversation } from '@/lib/events'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const conversationId = searchParams.get('conversationId')
  if (!conversationId) {
    return new Response('conversationId required', { status: 400 })
  }

  const stream = new ReadableStream<string>({
    start(controller) {
      const send = (data: any) => {
        controller.enqueue(`data: ${JSON.stringify(data)}\n\n`)
      }
      const unsub = subscribeConversation(conversationId, (ev) => send(ev))
      // keepalive
      const iv = setInterval(() => controller.enqueue(': keepalive\n\n'), 15000)
      controller.enqueue(': connected\n\n')
      return () => { clearInterval(iv); unsub() }
    },
    cancel() {},
  })
  return new Response(stream as any, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}

