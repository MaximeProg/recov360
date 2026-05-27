import { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import Link from 'next/link'

interface Breadcrumb { label: string; href?: string }

interface Props {
  title: string
  subtitle?: string
  actions?: ReactNode
  breadcrumbs?: Breadcrumb[]
}

export default function PageHeader({ title, subtitle, actions, breadcrumbs }: Props) {
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.5rem', fontSize: '0.8125rem', color: 'var(--foreground-muted)', flexWrap: 'wrap' }}>
          {breadcrumbs.map((b, i) => (
            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              {i > 0 && <ChevronRight size={13} />}
              {b.href ? (
                <Link href={b.href} style={{ color: 'var(--primary)', textDecoration: 'none' }}>{b.label}</Link>
              ) : (
                <span style={{ color: 'var(--foreground-subtle)' }}>{b.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: 'clamp(1.125rem, 4vw, 1.375rem)', fontWeight: 700, color: 'var(--foreground)', letterSpacing: '-0.01em' }}>
            {title}
          </h1>
          {subtitle && (
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--foreground-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {subtitle}
            </p>
          )}
        </div>
        {actions && (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', flexShrink: 0 }}>
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}
