'use client'

import { useEffect, useState } from 'react'
import { ROUTES } from '@/consts/routes'

export function UserGreeting() {
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    ;(async () => {
      const res = await fetch(ROUTES.api.auth.user, { cache: 'no-store' })
      if (!active) return
      if (res.ok) {
        const data = await res.json()
        setEmail(data.user?.email ?? null)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  return (
    <p className="text-zinc-700 dark:text-zinc-300">
      ようこそ、{email ?? 'ユーザー'} さん。
    </p>
  )
}
