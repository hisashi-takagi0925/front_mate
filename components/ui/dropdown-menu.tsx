"use client"

import * as React from 'react'
import { cn } from '@/lib/utils'

type Ctx = { open: boolean; setOpen: (v: boolean) => void }
const Ctx = React.createContext<Ctx | null>(null)

export function DropdownMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])
  return <Ctx.Provider value={{ open, setOpen }}>{children}</Ctx.Provider>
}

export function DropdownMenuTrigger({ asChild, children }: { asChild?: boolean; children: React.ReactElement }) {
  const ctx = React.useContext(Ctx)!
  const child = React.Children.only(children) as React.ReactElement<any>
  const props = {
    onClick: (e: React.MouseEvent) => {
      ;(child.props as any)?.onClick?.(e)
      ctx.setOpen(!ctx.open)
    },
    'aria-expanded': ctx.open,
    'aria-haspopup': 'menu',
  }
  return asChild ? React.cloneElement(child, props) : React.cloneElement(child, props)
}

export function DropdownMenuContent({ className, children }: { className?: string; children: React.ReactNode }) {
  const ctx = React.useContext(Ctx)!
  return (
    <div
      className={cn(
        'absolute right-0 top-full z-50 mt-2 w-56 rounded-md border border-border bg-background p-1 shadow-md outline-none transition-opacity',
        ctx.open ? 'opacity-100' : 'pointer-events-none opacity-0',
        className
      )}
      role="menu"
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  )
}

export function DropdownMenuLabel({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-2 py-1.5 text-xs font-medium text-muted-foreground', className)} {...props} />
}

export function DropdownMenuSeparator({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('my-1 h-px w-full bg-border', className)} {...props} />
}

export function DropdownMenuItem({ asChild, className, children, ...props }: { asChild?: boolean } & React.HTMLAttributes<HTMLDivElement>) {
  const Comp: any = asChild ? (React.Children.only(children) as any) : 'div'
  const baseProps = {
    className: cn('cursor-pointer select-none rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground', className),
    role: 'menuitem',
    ...props,
  }
  return asChild ? React.cloneElement(Comp, baseProps) : <div {...baseProps}>{children}</div>
}
