import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  page: number; totalPages: number; total: number; perPage: number
  onChange: (p: number) => void
}

export default function Pagination({ page, totalPages, total, perPage, onChange }: Props) {
  if (totalPages <= 1) return null
  const start = (page - 1) * perPage + 1
  const end = Math.min(page * perPage, total)

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', borderTop: '1px solid var(--border-muted)' }}>
      <span style={{ fontSize: '0.8125rem', color: 'var(--foreground-muted)' }}>
        {start}–{end} sur {total}
      </span>
      <div style={{ display: 'flex', gap: '0.25rem' }}>
        <button
          className="btn-secondary"
          style={{ padding: '0.375rem 0.625rem' }}
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          <ChevronLeft size={15} />
        </button>
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          let p = i + 1
          if (totalPages > 5) {
            if (page <= 3) p = i + 1
            else if (page >= totalPages - 2) p = totalPages - 4 + i
            else p = page - 2 + i
          }
          return (
            <button
              key={p}
              onClick={() => onChange(p)}
              style={{
                padding: '0.375rem 0.625rem',
                borderRadius: 'var(--radius)',
                border: 'none',
                background: p === page ? 'var(--primary)' : 'transparent',
                color: p === page ? 'white' : 'var(--foreground-muted)',
                fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer',
                minWidth: 32, transition: 'all 0.15s',
              }}
            >{p}</button>
          )
        })}
        <button
          className="btn-secondary"
          style={{ padding: '0.375rem 0.625rem' }}
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  )
}
