'use client'

import { Button } from '@/components/ui/button'
import { useThemeStore } from '@/stores/theme'

export function ThemeToggle() {
  const { theme, toggle, setTheme } = useThemeStore()

  const next = theme === 'dark' ? 'light' : 'dark'

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={toggle} aria-label="テーマ切替">
        {theme === 'dark' ? '🌙 Dark' : theme === 'light' ? '☀️ Light' : '🖥 System'}
      </Button>
      <div className="hidden md:flex gap-1">
        <Button variant={theme === 'light' ? 'default' : 'outline'} size="sm" onClick={() => setTheme('light')}>L</Button>
        <Button variant={theme === 'dark' ? 'default' : 'outline'} size="sm" onClick={() => setTheme('dark')}>D</Button>
        <Button variant={theme === 'system' ? 'default' : 'outline'} size="sm" onClick={() => setTheme('system')}>S</Button>
      </div>
    </div>
  )
}

