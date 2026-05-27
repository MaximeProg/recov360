import { ThemeProvider } from '@/contexts/theme'
import ThemeToggle from '@/components/layout/ThemeToggle'
import { TrendingUp } from 'lucide-react'
import Link from 'next/link'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--background)' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
          <div style={{ width: 30, height: 30, background: 'var(--primary)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp size={16} color="white" />
          </div>
          <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--foreground)', letterSpacing: '-0.01em' }}>
            Recov<span style={{ color: 'var(--primary)' }}>360</span>
          </span>
        </Link>
        <ThemeToggle />
      </div>
      {/* Content */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
        {children}
      </div>
      {/* Footer */}
      <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--foreground-subtle)', fontSize: '0.75rem', borderTop: '1px solid var(--border)' }}>
        © {new Date().getFullYear()} Recov360 · Recouvrement automatisé pour PME africaines
      </div>
    </div>
  )
}
