'use client'
import { useEffect, useState } from 'react'
import { Bell, CheckCheck, Clock } from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import Pagination from '@/components/ui/Pagination'
import { notificationsApi } from '@/lib/api'
import { formatRelative } from '@/lib/utils'
import { useToast } from '@/contexts/toast'
import type { Notification } from '@/types'
import Link from 'next/link'

const TYPE_ICONS: Record<string, string> = {
  nouvelle_creance: '📄',
  paiement_recu: '💰',
  retard_important: '⚠️',
  relance_envoyee: '📨',
  promesse_non_tenue: '🚫',
  escalade_dossier: '🔺',
  echec_relance: '❌',
  score_critique: '🔴',
}

export default function NotificationsPage() {
  const toast = useToast()
  const [notifs, setNotifs] = useState<Notification[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const PER_PAGE = 20

  async function load() {
    setLoading(true)
    try {
      const data = await notificationsApi.list({ page, per_page: PER_PAGE })
      setNotifs(data.items ?? [])
      setTotal(data.total ?? 0)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [page])

  async function markRead(id: string) {
    try {
      await notificationsApi.markRead(id)
      setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    } catch { /* ignore */ }
  }

  async function markAllRead() {
    try {
      await notificationsApi.markAllRead()
      setNotifs(prev => prev.map(n => ({ ...n, is_read: true })))
      toast('success', 'Toutes les notifications marquées comme lues')
    } catch { /* ignore */ }
  }

  const unreadCount = notifs.filter(n => !n.is_read).length

  return (
    <div className="animate-fadeIn">
      <PageHeader
        title="Notifications"
        subtitle={`${total} notification${total > 1 ? 's' : ''}${unreadCount > 0 ? ` · ${unreadCount} non lue${unreadCount > 1 ? 's' : ''}` : ''}`}
        actions={
          unreadCount > 0 ? (
            <button className="btn-secondary" onClick={markAllRead}>
              <CheckCheck size={15} /> Tout marquer lu
            </button>
          ) : undefined
        }
      />

      <div className="card">
        {loading ? (
          <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {[...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: 68, borderRadius: 'var(--radius)' }} />)}
          </div>
        ) : notifs.length === 0 ? (
          <div className="empty-state" style={{ padding: '4rem' }}>
            <Bell size={36} style={{ color: 'var(--foreground-subtle)' }} />
            <span>Aucune notification</span>
            <span style={{ fontSize: '0.8125rem', color: 'var(--foreground-subtle)' }}>
              Les alertes de recouvrement apparaîtront ici
            </span>
          </div>
        ) : (
          notifs.map(n => {
            const icon = TYPE_ICONS[n.notification_type] ?? '🔔'
            const content = (
              <div
                key={n.id}
                onClick={() => !n.is_read && markRead(n.id)}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: '0.875rem',
                  padding: '1rem 1.25rem',
                  borderBottom: '1px solid var(--border-muted)',
                  background: n.is_read ? 'transparent' : 'var(--primary-muted)',
                  cursor: n.is_read ? 'default' : 'pointer',
                  transition: 'background 0.15s',
                  textDecoration: 'none', color: 'inherit',
                  position: 'relative',
                }}
              >
                {!n.is_read && (
                  <div style={{ position: 'absolute', left: 6, top: '50%', transform: 'translateY(-50%)', width: 6, height: 6, background: 'var(--primary)', borderRadius: '50%' }} />
                )}
                <div style={{ fontSize: '1.25rem', flexShrink: 0, marginTop: 2 }}>{icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.2rem' }}>
                    <span style={{ fontWeight: n.is_read ? 400 : 600, color: 'var(--foreground)', fontSize: '0.875rem' }}>{n.title}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: 'var(--foreground-subtle)', flexShrink: 0 }}>
                      <Clock size={11} /> {formatRelative(n.created_at)}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--foreground-muted)', lineHeight: 1.4 }}>{n.message}</div>
                </div>
              </div>
            )

            return n.action_url ? (
              <Link key={n.id} href={n.action_url} style={{ display: 'block', textDecoration: 'none' }} onClick={() => !n.is_read && markRead(n.id)}>
                {content}
              </Link>
            ) : <div key={n.id}>{content}</div>
          })
        )}
        <Pagination page={page} totalPages={Math.ceil(total / PER_PAGE)} total={total} perPage={PER_PAGE} onChange={setPage} />
      </div>
    </div>
  )
}
