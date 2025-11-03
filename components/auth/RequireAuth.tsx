'use client'

import { useEffect, useState } from 'react'
import { ROUTES } from '@/consts/routes'
import { useRouter } from 'next/navigation'

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const res = await fetch(ROUTES.api.auth.user, { cache: 'no-store' })
        if (!active) return
        if (res.status === 401) {
          router.replace(ROUTES.login)
          return
        }
      } finally {
        if (active) setChecking(false)
      }
    })()
    return () => {
      active = false
    }
  }, [router])

  if (checking) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
        認証を確認しています…
      </div>
    )
  }
  return <>{children}</>
}
