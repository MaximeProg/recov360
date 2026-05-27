'use client'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '@/contexts/theme'

export default function ThemeToggle() {
  const { theme, toggle } = useTheme()

  return (
    <button
      onClick={toggle}
      title={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 34, height: 34, borderRadius: '8px',
        border: '1.5px solid var(--border)',
        background: 'var(--surface)',
        color: 'var(--foreground-muted)',
        cursor: 'pointer', transition: 'all 0.15s',
      }}
    >
      {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  )
}
