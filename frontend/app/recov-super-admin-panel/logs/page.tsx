'use client'
import { useEffect, useState } from 'react'
import { RefreshCw, FileText, Search } from 'lucide-react'
import { superAdminApi } from '@/lib/api'
import { formatDate } from '@/lib/utils'

interface AuditLog {
  id: string; user_id: string; action: string
  entity_type?: string; entity_id?: string
  description?: string; ip_address?: string
  created_at: string
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: '#059669', UPDATE: '#2563EB', DELETE: '#DC2626',
  LOGIN: '#7C3AED', LOGOUT: '#64748B',
}

export default function SuperAdminLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  async function load() {
    setLoading(true)
    try {
      const data = await superAdminApi.auditLogs()
      setLogs(Array.isArray(data) ? data : data.items ?? [])
    } catch { }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const filtered = search
    ? logs.filter(l =>
        l.action.toLowerCase().includes(search.toLowerCase()) ||
        (l.description?.toLowerCase() ?? '').includes(search.toLowerCase()) ||
        (l.entity_type?.toLowerCase() ?? '').includes(search.toLowerCase())
      )
    : logs

  return (
    <div className="animate-fadeIn">
      <div className="sa-page-header">
        <div>
          <h1 style={{ margin: 0, fontSize: '1.375rem', fontWeight: 800, color: 'var(--foreground)' }}>Audit logs</h1>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--foreground-muted)' }}>
            Historique complet de toutes les actions sur la plateforme
          </p>
        </div>
        <button className="btn-secondary" onClick={load} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Actualiser
        </button>
      </div>

      <div className="sa-search-wrap">
        <div style={{ position: 'relative', maxWidth: 400 }}>
          <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--foreground-subtle)' }} />
          <input
            className="input" placeholder="Filtrer par action, entite..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: '2.25rem', width: '100%' }}
          />
        </div>
      </div> {/* /sa-search-wrap */}

      <div className="card">
        <div className="table-container" style={{ border: 'none' }}>
          <table>
            <thead>
              <tr>
                <th>Date</th><th>Action</th><th>Entite</th><th>Description</th><th>IP</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i}>{[...Array(5)].map((_, j) => <td key={j}><div className="skeleton" style={{ height: 14, borderRadius: 4 }} /></td>)}</tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5}>
                  <div className="empty-state" style={{ padding: '3rem' }}>
                    <FileText size={28} style={{ color: 'var(--foreground-subtle)' }} />
                    <span>Aucun log</span>
                  </div>
                </td></tr>
              ) : (
                filtered.map(log => {
                  const actionBase = log.action.split('.')[0].toUpperCase()
                  const color = ACTION_COLORS[actionBase] ?? '#64748B'
                  return (
                    <tr key={log.id}>
                      <td style={{ fontSize: '0.8125rem', color: 'var(--foreground-muted)', whiteSpace: 'nowrap' }}>
                        {formatDate(log.created_at)}
                      </td>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', background: color + '18', color, padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>
                          {log.action}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8125rem', color: 'var(--foreground-muted)' }}>{log.entity_type ?? '-'}</td>
                      <td style={{ fontSize: '0.8125rem', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.description ?? '-'}
                      </td>
                      <td style={{ fontSize: '0.8125rem', fontFamily: 'monospace', color: 'var(--foreground-subtle)' }}>
                        {log.ip_address ?? '-'}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
