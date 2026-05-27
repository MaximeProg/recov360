'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth'
import AppLayout from '@/components/layout/AppLayout'
import Spinner from '@/components/ui/Spinner'
import { notificationsApi, subscriptionApi } from '@/lib/api'

type SubStatus = 'checking' | 'active' | 'none'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [unread, setUnread] = useState(0)
  const [subStatus, setSubStatus] = useState<SubStatus>('checking')

  useEffect(() => {
    if (!loading && !user) router.replace('/login')
  }, [user, loading, router])

  // Vérifier l'abonnement
  useEffect(() => {
    if (!user) return
    subscriptionApi.check()
      .then(data => {
        if (data.active) {
          setSubStatus('active')
        } else {
          setSubStatus('none')
          router.replace('/subscribe')
        }
      })
      .catch(() => {
        // Si l'API d'abonnement échoue (ex: plans pas encore créés), on laisse passer
        setSubStatus('active')
      })
  }, [user])

  // Compteur de notifications non lues
  useEffect(() => {
    if (!user) return
    const load = async () => {
      try {
        const data = await notificationsApi.list({ page: 1, per_page: 1 })
        const unreadCount = data.items?.filter((n: { is_read: boolean }) => !n.is_read).length ?? 0
        setUnread(unreadCount)
      } catch { /* ignore */ }
    }
    load()
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [user])

  if (loading || subStatus === 'checking') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <Spinner size={36} />
          <span style={{ color: 'var(--foreground-muted)', fontSize: '0.875rem' }}>Chargement…</span>
        </div>
      </div>
    )
  }

  if (!user || subStatus === 'none') return null

  return <AppLayout unreadCount={unread}>{children}</AppLayout>
}
