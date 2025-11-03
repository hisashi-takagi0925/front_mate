"use client"
import { useEffect, useMemo, useRef, useState } from 'react'

type Msg = { id: string; role: 'user' | 'assistant'; content: string; ts: number }

export default function ChatPage({ params }: { params: Promise<{ tenant: string }> }) {
  const [resolvedParams, setResolvedParams] = useState<{ tenant: string } | null>(null)
  useEffect(() => { params.then(setResolvedParams) }, [params])
  if (!resolvedParams) return null
  return <ChatWidget tenantId={resolvedParams.tenant} />
}

function ChatWidget({ tenantId }: { tenantId: string }) {
  const [open, setOpen] = useState(true)
  const [messages, setMessages] = useState<Msg[]>([])
  const [text, setText] = useState('')
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const evRef = useRef<EventSource | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    // auto-scroll to bottom on new messages
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    return () => {
      evRef.current?.close()
    }
  }, [])

  const headers = useMemo(() => ({ 'Content-Type': 'application/json' }), [])

  async function ensureConversation(firstText: string) {
    if (conversationId) return conversationId
    const res = await fetch('/api/public/messages', {
      method: 'POST',
      headers,
      body: JSON.stringify({ tenantId, text: firstText }),
    })
    if (!res.ok) throw new Error('failed to create conversation')
    const json = (await res.json()) as { conversationId: string }
    setConversationId(json.conversationId)
    openSSE(json.conversationId)
    return json.conversationId
  }

  function openSSE(cid: string) {
    evRef.current?.close()
    const url = `/api/admin/test-sse?conversationId=${encodeURIComponent(cid)}`
    const es = new EventSource(url)
    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data) as { type: string; text?: string }
        if (data.type === 'assistant_reply' && data.text) {
          setMessages((prev) => [
            ...prev,
            { id: crypto.randomUUID(), role: 'assistant', content: data.text!, ts: Date.now() },
          ])
        }
      } catch {}
    }
    evRef.current = es
  }

  async function onSend() {
    const t = text.trim()
    if (!t || sending) return
    setSending(true)
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'user', content: t, ts: Date.now() }])
    setText('')
    try {
      const cid = await ensureConversation(t)
      // backend will trigger assistant via n8n and SSE
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: 'assistant', content: '送信に失敗しました。しばらくしてからお試しください。', ts: Date.now() },
      ])
    } finally {
      setSending(false)
    }
  }

  function onClear() {
    setMessages([])
    setConversationId(null)
    evRef.current?.close()
    evRef.current = null
  }

  return (
    <div className="fixed inset-0 flex items-end justify-end p-4">
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="rounded-full bg-blue-600 text-white px-5 py-3 shadow-lg hover:bg-blue-700"
        >
          チャットを開く
        </button>
      )}

      {open && (
        <div className="w-full max-w-md h-[70vh] sm:h-[80vh] bg-white border border-slate-200 rounded-xl shadow-xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 bg-slate-50">
            <div className="font-medium">お問い合わせチャット</div>
            <div className="flex items-center gap-2">
              <button onClick={onClear} className="text-sm text-slate-600 hover:text-slate-900">クリア</button>
              <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-slate-900">✕</button>
            </div>
          </div>

          <div ref={listRef} className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50">
            {messages.length === 0 && (
              <div className="text-sm text-slate-500">ご質問を入力して送信してください。</div>
            )}
            {messages.map((m) => (
              <div key={m.id} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div className={
                  'max-w-[80%] rounded-2xl px-3 py-2 text-sm ' +
                  (m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-900')
                }>
                  {m.content}
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 border-t border-slate-200 bg-white">
            <div className="flex items-end gap-2">
              <textarea
                className="flex-1 min-h-[44px] max-h-40 resize-y rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="お問い合わせ内容を入力..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend() }
                }}
              />
              <button
                onClick={onSend}
                disabled={sending || !text.trim()}
                className="shrink-0 rounded-md bg-blue-600 text-white px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700"
              >
                送信
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
