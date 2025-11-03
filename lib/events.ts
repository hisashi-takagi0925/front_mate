import { EventEmitter } from 'events'

type Payload = { type: 'assistant_reply'; conversationId: string; text: string }

const bus = new EventEmitter()

export function emitConversationEvent(event: Payload) {
  bus.emit(`conv:${event.conversationId}`, event)
}

export function subscribeConversation(conversationId: string, cb: (event: Payload) => void) {
  const ch = `conv:${conversationId}`
  bus.on(ch, cb)
  return () => bus.off(ch, cb)
}

