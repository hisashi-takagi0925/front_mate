export type ClassValue =
  | string
  | number
  | false
  | null
  | undefined
  | Record<string, boolean>
  | ClassValue[]

export function cn(...inputs: ClassValue[]): string {
  const classes: string[] = []
  const push = (v: ClassValue) => {
    if (!v) return
    if (Array.isArray(v)) return v.forEach(push)
    if (typeof v === 'string' || typeof v === 'number') return classes.push(String(v))
    if (typeof v === 'object') {
      for (const [k, val] of Object.entries(v)) if (val) classes.push(k)
    }
  }
  inputs.forEach(push)
  return classes.join(' ')
}

