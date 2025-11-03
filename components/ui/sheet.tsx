"use client"

import * as React from 'react'
import { cn } from '@/lib/utils'

type SheetContextValue = {
  open: boolean
  onOpenChange: (v: boolean) => void
}

const SheetCtx = React.createContext<SheetContextValue | null>(null)

export function Sheet({ open, onOpenChange, children }: { open: boolean; onOpenChange: (v: boolean) => void; children: React.ReactNode }) {
  return <SheetCtx.Provider value={{ open, onOpenChange }}>{children}</SheetCtx.Provider>
}

export function SheetTrigger({ asChild, children }: { asChild?: boolean; children: React.ReactElement }) {
  const ctx = React.useContext(SheetCtx)!
  const child = React.Children.only(children) as React.ReactElement<any>
  const props = {
    onClick: (e: React.MouseEvent) => {
      ;(child.props as any)?.onClick?.(e)
      ctx.onOpenChange(true)
    },
    'aria-expanded': ctx.open,
    'aria-haspopup': 'dialog',
  }
  return asChild ? React.cloneElement(child, props) : React.cloneElement(child, props)
}

export function SheetContent({ side = 'left', className, children }: { side?: 'left' | 'right'; className?: string; children: React.ReactNode }) {
  const ctx = React.useContext(SheetCtx)!
  return (
    <div
      aria-modal
      role="dialog"
      className={cn(
        'fixed inset-0 z-50',
        ctx.open ? 'pointer-events-auto' : 'pointer-events-none'
      )}
      onClick={() => ctx.onOpenChange(false)}
    >
      {/* Backdrop */}
      <div className={cn('absolute inset-0 bg-black/30 transition-opacity', ctx.open ? 'opacity-100' : 'opacity-0')} />
      {/* Panel */}
      <div
        className={cn(
          'absolute top-0 h-full w-72 bg-background shadow-lg transition-transform duration-300 ease-in-out',
          side === 'left' ? 'left-0' : 'right-0',
          ctx.open ? 'translate-x-0' : side === 'left' ? '-translate-x-full' : 'translate-x-full',
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

export function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-4', className)} {...props} />
}
export function SheetTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn('text-base font-semibold', className)} {...props} />
}
export function SheetDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm text-muted-foreground', className)} {...props} />
}
export function SheetClose({ asChild, children }: { asChild?: boolean; children: React.ReactElement }) {
  const ctx = React.useContext(SheetCtx)!
  const child = React.Children.only(children) as React.ReactElement<any>
  const props = {
    onClick: (e: React.MouseEvent) => {
      ;(child.props as any)?.onClick?.(e)
      ctx.onOpenChange(false)
    },
  }
  return asChild ? React.cloneElement(child, props) : React.cloneElement(child, props)
}
