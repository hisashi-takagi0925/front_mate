"use client"

// Lightweight store (Zustand-like API) to avoid external installs.
// When zustand is available, replace this file with:
//   import { create } from 'zustand'
//   export const useThemeStore = create<ThemeState>((set) => ({ ... }))

import { useSyncExternalStore, useEffect } from 'react'

type Theme = 'light' | 'dark' | 'system'
type ThemeState = {
  theme: Theme
  setTheme: (t: Theme) => void
  toggle: () => void
}

let state: ThemeState = {
  theme: 'system',
  setTheme: (t: Theme) => {
    state = { ...state, theme: t }
    applyTheme(t)
    emit()
  },
  toggle: () => {
    const next = state.theme === 'dark' ? 'light' : 'dark'
    state.setTheme(next)
  },
}

const subscribers = new Set<() => void>()
function emit() {
  subscribers.forEach((fn) => fn())
}

function applyTheme(t: Theme) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.classList.remove('light', 'dark')
  if (t === 'system') {
    // rely on media query; no class
    localStorage.removeItem('fm-theme')
    return
  }
  root.classList.add(t)
  localStorage.setItem('fm-theme', t)
}

export function useThemeStore(): ThemeState {
  // Init from storage/system on first client mount
  useEffect(() => {
    const saved = (localStorage.getItem('fm-theme') as Theme | null)
    if (saved === 'light' || saved === 'dark') {
      applyTheme(saved)
      state = { ...state, theme: saved }
      emit()
    } else {
      // system: clear classes
      applyTheme('system')
      state = { ...state, theme: 'system' }
      emit()
    }
  }, [])

  const snapshot = useSyncExternalStore(
    (cb) => {
      subscribers.add(cb)
      return () => subscribers.delete(cb)
    },
    () => state,
    () => state
  )

  return snapshot
}

