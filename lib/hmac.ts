import crypto from 'crypto'

export function verifyHmacSHA256Hex(rawBody: string, signatureHex: string, secret: string): boolean {
  const h = crypto.createHmac('sha256', secret)
  h.update(rawBody)
  const expected = h.digest('hex')
  // constant-time compare
  const a = Buffer.from(expected)
  const b = Buffer.from(signatureHex)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

