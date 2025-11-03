'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { ROUTES } from '@/consts/routes'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
// import { Separator } from '@/components/ui/separator'
import { ScrollArea, ScrollViewport } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { DashboardIcon, InboxIcon, BookIcon, FileIcon, BeakerIcon } from '@/components/ui/icons'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type NavItem = { label: string; href: string; icon: React.ReactNode }

const NAV: NavItem[] = [
  { label: 'ダッシュボード', href: ROUTES.dashboard, icon: <DashboardIcon /> },
  { label: '受信箱', href: '/inbox', icon: <InboxIcon /> },
  { label: 'ナレッジ', href: '/knowledge', icon: <BookIcon /> },
  { label: 'テンプレート', href: '/templates', icon: <FileIcon /> },
  { label: 'テスト', href: '/test', icon: <BeakerIcon /> },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(true)
  const [email, setEmail] = useState<string | null>(null)
  const [tenant, setTenant] = useState<string | null>(null)

  // 初期幅で開閉の初期値を決定（md以上は開、md未満は閉）
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 768px)')
    setOpen(mql.matches)
    const handler = (e: MediaQueryListEvent) => setOpen(e.matches)
    mql.addEventListener?.('change', handler)
    return () => mql.removeEventListener?.('change', handler)
  }, [])

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const res = await fetch(ROUTES.api.auth.user, { cache: 'no-store' })
        if (!active) return
        if (res.ok) {
          const data = await res.json()
          setEmail(data.user?.email ?? null)
          setTenant(data.tenant?.name ?? null)
        }
      } catch {}
    })()
    return () => {
      active = false
    }
  }, [])

  const MobileSidebar = (
    <nav className="p-2">
      {NAV.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="flex h-9 items-center gap-3 rounded-md px-2 text-sm hover:bg-accent hover:text-accent-foreground"
          title={item.label}
        >
          <span className="inline-flex w-5 items-center justify-center text-base">{item.icon}</span>
          <span className="whitespace-nowrap">{item.label}</span>
        </Link>
      ))}
    </nav>
  )

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          {/* md以上は幅トグル、md未満はSheetトリガ */}
          <div className="md:hidden">
            <Sheet open={!open} onOpenChange={(v) => setOpen(!v)}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" aria-label="メニューを開く">メニュー</Button>
              </SheetTrigger>
              <SheetContent side="left">
                <ScrollArea className="h-full"><ScrollViewport className="h-full">{MobileSidebar}</ScrollViewport></ScrollArea>
              </SheetContent>
            </Sheet>
          </div>
          <button
            aria-label="サイドバーの開閉"
            onClick={() => setOpen((v) => !v)}
            className="hidden rounded-md border border-border px-2 py-1 text-sm md:inline-flex"
          >
            {open ? '⟨' : '⟩'}
          </button>
          <Link href={ROUTES.root} className="font-semibold">
            FrontMate
          </Link>
        </div>
        <div className="relative hidden items-center gap-2 md:flex">
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                {(tenant ?? 'テナント')} — {(email ?? 'ユーザー')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="text-sm">{email ?? 'ユーザー'}</span>
                  <span className="text-xs text-muted-foreground">{tenant ?? 'テナント未所属'}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <form action={ROUTES.auth.signout} method="post">
                <DropdownMenuItem asChild>
                  <button type="submit" className="w-full text-left">ログアウト</button>
                </DropdownMenuItem>
              </form>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="flex">
        {/* md以上は常設サイドバー */}
        <aside
          className={cn(
            'sticky top-0 hidden h-[calc(100vh-57px)] overflow-hidden border-r border-border bg-background transition-[width] duration-300 ease-in-out md:block'
          )}
          aria-label="サイドバー"
          style={{ width: open ? 260 : 64 }}
        >
          <nav className="p-2">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex h-9 items-center rounded-md px-2 text-sm hover:bg-accent hover:text-accent-foreground',
                  open ? 'gap-3' : 'gap-0'
                )}
                title={!open ? item.label : undefined}
              >
                <span className="inline-flex w-5 items-center justify-center text-base">{item.icon}</span>
                <span
                  className={cn(
                    'whitespace-nowrap transition-all duration-200',
                    open ? 'ml-2 w-auto opacity-100' : 'w-0 overflow-hidden opacity-0'
                  )}
                  aria-hidden={!open}
                >
                  {item.label}
                </span>
              </Link>
            ))}
            {null}
          </nav>
        </aside>
        <main className="flex-1 p-6 transition-[padding] duration-300 ease-in-out">{children}</main>
      </div>
    </div>
  )
}
