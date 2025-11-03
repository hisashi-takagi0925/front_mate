import { ReactNode } from 'react'
import Link from 'next/link'
import { RequireAuth } from '@/components/auth/RequireAuth'
import { ROUTES } from '@/consts/routes'
// no headers() usage to avoid RSC/Turbopack edge cases

export default async function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href={ROUTES.root} className="font-semibold">FrontMate</Link>
          <nav className="text-sm text-zinc-600 dark:text-zinc-400">
            <Link href={ROUTES.dashboard}>ダッシュボード</Link>
          </nav>
        </div>
        <form action={ROUTES.auth.signout} method="post">
          <button className="rounded-md border px-3 py-1 text-sm">ログアウト</button>
        </form>
      </header>
      <main className="mx-auto max-w-5xl p-6">
        <RequireAuth>{children}</RequireAuth>
      </main>
    </div>
  )
}
