import { ReactNode } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface Props {
  title: string
  value: string | number
  sub?: string
  icon?: ReactNode
  color?: string
  trend?: number
  loading?: boolean
}

export default function StatCard({ title, value, sub, icon, color = 'var(--primary)', trend, loading }: Props) {
  if (loading) {
    return (
      <div className="stat-card">
        <div className="skeleton" style={{ height: 14, width: '60%', marginBottom: 12 }} />
        <div className="skeleton" style={{ height: 32, width: '80%', marginBottom: 8 }} />
        <div className="skeleton" style={{ height: 12, width: '50%' }} />
      </div>
    )
  }

  return (
    <div className="stat-card" style={{ ['--primary' as string]: color }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--foreground-muted)' }}>{title}</span>
        {icon && (
          <div style={{
            width: 36, height: 36, borderRadius: '10px',
            background: `${color}18`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color,
          }}>
            {icon}
          </div>
        )}
      </div>
      <div style={{ fontSize: '1.625rem', fontWeight: 700, color: 'var(--foreground)', lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.5rem' }}>
        {trend !== undefined && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.125rem', fontSize: '0.75rem', fontWeight: 600, color: trend >= 0 ? 'var(--status-paid)' : 'var(--status-late)' }}>
            {trend >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            {Math.abs(trend)}%
          </span>
        )}
        {sub && <span style={{ fontSize: '0.75rem', color: 'var(--foreground-subtle)' }}>{sub}</span>}
      </div>
    </div>
  )
}
